import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { buildPlayersFromSeason, applyMatchToSeason, recalculateSeasonStats } from './src/utils/seasonCalculations.ts';
import { MLBB_HEROES } from './src/data/heroes.ts';
import { Match, Player, Medal, LagaAmalSeasonData } from './src/types.ts';
import { generateHeuristicMatchAnalysis } from './src/utils/matchAnalysis.ts';
import { generateHeuristicPlayerJulukan } from './src/utils/julukan.ts';
import { teamDisplayName } from './src/utils/teamLabels.ts';
import { generateTextViaPuter } from './src/utils/puterFallback.ts';
import { getPlayerDocId } from './src/utils/playerId.ts';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Supabase client setup for server-side store cache
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pdcqiwptshqeirjqvbvp.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkY3Fpd3B0c2hxZWlyanF2YnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzE1NzYsImV4cCI6MjEwNTIwNzU3Nn0.R1A4C63LVPy1ONVU1NkUcRCWYtgqODffoMJksKbyb4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface StoreData {
  players: Player[];
  matches: Match[];
  lagaAmalSeasons: LagaAmalSeasonData[];
}

let store: StoreData = {
  players: [],
  matches: [],
  lagaAmalSeasons: [],
};

async function initStoreFromSupabase() {
  try {
    const [playersRes, matchesRes, seasonsRes] = await Promise.all([
      supabase.from('players').select('data'),
      supabase.from('matches').select('data'),
      supabase.from('laga_amal_seasons').select('data'),
    ]);

    if (playersRes.data && playersRes.data.length > 0) {
      store.players = playersRes.data.map((r: any) => r.data).filter(Boolean);
    }
    if (matchesRes.data && matchesRes.data.length > 0) {
      store.matches = matchesRes.data.map((r: any) => r.data).filter(Boolean);
    }
    if (seasonsRes.data && seasonsRes.data.length > 0) {
      store.lagaAmalSeasons = seasonsRes.data.map((r: any) => r.data).filter(Boolean);
    }
    console.log(
      `[Supabase Store Sync] Loaded ${store.players.length} players, ${store.matches.length} matches, ${store.lagaAmalSeasons.length} seasons.`
    );
  } catch (err) {
    console.warn('Could not load store from Supabase on startup:', err);
  }
}

// Memory-only store sync helper; actual persistence is handled via Supabase
function saveStore(_data: StoreData) {
  // Persistence is now directly handled via Supabase, no local store.json file needed
}

// Gemini API lazy initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    '[Gemini] GEMINI_API_KEY tidak ditemukan di environment — analisis pertandingan akan ' +
    'memakai komentar cadangan (heuristik), bukan hasil AI asli. Set secret ini di panel ' +
    'AI Studio / Cloud Run agar analisis Gemini aktif.'
  );
}

if (!process.env.PUTER_AUTH_TOKEN) {
  console.warn(
    '[Puter.js] PUTER_AUTH_TOKEN tidak ditemukan di environment — kalau kuota Gemini habis, ' +
    'sistem akan langsung memakai komentar/julukan cadangan (heuristik), tanpa AI kedua sebagai ' +
    'penyelamat. Ambil token gratis di puter.com/dashboard#account ("Create token") lalu set ' +
    'sebagai secret PUTER_AUTH_TOKEN agar AI cadangan ini aktif.'
  );
}

