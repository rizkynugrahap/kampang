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

// Generate match commentary using Gemini
async function generateMatchAnalysis(match: Match): Promise<string> {
  const winnerTeam = match.winner;
  const loserTeam = winnerTeam === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';

  const winnerPlayers = (winnerTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (${p.hero_name}/${p.medal} - Skor ${p.score || '-'})`)
    .join(', ');

  const loserPlayers = (loserTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (${p.hero_name}/${p.medal} - Skor ${p.score || '-'})`)
    .join(', ');

  const promptText = `Match ${match.date}. ${winnerTeam} Menang. Tim Pemenang: ${winnerPlayers}. Tim Kalah (${loserTeam}): ${loserPlayers}.`;

  const systemInstruction =
    'Kamu adalah komentator e-sport Mobile Legends yang sarkastik, jenaka, namun analitis khas tongkrongan gamer Pantos. ' +
    'Tugasmu menganalisis hasil pertandingan antara Tim Pohon dan Tim Lobby. ' +
    'Bahas siapa pemain kunci/MVP yang tampil gemilang, siapa yang "makan Coklat" (jadi semen / beban tim), ' +
    'serta dinamika hero yang dipakai. ' +
    'Gunakan istilah khas MLBB (laning, teamfight, blunder, lord, rotasi, kena culik, solo kill). ' +
    'Tulis dalam 2-3 paragraf ringkas, kocak tapi berbobot dalam bahasa Indonesia santai.';

  const ai = getGenAI();
  if (ai) {
    // These model ids used to be 'gemini-3.8-flash' / 'gemini-flash-latest' /
    // 'gemini-3.1-flash-lite' — none of which are real Gemini models, so
    // every single call failed here too (same root cause as the match
    // analysis bug). Using real, current model ids instead.
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        });
        if (response.text && response.text.trim()) {
          return response.text.trim();
        }
      } catch (err: any) {
        const errMsg = typeof err?.message === 'string' ? err.message : JSON.stringify(err || '');
        const isQuota =
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.code === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isQuota) {
          console.info(`[Gemini] Match analysis quota reached on ${modelName}, switching to heuristic.`);
          break;
        } else {
          console.info(`[Gemini] Model ${modelName} unavailable for match analysis, checking next candidate.`);
        }
      }
    }
  }

  // Fallback heuristic commentary if API key is not present or call fails
  return generateHeuristicMatchAnalysis(match);
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
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
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
          // Clean output from quotation marks or bullet points
          let cleanTitle = response.text.trim().replace(/^["']|["']$/g, '').replace(/^[-*•]\s*/, '');
          if (cleanTitle.length > 50) cleanTitle = cleanTitle.slice(0, 50);
          return cleanTitle;
        }
      } catch (err: any) {
        const errMsg = typeof err?.message === 'string' ? err.message : JSON.stringify(err || '');
        const isQuota =
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.code === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isQuota) {
          console.info(`[Gemini] Julukan generation quota reached on ${modelName}; applying heuristic title.`);
          break;
        } else {
          console.info(`[Gemini] Model ${modelName} unavailable for title generation, trying next candidate.`);
        }
      }
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

    let analysisText: string;
    try {
      analysisText = await generateMatchAnalysis(draftMatch);
    } catch (aiErr) {
      console.error('Error generating AI analysis:', aiErr);
      analysisText = generateHeuristicMatchAnalysis(draftMatch);
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
  let match = store.matches.find((m) => m.id === matchId);
  const isKnownLocally = Boolean(match);

  if (!match && req.body && req.body.winner && req.body.pohon && req.body.lobby) {
    match = { id: matchId, ...req.body } as Match;
  }

  if (!match) {
    return res.status(404).json({ error: 'Match tidak ditemukan' });
  }

  try {
    const analysis = await generateMatchAnalysis(match);
    match.ai_analysis = analysis;
    if (isKnownLocally) {
      saveStore(store);
    }
    res.json({ id: matchId, ai_analysis: analysis });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat analisis AI: ' + err.message });
  }
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
