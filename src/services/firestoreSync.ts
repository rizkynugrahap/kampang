import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  limit,
  query,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, Match, LagaAmalSeasonData } from '../types';
import { getPlayerDocId } from '../utils/playerId';
import { buildMatchRowId } from '../utils/matchRowId';
export { getPlayerDocId, buildMatchRowId };
export type { Unsubscribe };

/**
 * Firestore rejects `undefined` fields (and class instances), so every write
 * goes through a JSON round-trip that turns undefined into null.
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, v) => (v === undefined ? null : v)));
}

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

// Firestore allows at most 500 operations per batch.
const BATCH_LIMIT = 400;

async function commitInChunks(
  ops: Array<(batch: ReturnType<typeof writeBatch>) => void>
): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
}

const errOf = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

// ----------------- SUBSCRIPTIONS (REAL-TIME VIA FIRESTORE) -----------------

export function subscribeToPlayers(
  onUpdate: (players: Player[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'players'),
    (snapshot) => {
      const list: Player[] = snapshot.docs.map((d) => {
        const raw = d.data() as Player;
        return { ...raw, id: raw?.id !== undefined && raw?.id !== null ? raw.id : (d.id as any) };
      });
      list.sort((a, b) => Number(a.id) - Number(b.id));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore players snapshot error:', err);
      onError?.(errOf(err));
    }
  );
}

function dedupeMatches(docs: Array<{ id: string; data: Match }>): Match[] {
  const matchMap = new Map<string, Match>();
  docs.forEach(({ id, data }) => {
    const matchObj: Match = {
      ...data,
      id: data?.id !== undefined && data?.id !== null ? data.id : Number(id),
    };
    const rowKey = buildMatchRowId(matchObj);
    // Prefer the season-namespaced document if both formats exist
    if (!matchMap.has(rowKey) || id.includes('-')) matchMap.set(rowKey, matchObj);
  });
  const list = Array.from(matchMap.values());
  list.sort((a, b) => Number(b.id) - Number(a.id));
  return list;
}

export function subscribeToMatches(
  onUpdate: (matches: Match[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'matches'),
    (snapshot) => {
      onUpdate(dedupeMatches(snapshot.docs.map((d) => ({ id: d.id, data: d.data() as Match }))));
    },
    (err) => {
      console.warn('Firestore matches snapshot error:', err);
      onError?.(errOf(err));
    }
  );
}

function sortSeasons(list: LagaAmalSeasonData[]): LagaAmalSeasonData[] {
  const extractNum = (s: LagaAmalSeasonData) => {
    const m = (s?.title || '').match(/(\d+)/) || (s?.id || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };
  return list.sort((a, b) => {
    const numA = extractNum(a);
    const numB = extractNum(b);
    if (numA !== numB) return numB - numA;
    return String(b?.title || b?.id || '').localeCompare(String(a?.title || a?.id || ''));
  });
}

export function subscribeToLagaAmal(
  onUpdate: (seasons: LagaAmalSeasonData[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'laga_amal_seasons'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const raw = d.data() as LagaAmalSeasonData;
        return { ...raw, id: raw?.id || d.id };
      });
      onUpdate(sortSeasons(list));
    },
    (err) => {
      console.warn('Firestore laga amal snapshot error:', err);
      onError?.(errOf(err));
    }
  );
}

/** One-shot read of everything (used as a fallback when the backend API is unreachable). */
export async function fetchAllOnce(): Promise<{
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
}> {
  const [p, m, s] = await Promise.all([
    getDocs(collection(db, 'players')),
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'laga_amal_seasons')),
  ]);
  return {
    players: p.docs.map((d) => d.data() as Player),
    matches: dedupeMatches(m.docs.map((d) => ({ id: d.id, data: d.data() as Match }))),
    seasons: sortSeasons(s.docs.map((d) => d.data() as LagaAmalSeasonData)),
  };
}

// ----------------- BACKGROUND & THEME SETTINGS -----------------

export interface BackgroundSettings {
  bgUrl?: string;
  bgOpacity?: number;
  logoType?: 'text' | 'image';
  logoUrl?: string;
  logoText?: string;
  brandName?: string;
  slogan?: string;
  logoSize?: number;
  logoFit?: 'contain' | 'cover';
  logoShape?: 'rounded' | 'circle' | 'square' | 'none';
  headerBgColor?: string;
  activeButtonColor?: string;
  activeButtonTextColor?: string;
  updatedAt?: string;
}