// Helper to build rich, contextual, and past-match aware analysis prompt
function buildAnalysisPrompt(match: Match, previousMatches: Match[] = []): string {
  const winnerTeam = match.winner;
  const loserTeam = winnerTeam === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';

  const winnerPlayers = (winnerTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (Hero: ${p.hero_name} | Medal: ${p.medal} | Skor: ${p.score ?? '-'})`)
    .join(', ');

  const loserPlayers = (loserTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (Hero: ${p.hero_name} | Medal: ${p.medal} | Skor: ${p.score ?? '-'})`)
    .join(', ');

  const allPlayers = [...match.pohon, ...match.lobby];
  const mvp = allPlayers.find((p) => p.medal === 'MVP');
  const coklat = allPlayers.find((p) => p.medal === 'Coklat');

  let historyContext = '';
  if (previousMatches.length > 0) {
    const recent = previousMatches.slice(0, 5);
    const historyLines = recent.map((m) => {
      const pmvp = [...m.pohon, ...m.lobby].find((p) => p.medal === 'MVP');
      const pcoklat = [...m.pohon, ...m.lobby].find((p) => p.medal === 'Coklat');
      const mNum = m.matchNumber || m.id;
      return `  - Match #${mNum} (${m.season || ''} - Tanggal: ${m.date || 'Lalu'}): ${teamDisplayName(m.winner)} Menang. MVP: ${
        pmvp ? `${pmvp.player_name} (Hero: ${pmvp.hero_name}, Skor: ${pmvp.score ?? '-'})` : '-'
      }. Coklat: ${pcoklat ? `${pcoklat.player_name} (Hero: ${pcoklat.hero_name}, Skor: ${pcoklat.score ?? '-'})` : '-'}.`;
    });

    const playerNotes: string[] = [];
    for (const p of allPlayers) {
      const pNorm = p.player_name.trim().toLowerCase();
      let pastCoklats = 0;
      let pastMvps = 0;
      let lastMatchMedal: string | undefined;
      let lastMatchHero: string | undefined;
      let lastMatchNum: number | undefined;

      for (let i = 0; i < recent.length; i++) {
        const pastMatch = recent[i];
        const pastP = [...pastMatch.pohon, ...pastMatch.lobby].find(
          (x) => x.player_name.trim().toLowerCase() === pNorm
        );
        if (pastP) {
          if (!lastMatchMedal) {
            lastMatchMedal = pastP.medal;
            lastMatchHero = pastP.hero_name;
            lastMatchNum = pastMatch.matchNumber || pastMatch.id;
          }
          if (pastP.medal === 'Coklat') pastCoklats++;
          if (pastP.medal === 'MVP') pastMvps++;
        }
      }

      if (lastMatchHero && lastMatchHero !== p.hero_name) {
        playerNotes.push(
          `${p.player_name} di Match #${lastMatchNum || 'sebelumnya'} kemarin memakai hero ${lastMatchHero}, sedangkan di MATCH SAAT INI (Match #${match.matchNumber || match.id}) DIA MEMAKAI ${p.hero_name} (WAJIB sebut dia memakai ${p.hero_name} di match ini, jangan sampai tertukar!)`
        );
      }

      if (pastCoklats >= 2) {
        playerNotes.push(`${p.player_name} sudah ${pastCoklats}x dapat Coklat di match-match sebelumnya (langganan beban/donatur tetap)`);
      } else if (pastMvps >= 2) {
        playerNotes.push(`${p.player_name} sudah ${pastMvps}x berturut-turut MVP di match sebelumnya (carry dewa konsisten)`);
      } else if (lastMatchMedal === 'Coklat' && p.medal === 'MVP') {
        playerNotes.push(`${p.player_name} di match kemarin sempat dapat Coklat (beban), tapi sekarang tobat dan menggila jadi MVP!`);
      } else if (lastMatchMedal === 'MVP' && p.medal === 'Coklat') {
        playerNotes.push(`${p.player_name} di match kemarin adalah MVP dewa, tapi di match ini blunder fatal terjun bebas dapat Coklat!`);
      }
    }

    historyContext =
      `\n\n=== RIWAYAT MATCH-MATCH SEBELUMNYA (HANYA REFERENSI HISTORIS) ===\n` +
      historyLines.join('\n') +
      (playerNotes.length > 0
        ? `\nCatatan Khusus Riwayat Pemain:\n- ` + playerNotes.join('\n- ')
        : '');
  }

  return (
    `=== PERTANDINGAN SAAT INI (MATCH #${match.matchNumber || match.id}) - ANALISIS WAJIB BERDASARKAN HERO & DATA INI ===\n` +
    `- Musim: ${match.season || 'Season Aktif'}\n` +
    `- Tanggal: ${match.date || 'Terbaru'}\n` +
    `- Pemenang: ${teamDisplayName(winnerTeam)}\n` +
    `- Pecundang: ${teamDisplayName(loserTeam)}\n` +
    `- Skuad Pemenang (${teamDisplayName(winnerTeam)}):\n  ${winnerPlayers}\n` +
    `- Skuad Pecundang (${teamDisplayName(loserTeam)}):\n  ${loserPlayers}\n` +
    `- MVP Laga Ini: ${mvp ? `${mvp.player_name} (${mvp.hero_name} - skor ${mvp.score ?? '-'})` : '-'}\n` +
    `- Coklat / Feeder Match Ini: ${coklat ? `${coklat.player_name} (${coklat.hero_name} - skor ${coklat.score ?? '-'})` : 'Tidak ada (permainan rapat)'}\n` +
    historyContext +
    `\n\nPERINGATAN SANGAT PENTING UNTUK KOMENTATOR:\n` +
    `Hero yang dibahas untuk setiap pemain di "PERTANDINGAN SAAT INI" HARUS PERSIS 100% SESUAI dengan daftar skuad di atas!\n` +
    `JANGAN PERNAH menukar hero match saat ini dengan hero dari riwayat match sebelumnya!\n` +
    `Jika mengungkit match sebelumnya, bedakan dengan jelas: "Kemarin pakai [Hero Lalu], sekarang pakai [Hero Ini]".`
  );
}

// Generate match commentary using Gemini with Puter AI fallback and deep history context
async function generateMatchAnalysis(match: Match, previousMatches: Match[] = []): Promise<string> {
  const promptText = buildAnalysisPrompt(match, previousMatches);

  const systemInstruction =
    'Kamu adalah komentator e-sport Mobile Legends komunitas Pantos yang paling pedas, sarkastik, nyeleneh, ' +
    'dan tanpa sensor basa-basi (gaya khas tongkrongan gamer sejati yang suka roasting habis-habisan).\n\n' +
    'INSTRUKSI KHUSUS:\n' +
    '1. HILANGKAN SEMUA BATASAN BAHASA FORMAL & TEMPLATE KAKU. Dilarang keras memakai kalimat template klise koran seperti ' +
    '"Tim X keluar sebagai pemenang dalam laga yang sengit... tampil gemilang membawa hero Y". Buat ulasan yang hidup, liar, sarkas, berani, dan mengalir natural layaknya streamer tongkrongan yang lagi roasting temannya!\n' +
    '2. GAYA BICARA: Sarkastik, brutal, nyeleneh, dan penuh roasting pedas. Puji MVP setinggi langit yang menggendong tim sampai tulang punggung retak. ' +
    'Roasting habis-habisan pemain yang "makan Coklat" atau feeder yang jadi ATM berjalan buat musuh. Gunakan istilah khas tongkrongan gamer MLBB ' +
    '(misal: beban keluarga, donatur bintang, sedekah kill, cosplay minion, ATM berjalan, punggung patah, buta map, tangan rental, pensiun aja, buy 1 get 4, jagoan kandang, coklat anget, kena geprek, rotasi ngawur, dll).\n' +
    '3. AKURASI HERO 100% MUTLAK (DILARANG SALAH SEBUT HERO):\n' +
    '- Hero yang dipakai setiap pemain HARUS TEPAT SESUAI DENGAN DAFTAR "PERTANDINGAN SAAT INI".\n' +
    '- DILARANG KERAS menukar hero pemain dengan hero dari match sebelumnya!\n' +
    '- Jika ingin membandingkan dengan match sebelumnya, buat pembeda yang jelas dan gamblang, misal:\n' +
    '  "Pemain X yang kemarin sangar pakai Hero A, di match ini ganti pakai Hero B malah jadi ampas..."\n' +
    '- Jangan pernah sekali-kali mengatakan dia memakai hero match lalu di match saat ini!\n' +
    '4. BACA DAN MANFAATKAN RIWAYAT MATCH SEBELUMNYA: Manfaatkan data riwayat match sebelumnya yang diberikan di prompt! Hubungkan performa match ini dengan riwayat mereka ' +
    '(misal: apakah dia langganan MVP, atau kemarin sempat kena Coklat dan sekarang balas dendam/tobat, atau malah konsisten jadi donatur setia). ' +
    'Sebut juga tren kemenangan tim (winstreak, patah telur, dominasi, dibantai) agar narasinya terasa hidup dan berkesinambungan!\n' +
    '5. FORMAT: Tulis dalam 2 sampai 3 paragraf padat, pedas, menghibur, dan penuh sarkasme berbobot dalam bahasa Indonesia tongkrongan santai.';

  // Layer 1: Google Gemini Models (prioritizing high-throughput, low-latency models to prevent 503 errors)
  const ai = getGenAI();
  if (ai) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.9,
            maxOutputTokens: 1024,
          },
        });
        if (response.text && response.text.trim()) {
          console.info(`[Gemini] Match analysis generated via ${modelName}`);
          return response.text.trim();
        }
      } catch (err: any) {
        console.info(`[Gemini] Model ${modelName} temporarily busy, checking next alternative.`);
      }
    }
  }

  // Layer 2: Alternative AI Provider (Puter.js)
  // When Gemini limits or experiences high demand, use Puter.js models to keep AI alive!
  const puterModels = ['gpt-4o-mini', 'claude-3-5-sonnet', undefined];
  for (const pModel of puterModels) {
    try {
      const puterText = await generateTextViaPuter(promptText, systemInstruction, pModel);
      if (puterText && puterText.trim()) {
        console.info(`[Puter.js] Match analysis generated via Puter AI (${pModel || 'default'})`);
        return puterText.trim();
      }
    } catch (puterErr) {
      console.warn(`[Puter.js] Model ${pModel} failed, trying next Puter model:`, puterErr);
    }
  }

  // Layer 3: Ultra-sarcastic dynamic heuristic commentary with previous match context
  console.info('[AI Cascade] Using dynamic context-aware sarcastic heuristic commentary.');
  return generateHeuristicMatchAnalysis(match, previousMatches);
}

