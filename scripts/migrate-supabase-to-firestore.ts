/**
 * One-time data migration: Supabase (PostgREST) -> Firestore.
 *
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=... \
 *     npx tsx scripts/migrate-supabase-to-firestore.ts            # dry-run (default, writes nothing)
 *   ... npx tsx scripts/migrate-supabase-to-firestore.ts --apply  # actually write to Firestore
 *
 * - Always saves a full JSON backup of what it read from Supabase to ./backup/.
 * - Writes with { merge: true }: Supabase values win on conflicts, fields that exist
 *   only in Firestore are kept. Nothing is ever deleted from Firestore.
 * - Idempotent: safe to run more than once.
 * - Firestore docs (players / matches / seasons) that Supabase does not have are always LISTED.
 *   They are only deleted if you pass --prune together with --apply.
 */
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { buildMatchRowId } from '../src/utils/matchRowId';
import firebaseConfig from '../firebase-applet-config.json';

const APPLY = process.argv.includes('--apply');
const PRUNE = process.argv.includes('--prune');
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

type Row = Record<string, any>;

async function fetchTable(table: string): Promise<Row[] | null> {
  const rows: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (res.status === 404) return null; // table doesn't exist
    if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status} ${await res.text()}`);
    const page = (await res.json()) as Row[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v, (_, x) => (x === undefined ? null : x)));

/** How each Supabase table maps to a Firestore collection. */
const TABLES: Array<{
  table: string;
  collection: string;
  map: (r: Row) => { id: string; data: Row } | null;
}> = [
  // id + jsonb `data` tables: the jsonb payload becomes the document itself
  ...['players', 'matches', 'laga_amal_seasons', 'app_meta', 'chat_messages'].map((t) => ({
    table: t,
    collection: t,
    map: (r: Row) => (r.data && typeof r.data === 'object' ? { id: String(r.id), data: r.data } : null),
  })),
  {
    table: 'admins',
    collection: 'admins',
    map: (r) =>
      r.email
        ? {
            id: String(r.email).toLowerCase(),
            data: { email: String(r.email).toLowerCase(), password: r.password, name: r.name, created_at: r.created_at },
          }
        : null,
  },
  {
    table: 'player_pins',
    collection: 'player_pins',
    map: (r) => ({
      id: String(r.id),
      data: { playerName: r.player_name, pin: r.pin, createdAt: r.created_at, updatedAt: r.updated_at },
    }),
  },
];

const stable = (v: any): string =>
  JSON.stringify(v, (_, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x
  );

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (writing to Firestore)' : 'DRY-RUN (no writes)'}`);
  console.log(`Firestore project: ${firebaseConfig.projectId}\n`);

  const backup: Record<string, Row[]> = {};
  const plan: Array<{ col: string; id: string; data: Row }> = [];
  const orphans: Array<{ col: string; id: string; label: string; duplicate: boolean }> = [];

  for (const t of TABLES) {
    const rows = await fetchTable(t.table);
    if (rows === null) {
      console.log(`${t.table.padEnd(20)} (table not found in Supabase — skipped)`);
      continue;
    }
    backup[t.table] = rows;

    const existing = new Map<string, Row>();
    (await getDocs(collection(db, t.collection))).forEach((d) => existing.set(d.id, d.data()));

    let create = 0, update = 0, same = 0, skipped = 0;
    const seen = new Set<string>();
    const seenMatchKeys = new Set<string>();
    for (const r of rows) {
      const m = t.map(r);
      if (!m) { skipped++; continue; }
      seen.add(m.id);
      if (t.table === 'matches') seenMatchKeys.add(buildMatchRowId(m.data as any));
      const data = clean(m.data);
      const cur = existing.get(m.id);
      if (!cur) create++;
      else if (stable({ ...cur, ...data }) !== stable(cur)) update++;
      else { same++; continue; }
      plan.push({ col: t.collection, id: m.id, data });
    }
    if (['players', 'matches', 'laga_amal_seasons'].includes(t.table)) {
      existing.forEach((cur, id) => {
        if (seen.has(id)) return;
        const label =
          t.table === 'players' ? `${cur.name}` : t.table === 'matches' ? `#${cur.id} ${cur.season}` : `${cur.title ?? cur.id}`;
        // a legacy plain-id match whose (season, id) also exists in Supabase is just a duplicate
        const duplicate = t.table === 'matches' && seenMatchKeys.has(buildMatchRowId(cur as any));
        orphans.push({ col: t.collection, id, label, duplicate });
      });
    }
    console.log(
      `${t.table.padEnd(20)} supabase=${String(rows.length).padStart(4)}  firestore=${String(existing.size).padStart(4)}  ` +
        `-> create ${create}, update ${update}, unchanged ${same}${skipped ? `, skipped(no data) ${skipped}` : ''}`
    );
  }

  fs.mkdirSync('backup', { recursive: true });
  const file = path.join('backup', `supabase-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\nSupabase backup saved: ${file}`);

  const real = orphans.filter((o) => !o.duplicate);
  const dups = orphans.filter((o) => o.duplicate);
  if (orphans.length) {
    console.log(`\nIn Firestore but NOT in Supabase (${orphans.length}):`);
    real.forEach((o) => console.log(`  [${o.col}] ${o.id}  (${o.label})  <- missing in Supabase (deleted/renamed there?)`));
    if (dups.length) console.log(`  + ${dups.length} legacy plain-id match docs that are only duplicates of a Supabase match`);
    console.log(PRUNE ? '  --prune: these will be DELETED with --apply.' : '  They are kept. Add --prune to delete them.');
  }

  if (!APPLY) {
    console.log(`\n${plan.length} document(s) would be written${PRUNE ? `, ${orphans.length} deleted` : ''}. Re-run with --apply to migrate.`);
    process.exit(0);
  }

  for (let i = 0; i < plan.length; i += 400) {
    const batch = writeBatch(db);
    plan.slice(i, i + 400).forEach((p) => batch.set(doc(db, p.col, p.id), p.data, { merge: true }));
    await batch.commit();
    console.log(`  wrote ${Math.min(i + 400, plan.length)}/${plan.length}`);
  }
  if (PRUNE) {
    for (let i = 0; i < orphans.length; i += 400) {
      const batch = writeBatch(db);
      orphans.slice(i, i + 400).forEach((o) => batch.delete(doc(db, o.col, o.id)));
      await batch.commit();
    }
    console.log(`  deleted ${orphans.length} stale doc(s)`);
  }
  console.log('\nDone. Firestore is now up to date with Supabase.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