export type ThemeSettings = BackgroundSettings;

const metaRef = (id: string): DocumentReference => doc(db, 'app_meta', id);

export function subscribeToBackgroundSettings(
  callback: (settings: BackgroundSettings | null) => void
): Unsubscribe {
  return onSnapshot(
    metaRef('background_settings'),
    (snap) => callback(snap.exists() ? (snap.data() as BackgroundSettings) : null),
    (err) => {
      console.warn('Firestore background settings subscription error:', err);
      callback(null);
    }
  );
}

/** Merged write — passing just one field won't wipe the others. */
export async function syncBackgroundSettingsToFirestore(settings: BackgroundSettings): Promise<void> {
  await setDoc(
    metaRef('background_settings'),
    sanitizeForFirestore({ ...settings, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

// ----------------- ACTIVE SEASON SETTINGS -----------------

export interface ActiveSeasonSettings {
  seasonId: string;
  updatedAt?: string;
}

export function subscribeToActiveSeason(callback: (seasonId: string | null) => void): Unsubscribe {
  return onSnapshot(
    metaRef('active_season'),
    (snap) => callback(snap.exists() && snap.data()?.seasonId ? String(snap.data()!.seasonId) : null),
    (err) => {
      console.warn('Firestore active season subscription error:', err);
      callback(null);
    }
  );
}

export async function syncActiveSeasonToFirestore(seasonId: string): Promise<void> {
  await setDoc(metaRef('active_season'), { seasonId, updatedAt: new Date().toISOString() });
}

// ----------------- WRITE & MUTATION METHODS -----------------

export async function syncPlayerToFirestore(player: Player): Promise<void> {
  await setDoc(doc(db, 'players', getPlayerDocId(player)), sanitizeForFirestore(player), {
    merge: true,
  });
}

export async function syncPlayersBatchToFirestore(players: Player[]): Promise<void> {
  if (!players || players.length === 0) return;
  const byId = new Map<string, Player>();
  players.forEach((p) => byId.set(getPlayerDocId(p), p));
  await commitInChunks(
    Array.from(byId.entries()).map(([id, p]) => (b) =>
      b.set(doc(db, 'players', id), sanitizeForFirestore(p), { merge: true })
    )
  );
}

export async function syncMatchToFirestore(match: Match): Promise<void> {
  await setDoc(doc(db, 'matches', buildMatchRowId(match)), sanitizeForFirestore(match), {
    merge: true,
  });
}

export async function syncMatchesBatchToFirestore(matches: Match[]): Promise<void> {
  if (!matches || matches.length === 0) return;
  const byId = new Map<string, Match>();
  matches.forEach((m) => byId.set(buildMatchRowId(m), m));
  await commitInChunks(
    Array.from(byId.entries()).map(([id, m]) => (b) =>
      b.set(doc(db, 'matches', id), sanitizeForFirestore(m), { merge: true })
    )
  );
}

export async function syncLagaAmalToFirestore(season: LagaAmalSeasonData): Promise<void> {
  await setDoc(doc(db, 'laga_amal_seasons', String(season.id)), sanitizeForFirestore(season), {
    merge: true,
  });
}

export async function syncSeasonsBatchToFirestore(seasons: LagaAmalSeasonData[]): Promise<void> {
  if (!seasons || seasons.length === 0) return;
  const byId = new Map<string, LagaAmalSeasonData>();
  seasons.forEach((s) => byId.set(String(s.id), s));
  await commitInChunks(
    Array.from(byId.entries()).map(([id, s]) => (b) =>
      b.set(doc(db, 'laga_amal_seasons', id), sanitizeForFirestore(s), { merge: true })
    )
  );
}

export async function deletePlayerFromFirestore(
  playerId: string | number,
  playerName?: string
): Promise<void> {
  const slug = (playerName || String(playerId))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const ids = new Set<string>([slug, String(playerId)].filter(Boolean));
  // Also catch docs whose stored id / name matches (e.g. stale keys)
  const snap = await getDocs(collection(db, 'players'));
  snap.forEach((d) => {
    const p = d.data() as Partial<Player>;
    if (
      d.id === slug ||
      d.id === String(playerId) ||
      String(p?.id) === String(playerId) ||
      (playerName && p?.name && p.name.toLowerCase() === playerName.toLowerCase())
    ) {
      ids.add(d.id);
    }
  });
  await commitInChunks(Array.from(ids).map((id) => (b) => b.delete(doc(db, 'players', id))));
}

export async function deleteLagaAmalFromFirestore(seasonId: string): Promise<void> {
  await commitInChunks([(b) => b.delete(doc(db, 'laga_amal_seasons', String(seasonId)))]);
}

type MatchRef = string | number | { id: number | string; season?: string };

const matchCandidateIds = (m: MatchRef): string[] =>
  typeof m === 'object' ? [buildMatchRowId(m), String(m.id)] : [String(m)];

/**
 * Accepts either a bare id (legacy plain-id doc) or a match-like object with a
 * season (normal case). Deletes whichever of the two possible keys exists.
 */
export async function deleteMatchFromFirestore(match: MatchRef): Promise<void> {
  await deleteMatchesBatchFromFirestore([match]);
}

export async function deleteMatchesBatchFromFirestore(matches: MatchRef[]): Promise<void> {
  if (!matches || matches.length === 0) return;
  const ids = Array.from(new Set(matches.flatMap(matchCandidateIds)));
  await commitInChunks(ids.map((id) => (b) => b.delete(doc(db, 'matches', id))));
}

// ----------------- ADMIN ACCOUNTS -----------------

export interface AdminAccount {
  email: string;
  password: string;
  name: string;
}

const DEFAULT_ADMIN: AdminAccount = {
  email: 'admin@pantos.ml',
  password: 'pantos123',
  name: 'Admin Pantos',
};

/** No-op once at least one admin document exists. */
export async function seedAdminIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'admins'), limit(1)));
    if (snap.empty) {
      console.log('Firestore: Seeding default admin account...');
      await setDoc(doc(db, 'admins', DEFAULT_ADMIN.email.toLowerCase()), {
        ...DEFAULT_ADMIN,
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore admin seeding error:', err);
  }
}

export async function verifyAdminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: { email: string; name: string }; error?: string }> {
  try {
    const normalizedEmail = (email || DEFAULT_ADMIN.email).trim().toLowerCase();
    const snap = await getDoc(doc(db, 'admins', normalizedEmail));
    if (!snap.exists()) {
      return { success: false, error: 'Akun admin tidak ditemukan di database Firestore.' };
    }
    const account = snap.data() as AdminAccount;
    if (account.password !== password) {
      return { success: false, error: 'Password admin salah.' };
    }
    return {
      success: true,
      admin: { email: account.email || normalizedEmail, name: account.name || 'Admin Pantos' },
    };
  } catch (err: any) {
    console.error('Firestore admin login error:', err);
    return { success: false, error: 'Gagal login admin: ' + (err?.message || String(err)) };
  }
}

// ----------------- BULK SEEDING & SYNC -----------------

export async function seedPlayersIfEmpty(defaultPlayers: Player[]): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'players'), limit(1)));
    if (snap.empty && defaultPlayers?.length > 0) {
      console.log('Firestore: Seeding initial players database...');
      await syncPlayersBatchToFirestore(defaultPlayers);
    }
  } catch (err) {
    console.warn('Firestore players seeding error:', err);
  }
}