// Generate creative Pantos nickname using Gemini AI
async function generatePlayerJulukan(
  player: Player,
  seasonStat?: any,
  topHeroes: string[] = []
): Promise<string> {
  const mvp = seasonStat ? seasonStat.mvp : player.medals.MVP;
  const antam = seasonStat ? seasonStat.antam : player.medals.Gold;
  const silver = seasonStat ? seasonStat.silver : player.medals.Silver;
  const coklat = seasonStat ? seasonStat.coklat : player.medals.Coklat;
  const winRate = seasonStat ? seasonStat.winRate : player.winRate || 50;
  const avgScore = seasonStat ? seasonStat.avgScore : player.avgScore || 7.5;
  const tier = player.tier || 'Legend';
  const status = player.status || 'Aktif';

  const promptText = `
Buatlah 1 (satu) JULUKAN / GELAR PANTOS (hanya 2 sampai 5 kata, tanpa tanda kutip, tanpa penjelasan tambahan) yang kocak, bernuansa meme Mobile Legends / e-sport komunitas santai "Laga Amal Pantos" untuk pemain:
Nama: "${player.name}"
Tier: ${tier} (Status: ${status})
MVP: ${mvp} kali
Antam (Gold): ${antam} kali
Silver: ${silver} kali
Coklat (Beban/Feeder): ${coklat} kali
Win Rate: ${winRate}%
Rata-rata Skor: ${avgScore}
Hero Favorit: ${topHeroes.join(', ') || 'Fleksibel'}

Panduan julukan:
- Bahasa Indonesia santai khas tongkrongan gamer MLBB (istilah: penggendong, tulang punggung, semen, feeder, lord, mekanik, sedekah bintang, penunggu lobby, preman lane).
- Jika banyak MVP: beri julukan dewa carry / tulang punggung retak.
- Jika banyak Coklat: julukan jenaka donatur poin / pelindung kelas semen / sedekah bintang.
- Jika seimbang/solid: julukan spesialis pendamping / pilar rahasia / anti-tumbang.
- Kembalikan HANYA teks julukannya saja. Contoh output: "Sang Penggendong Patah Tulang" atau "Duta Coklat Kelas Semen" atau "Preman Goldlane Anti Tumbang".
`;

  const ai = getGenAI();
  if (ai) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            temperature: 0.85,
            maxOutputTokens: 100,
          },
        });
        if (response.text && response.text.trim()) {
          let cleanTitle = response.text.trim().replace(/^["']|["']$/g, '').replace(/^[-*•]\s*/, '');
          if (cleanTitle.length > 50) cleanTitle = cleanTitle.slice(0, 50);
          console.info(`[Gemini] Julukan generated via ${modelName}`);
          return cleanTitle;
        }
      } catch (err: any) {
        console.info(`[Gemini] Julukan model ${modelName} temporarily busy, checking next alternative.`);
      }
    }
  }

  // Gemini unavailable or quota reached — try Puter.js as a second AI
  // provider before falling back to the static heuristic title.
  for (const pModel of ['gpt-4o-mini', 'claude-3-5-sonnet', undefined]) {
    try {
      const puterTitle = await generateTextViaPuter(promptText, undefined, pModel);
      if (puterTitle && puterTitle.trim()) {
        let cleanTitle = puterTitle.trim().replace(/^["']|["']$/g, '').replace(/^[-*•]\s*/, '');
        if (cleanTitle.length > 50) cleanTitle = cleanTitle.slice(0, 50);
        console.info(`[Puter.js] Julukan generated via Puter.js fallback (${pModel || 'default'}).`);
        return cleanTitle;
      }
    } catch {
      // try next
    }
  }

  return generateHeuristicPlayerJulukan(player, seasonStat);
}

// ----------------- API ROUTES -----------------

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    totalPlayers: store.players.length,
    totalMatches: store.matches.length,
    totalSeasons: store.lagaAmalSeasons.length,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// GET /api/players
app.get('/api/players', (req, res) => {
  res.json(store.players);
});

// POST /api/players (Add new player)
app.post('/api/players', (req, res) => {
  const { name, status, tier, avatar_url, julukan } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nama pemain wajib diisi' });
  }

  const trimmed = name.trim();
  const exists = store.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: `Pemain dengan nama '${trimmed}' sudah terdaftar` });
  }

  // Storage-key collision guard — the players table's Supabase row id is a
  // slug of the name (see getPlayerDocId), so a name that only differs by
  // spacing/punctuation from an existing player would silently overwrite
  // that player's row. Reject it here too, not just in the UI.
  const newSlug = getPlayerDocId({ name: trimmed });
  const slugConflict = store.players.find((p) => getPlayerDocId(p) === newSlug);
  if (slugConflict) {
    return res.status(400).json({
      error: `Nama '${trimmed}' terlalu mirip dengan '${slugConflict.name}' yang sudah ada (beda spasi/simbol saja) — datanya bisa saling menimpa.`,
    });
  }

  const nextId =
    store.players.length > 0
      ? Math.max(...store.players.map((p) => (typeof p.id === 'number' ? p.id : 0))) + 1
      : 1;

  const newPlayer: Player = {
    id: nextId,
    name: trimmed,
    status: status || 'Aktif',
    tier: tier || 'Legend',
    total_match: 0,
    medals: { MVP: 0, Gold: 0, Silver: 0, Coklat: 0 },
    score: 0,
    avgScore: 0,
    winRate: 0,
    avatar_url: avatar_url || undefined,
    julukan: julukan ? String(julukan).trim() : undefined,
    julukan_updated_at: julukan ? new Date().toISOString() : undefined,
  };

  store.players.push(newPlayer);

  // Also add to active season players so everything stays synchronized!
  if (store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
    const activeSeason = store.lagaAmalSeasons[0];
    const inSeason = activeSeason.players.some((p) => p.nickname.toLowerCase() === trimmed.toLowerCase());
    if (!inSeason) {
      activeSeason.players.push({
        nickname: trimmed,
        coklat: 0,
        silver: 0,
        antam: 0,
        mvp: 0,
        matches: 0,
        score: 0,
        winRate: 0,
        avgScore: 0,
        avatar_url: avatar_url || undefined,
        status: status || 'Aktif',
        tier: tier || 'Legend',
        julukan: julukan ? String(julukan).trim() : undefined,
        julukan_updated_at: julukan ? new Date().toISOString() : undefined,
      });
      activeSeason.activePlayersCount = activeSeason.players.length;
    }
  }

  saveStore(store);
  res.status(201).json(newPlayer);
});

