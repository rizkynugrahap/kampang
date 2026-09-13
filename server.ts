import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PLAYERS, INITIAL_MATCHES } from './src/data/seed.ts';
import { ALL_INITIAL_SEASONS, buildPlayersFromSeason, applyMatchToSeason, recalculateSeasonStats } from './src/data/seasonsSeed.ts';
import { MLBB_HEROES } from './src/data/heroes.ts';
import { Match, Player, Medal, LagaAmalSeasonData } from './src/types.ts';
import { generateHeuristicMatchAnalysis } from './src/utils/matchAnalysis.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Persistent store setup
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface StoreData {
  players: Player[];
  matches: Match[];
  lagaAmalSeasons: LagaAmalSeasonData[];
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      // Verify and guarantee seasons exist
      if (!parsed.lagaAmalSeasons || !Array.isArray(parsed.lagaAmalSeasons) || parsed.lagaAmalSeasons.length === 0) {
        parsed.lagaAmalSeasons = JSON.parse(JSON.stringify(ALL_INITIAL_SEASONS));
      }

      // Guarantee players follow active season
      const activeSeason = parsed.lagaAmalSeasons[0] || ALL_INITIAL_SEASONS[0];
      if (!parsed.players || !Array.isArray(parsed.players) || parsed.players.length === 0 || !parsed.players[0].name.includes('MANDOOR')) {
        parsed.players = buildPlayersFromSeason(activeSeason);
      }

      if (!parsed.matches || !Array.isArray(parsed.matches)) {
        parsed.matches = JSON.parse(JSON.stringify(INITIAL_MATCHES));
      }

      return parsed;
    }
  } catch (err) {
    console.error('Error loading store, falling back to seed:', err);
  }

  const initialSeasons = JSON.parse(JSON.stringify(ALL_INITIAL_SEASONS));
  const initialData: StoreData = {
    players: buildPlayersFromSeason(initialSeasons[0]),
    matches: JSON.parse(JSON.stringify(INITIAL_MATCHES)),
    lagaAmalSeasons: initialSeasons,
  };
  saveStore(initialData);
  return initialData;
}

function saveStore(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

let store = loadStore();

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
    // Valid, current Gemini model ids. (Earlier this listed
    // 'gemini-3.6-flash' / 'gemini-3.8-flash', which don't exist as real
    // Gemini models — every call silently failed and the app fell back to
    // heuristic/placeholder text. Real analysis never had a chance to run.)
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
        console.warn(`Gemini model ${modelName} call failed:`, err?.message);
      }
    }
  }

  // Fallback heuristic commentary if API key is not present or call fails
  return generateHeuristicMatchAnalysis(match);
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
  const { name, status, tier, avatar_url } = req.body;

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
  const { avatar_url, status, tier, name } = req.body;

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
  };

  store.players[playerIndex] = updatedPlayer;

  // Also sync avatar_url across all seasons for this player
  if (store.lagaAmalSeasons && store.lagaAmalSeasons.length > 0) {
    store.lagaAmalSeasons.forEach((season) => {
      const sp = season.players.find(
        (p) => p.nickname.toLowerCase() === updatedPlayer.name.toLowerCase()
      );
      if (sp) {
        if (avatar_url !== undefined) sp.avatar_url = avatar_url;
      }
    });
  }

  saveStore(store);
  res.json(updatedPlayer);
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

    const nextId =
      store.matches.length > 0
        ? Math.max(...store.matches.map((m) => m.id)) + 1
        : 1;

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
      analysisText = 'Analisis AI sementara tidak tersedia.';
    }

    const newMatch: Match = { ...draftMatch, ai_analysis: analysisText };

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
  const exists = store.matches.some((m) => m.id === matchId);
  if (!exists) {
    return res.status(404).json({ error: 'Match tidak ditemukan' });
  }
  store.matches = store.matches.filter((m) => m.id !== matchId);
  saveStore(store);
  res.json({ success: true, message: `Match ${matchId} berhasil dihapus` });
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
  res.json(store.lagaAmalSeasons || ALL_INITIAL_SEASONS);
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
    store.lagaAmalSeasons = JSON.parse(JSON.stringify(ALL_INITIAL_SEASONS));
  }

  const existingIdx = store.lagaAmalSeasons.findIndex((s) => s.id === incomingSeason.id);
  if (existingIdx >= 0) {
    store.lagaAmalSeasons[existingIdx] = recalculateSeasonStats(incomingSeason);
  } else {
    store.lagaAmalSeasons.unshift(recalculateSeasonStats(incomingSeason));
  }

  // Update store.players to align with active season
  store.players = buildPlayersFromSeason(store.lagaAmalSeasons[0]);

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
  const exists = store.lagaAmalSeasons.some((s) => s.id === seasonId);
  if (!exists) {
    return res.status(404).json({ error: 'Musim Laga Amal tidak ditemukan' });
  }

  store.lagaAmalSeasons = store.lagaAmalSeasons.filter((s) => s.id !== seasonId);
  store.players = buildPlayersFromSeason(store.lagaAmalSeasons[0]);
  saveStore(store);
  res.json({ success: true, seasons: store.lagaAmalSeasons, players: store.players });
});

// ----------------- VITE MIDDLEWARE / SPA FALLBACK -----------------
async function startServer() {
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