export async function forceSyncAllToFirestore(data: {
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
}): Promise<boolean> {
  try {
    await syncPlayersBatchToFirestore(data.players);
    await syncMatchesBatchToFirestore(data.matches);
    await syncSeasonsBatchToFirestore(data.seasons);
    return true;
  } catch (err) {
    console.error('Firestore force sync error:', err);
    throw err;
  }
}

// ----------------- COMMENTATOR AUDIO STORAGE IN FIRESTORE -----------------

function computeTextHash(str: string): string {
  let hash = 0;
  const clean = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export interface StoredAudioResult {
  audioUrl: string;
  provider: string;
  providerName: string;
}

/**
 * Saves generated commentator audio directly to Firestore so it persists permanently and can be replayed infinitely
 */
export async function saveCommentatorAudioToFirestore(params: {
  matchId?: number | string;
  mode: 'full' | 'recap';
  audioUrl: string;
  provider: string;
  providerName: string;
  text: string;
}): Promise<void> {
  if (!params.audioUrl) return;

  try {
    const textHash = computeTextHash(params.text);
    const docId = params.matchId
      ? `match_${params.matchId}_${params.mode}`
      : `text_${textHash}_${params.mode}`;

    const docRef = doc(db, 'commentator_audios', docId);

    // If audioUrl is large (> 700,000 characters), split across subcollection parts
    const CHUNK_SIZE = 700000;
    if (params.audioUrl.length > CHUNK_SIZE) {
      const totalParts = Math.ceil(params.audioUrl.length / CHUNK_SIZE);
      await setDoc(
        docRef,
        {
          id: docId,
          matchId: params.matchId ? String(params.matchId) : null,
          mode: params.mode,
          provider: params.provider,
          providerName: params.providerName,
          textHash,
          hasParts: true,
          totalParts,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      for (let i = 0; i < totalParts; i++) {
        const partRef = doc(db, 'commentator_audios', docId, 'parts', String(i));
        await setDoc(partRef, {
          index: i,
          data: params.audioUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        });
      }
    } else {
      await setDoc(
        docRef,
        {
          id: docId,
          matchId: params.matchId ? String(params.matchId) : null,
          mode: params.mode,
          audioUrl: params.audioUrl,
          provider: params.provider,
          providerName: params.providerName,
          textHash,
          hasParts: false,
          totalParts: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Also update match doc in 'matches' collection if matchId is given
    if (params.matchId) {
      try {
        // Only touch a match doc that already exists (legacy plain-id key) —
        // never create a stray, half-empty match document. The audio itself is
        // always retrievable from `commentator_audios`, so this is best-effort.
        const matchRef = doc(db, 'matches', String(params.matchId));
        if ((await getDoc(matchRef)).exists()) {
          const fieldName =
            params.mode === 'recap' ? 'commentator_audio_recap' : 'commentator_audio_full';
          await updateDoc(matchRef, {
            [fieldName]: params.audioUrl.length <= CHUNK_SIZE ? params.audioUrl : `ref:${docId}`,
            commentator_provider: params.providerName,
          });
        }
      } catch (mErr) {
        console.warn('Could not update match with audio:', mErr);
      }
    }
  } catch (err) {
    console.warn('saveCommentatorAudioToFirestore error:', err);
  }
}

/**
 * Retrieves saved commentator audio from Firestore database
 */
export async function getCommentatorAudioFromFirestore(params: {
  matchId?: number | string;
  mode: 'full' | 'recap';
  text: string;
}): Promise<StoredAudioResult | null> {
  try {
    const textHash = computeTextHash(params.text);

    // 1. Try match docId if matchId provided
    const docIdsToTry: string[] = [];
    if (params.matchId) {
      docIdsToTry.push(`match_${params.matchId}_${params.mode}`);
    }
    docIdsToTry.push(`text_${textHash}_${params.mode}`);

    for (const docId of docIdsToTry) {
      const docRef = doc(db, 'commentator_audios', docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.hasParts && data.totalParts > 1) {
          const partsSnap = await getDocs(
            collection(db, 'commentator_audios', docId, 'parts')
          );
          const partsList: { index: number; data: string }[] = [];
          partsSnap.forEach((pDoc) => {
            partsList.push(pDoc.data() as any);
          });
          partsList.sort((a, b) => a.index - b.index);
          const fullAudioUrl = partsList.map((p) => p.data).join('');
          if (fullAudioUrl) {
            return {
              audioUrl: fullAudioUrl,
              provider: data.provider || 'gemini',
              providerName: (data.providerName || 'AI Caster') + ' (Tersimpan di Database)',
            };
          }
        } else if (data.audioUrl) {
          return {
            audioUrl: data.audioUrl,
            provider: data.provider || 'gemini',
            providerName: (data.providerName || 'AI Caster') + ' (Tersimpan di Database)',
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('getCommentatorAudioFromFirestore error:', err);
    return null;
  }
}