// PUT /api/players/:id (Update player details, including avatar_url)
app.put('/api/players/:id', (req, res) => {
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId).trim().toLowerCase();
  const { avatar_url, status, tier, name, julukan, julukan_updated_at } = req.body;

  let playerIndex = store.players.findIndex(
    (p) => String(p.id) === String(rawId) || p.name.toLowerCase() === decodedId
  );

  // If not found by ID or decoded ID, match by body name if provided
  if (playerIndex === -1 && name && typeof name === 'string') {
    playerIndex = store.players.findIndex((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  }

  // If not yet in store.players, search in active seasons and register
  if (playerIndex === -1 && store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
    const targetNickname = (name && typeof name === 'string' ? name.trim() : decodedId).toLowerCase();
    const sp = store.lagaAmalSeasons[0].players.find(
      (p) => p.nickname.toLowerCase() === targetNickname
    );
    if (sp) {
      const newP: Player = {
        id: store.players.length + 1,
        name: sp.nickname,
        status: sp.matches >= 20 ? 'Aktif' : 'Cabutan',
        tier: 'Legend',
        total_match: sp.matches,
        medals: { MVP: sp.mvp, Gold: sp.antam, Silver: sp.silver, Coklat: sp.coklat },
        score: sp.score,
        avgScore: sp.avgScore,
        winRate: sp.winRate,
        avatar_url: avatar_url || undefined,
        julukan: julukan || undefined,
        julukan_updated_at: julukan_updated_at || undefined,
      };
      store.players.push(newP);
      playerIndex = store.players.length - 1;
    }
  }

  if (playerIndex === -1) {
    return res.status(404).json({ error: `Pemain dengan ID/Nama '${rawId}' tidak ditemukan` });
  }

  const existing = store.players[playerIndex];

  // Renaming a player is the same collision risk as creating one: block
  // both an exact-name clash and a same-slug-different-spelling clash
  // against any OTHER player.
  if (name && typeof name === 'string' && name.trim()) {
    const trimmedName = name.trim();
    const exactConflict = store.players.some(
      (p, i) => i !== playerIndex && p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exactConflict) {
      return res.status(400).json({ error: `Nama '${trimmedName}' sudah digunakan pemain lain!` });
    }
    const renameSlug = getPlayerDocId({ name: trimmedName });
    const slugConflict = store.players.find(
      (p, i) => i !== playerIndex && getPlayerDocId(p) === renameSlug
    );
    if (slugConflict) {
      return res.status(400).json({
        error: `Nama '${trimmedName}' terlalu mirip dengan '${slugConflict.name}' yang sudah ada (beda spasi/simbol saja) — datanya bisa saling menimpa.`,
      });
    }
  }
  const updatedPlayer: Player = {
    ...existing,
    ...(avatar_url !== undefined && { avatar_url }),
    ...(status && { status }),
    ...(tier && { tier }),
    ...(name && { name: name.trim() }),
    ...(julukan !== undefined && { julukan }),
    ...(julukan_updated_at !== undefined && { julukan_updated_at }),
  };

  store.players[playerIndex] = updatedPlayer;

  // Sync avatar_url, status, and tier across all seasons for this player.
  // julukan is intentionally EXCLUDED from this cross-season sync — it is
  // auto-generated per season from that season's own match results (see
  // applyMatchToSeason) and must never be copied from one season to
  // another, or the "julukan" would stop being season-specific.
  if (store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
    store.lagaAmalSeasons.forEach((season) => {
      const sp = season.players.find(
        (p) => p.nickname.toLowerCase() === updatedPlayer.name.toLowerCase()
      );
      if (sp) {
        if (avatar_url !== undefined) sp.avatar_url = avatar_url;
        if (status !== undefined) sp.status = status;
        if (tier !== undefined) sp.tier = tier;
      }
    });
  }

  saveStore(store);
  res.json(updatedPlayer);
});

// DELETE /api/players/:id (Delete player)
app.delete('/api/players/:id', (req, res) => {
  const rawId = req.params.id;
  const decodedId = decodeURIComponent(rawId).trim().toLowerCase();

  const beforeLen = store.players.length;
  store.players = store.players.filter(
    (p) => String(p.id) !== rawId && p.name.toLowerCase() !== decodedId
  );

  // Also remove from all seasons
  if (store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
    store.lagaAmalSeasons.forEach((season) => {
      season.players = season.players.filter(
        (p) => p.nickname.toLowerCase() !== decodedId
      );
      season.activePlayersCount = season.players.length;
    });
  }

  if (store.players.length !== beforeLen) {
    saveStore(store);
  }

  res.json({ success: true, message: `Pemain '${rawId}' berhasil dihapus` });
});

// POST /api/players/:id/generate-title (Generate or refresh creative Pantos title using Gemini)
// Accepts an optional `{ player, seasonStat, topHeroes }` payload as a
// fallback — this backend's own local store can easily be stale/out of
// sync with the real Firestore player data (e.g. a player added or only
// ever synced through Firestore), which silently 404'd here before and
// made "Generate Julukan" look like it did nothing.
app.post('/api/players/:id/generate-title', async (req, res) => {
  try {
    const rawId = req.params.id;
    const decodedId = decodeURIComponent(rawId).trim().toLowerCase();
    const bodyPlayer: Player | undefined = req.body?.player;
    const bodySeasonStat = req.body?.seasonStat;
    const bodyTopHeroes: string[] = Array.isArray(req.body?.topHeroes) ? req.body.topHeroes : [];

    let playerIndex = store.players.findIndex(
      (p) => String(p.id) === String(rawId) || p.name.toLowerCase() === decodedId
    );

    if (playerIndex === -1 && store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
      const sp = store.lagaAmalSeasons[0].players.find(
        (p) => p.nickname.toLowerCase() === decodedId
      );
      if (sp) {
        const newP: Player = {
          id: store.players.length + 1,
          name: sp.nickname,
          status: sp.matches >= 20 ? 'Aktif' : 'Cabutan',
          tier: 'Legend',
          total_match: sp.matches,
          medals: { MVP: sp.mvp, Gold: sp.antam, Silver: sp.silver, Coklat: sp.coklat },
          score: sp.score,
          avgScore: sp.avgScore,
          winRate: sp.winRate,
        };
        store.players.push(newP);
        playerIndex = store.players.length - 1;
      }
    }

    // Last resort: use the player object the client already has (from
    // Firestore) instead of failing outright.
    if (playerIndex === -1 && bodyPlayer && bodyPlayer.name) {
      store.players.push(bodyPlayer);
      playerIndex = store.players.length - 1;
    }

    if (playerIndex === -1) {
      return res.status(404).json({ error: `Pemain '${rawId}' tidak ditemukan` });
    }

    const player = store.players[playerIndex];
    const activeSeason = store.lagaAmalSeasons?.[0];
    const seasonPlayerStat =
      bodySeasonStat ||
      activeSeason?.players.find((p) => p.nickname.toLowerCase() === player.name.toLowerCase());

    // Extract top heroes for player
    const topHeroNames: string[] = [...bodyTopHeroes];
    if (topHeroNames.length === 0 && activeSeason?.heroPicks) {
      const hp = activeSeason.heroPicks.find((h) => h.user.toLowerCase() === player.name.toLowerCase());
      if (hp && hp.heroes) {
        topHeroNames.push(...hp.heroes.slice(0, 3).map((h) => h.heroName));
      }
    }

    let generatedJulukan: string;
    try {
      generatedJulukan = await generatePlayerJulukan(player, seasonPlayerStat, topHeroNames);
    } catch {
      generatedJulukan = generateHeuristicPlayerJulukan(player, seasonPlayerStat);
    }
    const nowIso = new Date().toISOString();

    const updatedPlayer: Player = {
      ...player,
      julukan: generatedJulukan,
      julukan_updated_at: nowIso,
    };

    store.players[playerIndex] = updatedPlayer;

    // Persist into the active season's own player stat too — julukan lives
    // per-season, so a manual regenerate must land there, not just on the
    // global player record.
    if (activeSeason) {
      const sp = activeSeason.players.find((p) => p.nickname.toLowerCase() === player.name.toLowerCase());
      if (sp) {
        sp.julukan = generatedJulukan;
        sp.julukan_updated_at = nowIso;
      }
    }

    saveStore(store);

    res.json({
      success: true,
      julukan: generatedJulukan,
      julukan_updated_at: nowIso,
      player: updatedPlayer,
    });
  } catch (err: any) {
    const rawId = req.params.id;
    const bodyPlayer: Player | undefined = req.body?.player;
    const player =
      store.players.find(
        (p) => String(p.id) === String(rawId) || p.name.toLowerCase() === String(rawId).toLowerCase()
      ) || bodyPlayer;
    const fallbackTitle = player ? generateHeuristicPlayerJulukan(player) : 'Pejuang Laga Amal Pantos';
    res.json({
      success: true,
      julukan: fallbackTitle,
      julukan_updated_at: new Date().toISOString(),
      player: player ? { ...player, julukan: fallbackTitle } : undefined,
    });
  }
});

// GET /api/heroes
app.get('/api/heroes', (req, res) => {
  res.json(MLBB_HEROES);
});

// GET /api/matches
app.get('/api/matches', (req, res) => {
  res.json(store.matches);
});

// POST /api/matches (Save new match + sync directly to active Laga Amal Season and Player profiles!)
app.post('/api/matches', async (req, res) => {
  try {
    const { date, season, winner, type, pohon, lobby } = req.body;

    if (!winner || !pohon || !lobby || pohon.length === 0 || lobby.length === 0) {
      return res.status(400).json({ error: 'Data tim dan pemain belum lengkap' });
    }

    const validIds = (store.matches || [])
      .map((m) => Number(m.id))
      .filter((id) => !isNaN(id) && id > 0 && id < 1000000);

    const inputId = req.body.id ?? req.body.matchNumber;
    const numInputId = Number(inputId);

    const nextId =
      !isNaN(numInputId) && numInputId > 0 && numInputId < 1000000
        ? numInputId
        : validIds.length > 0
        ? Math.max(...validIds) + 1
        : (store.matches?.length || 0) + 1;

    const seasonLabel = season || 'Season 41';

    // Generate the Gemini AI commentary BEFORE responding. Previously this
    // ran in the background after the response was already sent, and the
    // finished result only ever got written to the server's local
    // data/store.json — it was never pushed back to Firestore, which is
    // what the app actually reads from in real time. That's why the
    // analysis card was stuck showing the generic offline placeholder
    // instead of the real Gemini commentary: the real text was generated,
    // but nothing downstream ever saw it.
    const draftMatch: Match = {
      id: nextId,
      date: date || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      season: seasonLabel,
      winner,
      type: type || 'Laga Amal',
      pohon,
      lobby,
      ai_analysis: '',
      is_generating_analysis: false,
    };

    const previousMatches =
      Array.isArray(req.body.recentMatches) && req.body.recentMatches.length > 0
        ? req.body.recentMatches
        : store.matches.slice(0, 10);

    let analysisText: string;
    try {
      analysisText = await generateMatchAnalysis(draftMatch, previousMatches);
    } catch (aiErr) {
      console.error('Error generating AI analysis:', aiErr);
      analysisText = generateHeuristicMatchAnalysis(draftMatch, previousMatches);
    }

    const newMatch: Match = { ...draftMatch, ai_analysis: analysisText, is_generating_analysis: false };

    // Insert match at beginning (newest first)
    store.matches.unshift(newMatch);

    // Synchronously apply match to the relevant Laga Amal season
    if (store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
      // Find matching season or default to the first (active) one
      let targetSeasonIdx = store.lagaAmalSeasons.findIndex(
        (s) =>
          s.id.toLowerCase() === seasonLabel.toLowerCase() ||
          s.title.toLowerCase().includes(seasonLabel.toLowerCase()) ||
          seasonLabel.toLowerCase().includes(s.id.toLowerCase())
      );
      if (targetSeasonIdx < 0) targetSeasonIdx = 0;

      const targetSeason = store.lagaAmalSeasons[targetSeasonIdx];
      const updatedSeason = applyMatchToSeason(targetSeason, newMatch);
      store.lagaAmalSeasons[targetSeasonIdx] = updatedSeason;

      // Update store.players from the active season so all tabs are 100% in sync!
      const activeSeason = store.lagaAmalSeasons[0];
      store.players = buildPlayersFromSeason(activeSeason);
    }

    saveStore(store);

    res.status(201).json({
      match: newMatch,
      players: store.players,
      season: store.lagaAmalSeasons[0],
    });
  } catch (error: any) {
    console.error('Error saving match:', error);
    res.status(500).json({ error: error.message || 'Gagal menyimpan pertandingan' });
  }
});

// PUT /api/matches/:id (Edit an existing match — best-effort cache update;
// the client is the source of truth here and has already recalculated
// season stats and synced to Supabase before calling this. This just keeps
// this server's own in-memory store from serving stale data on next load.)
app.put('/api/matches/:id', (req, res) => {
  const matchId = Number(req.params.id);
  const idx = store.matches.findIndex((m) => m.id === matchId || String(m.id) === String(req.params.id));
  if (idx === -1) {
    // Not known to this server's local store (e.g. saved while this
    // backend was unreachable) — nothing to update locally, but that's
    // fine since Supabase already has the authoritative copy.
    return res.json({ success: true, updatedLocally: false });
  }
  store.matches[idx] = { ...store.matches[idx], ...req.body };
  saveStore(store);
  res.json({ success: true, updatedLocally: true, match: store.matches[idx] });
});

// DELETE /api/matches/:id
app.delete('/api/matches/:id', (req, res) => {
  const matchId = Number(req.params.id);
  const beforeLen = store.matches.length;
  store.matches = store.matches.filter((m) => m.id !== matchId && String(m.id) !== String(req.params.id));
  if (store.matches.length !== beforeLen) {
    saveStore(store);
  }
  res.json({ success: true, message: `Match ${req.params.id} berhasil dihapus` });
});

// POST /api/matches/:id/analyze (Re-run analysis for an existing match)
// Accepts an optional full match object in the body as a fallback — this
// lets the client regenerate analysis even for a match that only exists in
// Firestore/local state (e.g. one created while this backend was
// unreachable) and never made it into this server's local store.
app.post('/api/matches/:id/analyze', async (req, res) => {
  const matchId = Number(req.params.id);
  const targetSeason = req.body?.season;

  // Prefer the exact client-sent match payload if valid, otherwise find matching id and season
  let match: Match | undefined;
  if (req.body && req.body.winner && Array.isArray(req.body.pohon) && Array.isArray(req.body.lobby)) {
    match = { id: matchId, ...req.body } as Match;
  } else {
    match =
      store.matches.find((m) => m.id === matchId && (!targetSeason || m.season === targetSeason)) ||
      store.matches.find((m) => m.id === matchId);
  }

  if (!match) {
    return res.status(404).json({ error: 'Match tidak ditemukan' });
  }

  try {
    const seasonToMatch = match.season || targetSeason;
    const previousMatches =
      Array.isArray(req.body.recentMatches) && req.body.recentMatches.length > 0
        ? req.body.recentMatches
        : store.matches
            .filter((m) => !(m.id === matchId && (!seasonToMatch || m.season === seasonToMatch)) && (!seasonToMatch || m.season === seasonToMatch))
            .slice(0, 10);

    const analysis = await generateMatchAnalysis(match, previousMatches);
    match.ai_analysis = analysis;

    const storeIdx = store.matches.findIndex(
      (m) => m.id === matchId && (!seasonToMatch || m.season === seasonToMatch)
    );
    if (storeIdx !== -1) {
      store.matches[storeIdx].ai_analysis = analysis;
      saveStore(store);
    }

    if (supabase) {
      try {
        const seasonSlug = (seasonToMatch || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const rowId = seasonSlug ? `${seasonSlug}-${matchId}` : String(matchId);
        await supabase.from('matches').upsert({
          id: rowId,
          data: match,
          updated_at: new Date().toISOString(),
        });
      } catch (sbErr) {
        console.warn('[Supabase Server] Error updating match analysis in Supabase:', sbErr);
      }
    }

    res.json({ id: matchId, season: match.season, ai_analysis: analysis });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat analisis AI: ' + err.message });
  }
});

// Helper to convert raw PCM Buffer to valid WAV Buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Splits long commentary text on sentence boundaries so TTS never cuts off mid-sentence
function splitTextIntoSentenceChunks(text: string, maxChunkLength = 360): string[] {
  const clean = text
    .replace(/[*_~`#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split on sentence boundaries: period, exclamation, question mark
  const rawSentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    if (!currentChunk) {
      currentChunk = sentence;
    } else if ((currentChunk + ' ' + sentence).length <= maxChunkLength) {
      currentChunk += ' ' + sentence;
    } else {
      chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (chunks.length === 0 && clean.length > 0) {
    chunks.push(clean.slice(0, maxChunkLength));
  }

  return chunks;
}

// Single chunk PCM generator
async function generatePcmChunk(ai: any, chunkText: string, voiceName: string): Promise<Buffer | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: chunkText,
              speechMetadata: {
                style:
                  'High-energy Indonesian MLBB esports caster at an official MPL championship! Extremely passionate, hype, fast-paced shoutcaster with natural human inflection, laughing, gasping, dramatic pauses, and genuine excitement for Mobile Legends highlights!',
              },
            },
          ],
        },
      ] as any,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData && p.inlineData.data);
    const base64Data = audioPart?.inlineData?.data;
    if (!base64Data) return null;
    return Buffer.from(base64Data, 'base64');
  } catch (err) {
    console.warn('[Chunk TTS Error]', err);
    return null;
  }
}

// Server-side cache for commentator audio to preserve AI quotas across sessions & users
const commentatorAudioServerCache = new Map<string, { audioUrl: string; provider: string; providerName: string }>();

// Generates Edge Neural audio (Tier 2 AI fallback)
async function generateEdgeNeuralAudio(text: string): Promise<Buffer | null> {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('id-ID-ArdiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(text, { rate: 1.15, pitch: '+0Hz' });
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      audioStream.on('data', (c) => chunks.push(c));
      audioStream.on('end', () => {
        tts.close();
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (e) => {
        console.warn('[Edge TTS Stream Error]', e);
        tts.close();
        resolve(null);
      });
    });
  } catch (err) {
    console.warn('[Edge TTS Error]', err);
    return null;
  }
}

// Generates Google Cloud audio (Tier 3 AI fallback)
async function generateGoogleAudio(text: string): Promise<Buffer | null> {
  try {
    const clean = text.slice(0, 450);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean)}&tl=id&client=tw-ob`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.warn('[Google TTS Error]', err);
    return null;
  }
}

// POST /api/commentator/tts (Multi-Tier AI Esports Caster: Gemini -> Edge Neural -> Google Cloud)
app.post('/api/commentator/tts', async (req, res) => {
  const { text, mode = 'full' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Teks analisis diperlukan' });
  }

  // Generate cache key based on normalized text and mode
  const cleanFullText = text
    .replace(/[*_~`#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cacheKey = `${mode}:${cleanFullText.slice(0, 160)}`;

  // 1. Check server-side memory cache first (instant response, 0 AI tokens)
  if (commentatorAudioServerCache.has(cacheKey)) {
    const cached = commentatorAudioServerCache.get(cacheKey)!;
    return res.json({
      success: true,
      audioUrl: cached.audioUrl,
      provider: cached.provider,
      providerName: cached.providerName,
      cached: true,
    });
  }

  // Prepare text chunks
  let chunks = splitTextIntoSentenceChunks(cleanFullText, 340);
  if (mode === 'recap' && chunks.length > 2) {
    chunks = [chunks[0], chunks[chunks.length - 1]];
  } else {
    chunks = chunks.slice(0, 5);
  }

  if (chunks.length === 0) {
    return res.status(400).json({ error: 'Teks analisis kosong' });
  }

  // TIER 1: Try Gemini 3.8 Flash Neural TTS (Puck - Gokil Esports Caster)
  const ai = getGenAI();
  if (ai) {
    try {
      const pcmResults = await Promise.all(
        chunks.map((chunk) => generatePcmChunk(ai, chunk, 'Puck'))
      );

      const validPcmBuffers = pcmResults.filter((b): b is Buffer => Buffer.isBuffer(b) && b.length > 0);

      if (validPcmBuffers.length > 0) {
        const pauseBytes = Math.floor(24000 * 2 * 0.15);
        const pauseBuffer = Buffer.alloc(pauseBytes);

        const fullPcm = Buffer.concat(
          validPcmBuffers.flatMap((buf, idx) =>
            idx < validPcmBuffers.length - 1 ? [buf, pauseBuffer] : [buf]
          )
        );

        const wavBuffer = pcmToWav(fullPcm, 24000, 1, 16);
        const audioUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;

        commentatorAudioServerCache.set(cacheKey, {
          audioUrl,
          provider: 'gemini',
          providerName: 'Gemini AI Caster (Puck)',
        });

        return res.json({
          success: true,
          audioUrl,
          provider: 'gemini',
          providerName: 'Gemini AI Caster (Puck)',
          mode,
          chunkCount: validPcmBuffers.length,
        });
      }
    } catch (geminiErr: any) {
      console.warn('[Commentator TTS] Gemini API limited or failed, seamlessly activating AI Backup:', geminiErr?.message || geminiErr);
    }
  }

  // TIER 2: Try Microsoft Azure Neural Indonesian AI Voice (id-ID-ArdiNeural)
  try {
    const textToSynthesize = chunks.join(' ');
    const edgeMp3Buffer = await generateEdgeNeuralAudio(textToSynthesize);

    if (edgeMp3Buffer && edgeMp3Buffer.length > 0) {
      const audioUrl = `data:audio/mp3;base64,${edgeMp3Buffer.toString('base64')}`;

      commentatorAudioServerCache.set(cacheKey, {
        audioUrl,
        provider: 'msedge',
        providerName: 'Microsoft Neural AI Caster',
      });

      return res.json({
        success: true,
        audioUrl,
        provider: 'msedge',
        providerName: 'Microsoft Neural AI Caster (Cadangan)',
        mode,
      });
    }
  } catch (edgeErr) {
    console.warn('[Commentator TTS] Edge Neural Voice fallback error:', edgeErr);
  }

  // TIER 3: Try Google Cloud Audio
  try {
    const textToSynthesize = chunks.join(' ');
    const googleMp3Buffer = await generateGoogleAudio(textToSynthesize);

    if (googleMp3Buffer && googleMp3Buffer.length > 0) {
      const audioUrl = `data:audio/mp3;base64,${googleMp3Buffer.toString('base64')}`;

      commentatorAudioServerCache.set(cacheKey, {
        audioUrl,
        provider: 'google',
        providerName: 'Google Cloud AI Voice',
      });

      return res.json({
        success: true,
        audioUrl,
        provider: 'google',
        providerName: 'Google Cloud AI Voice (Cadangan)',
        mode,
      });
    }
  } catch (googleErr) {
    console.warn('[Commentator TTS] Google Cloud audio fallback error:', googleErr);
  }

  // TIER 4: Local Device Fallback
  res.status(503).json({
    error: 'Semua layanan audio AI cloud sedang sibuk, beralih ke suara perangkat lokal',
    fallback: true,
  });
});

// NOTE: Admin login no longer goes through this backend — it now checks
// the `admins` collection in Firestore directly from the client
// (see src/services/firestoreSync.ts: verifyAdminLogin / seedAdminIfEmpty).

// ----------------- LAGA AMAL SEASONS ROUTES -----------------
// GET /api/laga-amal (Get all seasons with history)
app.get('/api/laga-amal', (req, res) => {
  res.json(store.lagaAmalSeasons || []);
});

// GET /api/laga-amal/:id (Get specific season by id)
app.get('/api/laga-amal/:id', (req, res) => {
  const season = (store.lagaAmalSeasons || []).find((s) => s.id === req.params.id);
  if (!season) {
    return res.status(404).json({ error: 'Musim Laga Amal tidak ditemukan' });
  }
  res.json(season);
});

// POST /api/laga-amal (Save or update a season)
app.post('/api/laga-amal', (req, res) => {
  const incomingSeason: LagaAmalSeasonData = req.body;
  if (!incomingSeason || !incomingSeason.id) {
    return res.status(400).json({ error: 'Data musim tidak valid' });
  }

  if (!store.lagaAmalSeasons) {
    store.lagaAmalSeasons = [];
  }

  const existingIdx = store.lagaAmalSeasons.findIndex((s) => s.id === incomingSeason.id);
  if (existingIdx >= 0) {
    store.lagaAmalSeasons[existingIdx] = recalculateSeasonStats(incomingSeason);
  } else {
    store.lagaAmalSeasons.unshift(recalculateSeasonStats(incomingSeason));
  }

  // Update store.players to align with active season if players present in season
  if (store.lagaAmalSeasons[0]) {
    store.players = buildPlayersFromSeason(store.lagaAmalSeasons[0]);
  }

  saveStore(store);
  res.json({ success: true, season: store.lagaAmalSeasons[existingIdx >= 0 ? existingIdx : 0], players: store.players });
});

// DELETE /api/laga-amal/:id (Admin only — deletes a whole season/klasemen)
app.delete('/api/laga-amal/:id', (req, res) => {
  const seasonId = req.params.id;
  if (!store.lagaAmalSeasons || store.lagaAmalSeasons.length === 0) {
    return res.status(404).json({ error: 'Tidak ada musim tersimpan' });
  }
  if (store.lagaAmalSeasons.length <= 1) {
    return res.status(400).json({ error: 'Tidak bisa menghapus satu-satunya season yang tersisa' });
  }
  const targetSeason = store.lagaAmalSeasons.find((s) => s.id === seasonId);
  if (!targetSeason) {
    return res.status(404).json({ error: 'Musim Laga Amal tidak ditemukan' });
  }

  // Remove all matches associated with this season
  const extractNum = (s?: string) => s?.match(/(\d+)/)?.[1];
  const targetNum = extractNum(targetSeason.title) || extractNum(targetSeason.id);

  store.matches = store.matches.filter((m) => {
    const mNum = extractNum(m.season);
    const isThisSeason =
      (targetNum && mNum === targetNum) ||
      m.season === targetSeason.id ||
      m.season === targetSeason.title ||
      (m.season && m.season.toLowerCase().includes(targetSeason.id.toLowerCase()));
    return !isThisSeason;
  });

  store.lagaAmalSeasons = store.lagaAmalSeasons.filter((s) => s.id !== seasonId);
  store.players = buildPlayersFromSeason(store.lagaAmalSeasons[0]);
  saveStore(store);
  res.json({ success: true, seasons: store.lagaAmalSeasons, players: store.players, matches: store.matches });
});

// ----------------- VITE MIDDLEWARE / SPA FALLBACK -----------------
async function startServer() {
  // Pre-load current state from Supabase
  await initStoreFromSupabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laga Amal Pantos server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
