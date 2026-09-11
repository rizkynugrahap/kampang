import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PLAYERS, INITIAL_MATCHES } from './src/data/seed.ts';
import { INITIAL_TOURNAMENTS } from './src/data/tournamentSeed.ts';
import { INITIAL_LAGA_AMAL_S41 } from './src/data/lagaAmalS41Data.ts';
import { MLBB_HEROES } from './src/data/heroes.ts';
import { Match, Player, Medal, TournamentData, TournamentFixture, TournamentTeamStanding, LagaAmalSeasonData } from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent store setup
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface StoreData {
  players: Player[];
  matches: Match[];
  tournaments: TournamentData[];
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
      if (!parsed.tournaments || !Array.isArray(parsed.tournaments) || parsed.tournaments.length === 0) {
        parsed.tournaments = JSON.parse(JSON.stringify(INITIAL_TOURNAMENTS));
      } else {
        parsed.tournaments.forEach((t: TournamentData) => {
          const seedMatch = INITIAL_TOURNAMENTS.find((s) => s.id === t.id);
          if (seedMatch && t.standings) {
            t.standings.forEach((team) => {
              const seedTeam = seedMatch.standings.find((st) => st.id === team.id || st.name === team.name);
              if (seedTeam) {
                if (!team.members && seedTeam.members) team.members = seedTeam.members;
                if (!team.slogan && seedTeam.slogan) team.slogan = seedTeam.slogan;
              }
            });
          }
        });
      }
      if (!parsed.lagaAmalSeasons || !Array.isArray(parsed.lagaAmalSeasons) || parsed.lagaAmalSeasons.length === 0) {
        parsed.lagaAmalSeasons = [JSON.parse(JSON.stringify(INITIAL_LAGA_AMAL_S41))];
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error loading store, falling back to seed:', err);
  }
  const initialData: StoreData = {
    players: JSON.parse(JSON.stringify(INITIAL_PLAYERS)),
    matches: JSON.parse(JSON.stringify(INITIAL_MATCHES)),
    tournaments: JSON.parse(JSON.stringify(INITIAL_TOURNAMENTS)),
    lagaAmalSeasons: [JSON.parse(JSON.stringify(INITIAL_LAGA_AMAL_S41))],
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

// Generate match commentary using Gemini
async function generateMatchAnalysis(match: Match): Promise<string> {
  const winnerTeam = match.winner;
  const loserTeam = winnerTeam === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';

  const winnerPlayers = (winnerTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (${p.hero_name}/${p.medal})`)
    .join(', ');

  const loserPlayers = (loserTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (${p.hero_name}/${p.medal})`)
    .join(', ');

  const promptText = `Match ${match.date}. ${winnerTeam} Menang. ${winnerPlayers}. ${loserTeam} Kalah. ${loserPlayers}.`;

  const systemInstruction =
    'Bertindaklah sebagai analis e-sport yang tegas dan sedikit sinis, tapi tetap sopan dan tidak menghina di luar konteks permainan. ' +
    'Analisis hasil match ini berdasarkan komposisi Hero dan perolehan Medali (bukan KDA). ' +
    'Berikan kritik tajam namun wajar untuk pemain yang mendapat Coklat, dan pujian objektif untuk pemain MVP. ' +
    'Tulis maksimal 3 paragraf, bahasa Indonesia santai.';

  const ai = getGenAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          systemInstruction,
          temperature: 0.85,
        },
      });
      if (response.text && response.text.trim().length > 0) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('Gemini generateContent error, using fallback analyzer:', err);
    }
  }

  // Realistic fallback commentary matching the exact tone requested
  const allDetails = [...match.pohon, ...match.lobby];
  const mvp = allDetails.find((d) => d.medal === 'MVP');
  const coklat = allDetails.find((d) => d.medal === 'Coklat');
  const winner = match.winner;
  const loser = winner === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';

  const mvpName = mvp ? `${mvp.player_name} dengan ${mvp.hero_name}` : 'lini serang pemenang';
  const coklatName = coklat ? `${coklat.player_name} (${coklat.hero_name})` : 'barisan pertahanan lawan';

  return (
    `Pertandingan ${match.date} memperlihatkan dominasi nyata dari ${winner}. ` +
    `Peran ${mvpName} menjadi faktor pengunci tempo permainan berkat eksekusi skill yang disiplin dan positioning matang saat perebutan objektif krusial.\n\n` +
    `Di sisi lain, ${loser} seperti kehilangan peta rotasi sejak mid game. Penampilan ${coklatName} yang diganjar medali Coklat layak dievaluasi total: beberapa kali terculik tanpa backup dan terlalu memaksakan inisiasi saat spell belum siap.\n\n` +
    `Secara komposisi hero, ${winner} terbukti membaca celah draft dengan jauh lebih dingin. Kemenangan mutlak tanpa banyak alasan klise.`
  );
}

// ----------------- API ROUTES -----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/players
app.get('/api/players', (req, res) => {
  res.json(store.players);
});

// POST /api/players (Add new player)
app.post('/api/players', (req, res) => {
  const { name, status, tier } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama pemain wajib diisi' });
  }
  const existing = store.players.find(
    (p) => p.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'Pemain dengan nama ini sudah terdaftar' });
  }

  const newPlayer: Player = {
    id: Date.now(),
    name: name.trim(),
    status: status === 'Cabutan' ? 'Cabutan' : 'Aktif',
    tier: tier || 'Legend',
    total_match: 0,
    medals: { MVP: 0, Gold: 0, Silver: 0, Coklat: 0 },
  };

  store.players.push(newPlayer);
  saveStore(store);
  res.status(201).json(newPlayer);
});

// GET /api/heroes
app.get('/api/heroes', (req, res) => {
  res.json(MLBB_HEROES);
});

// GET /api/matches
app.get('/api/matches', (req, res) => {
  res.json(store.matches);
});

// POST /api/matches (Save new match + match_details & trigger AI analysis)
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

    const newMatch: Match = {
      id: nextId,
      date: date || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      season: season || 'Season 1',
      winner,
      type: type || 'Laga Amal',
      pohon,
      lobby,
      ai_analysis: '',
      is_generating_analysis: true,
    };

    // Update players' medals and match count
    const allParticipants = [...pohon, ...lobby];
    for (const part of allParticipants) {
      const p = store.players.find(
        (player) =>
          player.id === part.player_id ||
          player.name.toLowerCase() === (part.player_name || '').toLowerCase()
      );
      if (p) {
        p.total_match += 1;
        const medalKey = part.medal as Medal;
        if (p.medals[medalKey] !== undefined) {
          p.medals[medalKey] += 1;
        }
      }
    }

    // Insert match at beginning (newest first)
    store.matches.unshift(newMatch);
    saveStore(store);

    // Generate AI analysis
    try {
      const analysis = await generateMatchAnalysis(newMatch);
      newMatch.ai_analysis = analysis;
      newMatch.is_generating_analysis = false;
      saveStore(store);
    } catch (aiErr) {
      console.error('Error generating AI analysis:', aiErr);
      newMatch.ai_analysis = 'Analisis AI sementara tidak tersedia.';
      newMatch.is_generating_analysis = false;
      saveStore(store);
    }

    res.status(201).json(newMatch);
  } catch (error: any) {
    console.error('Error saving match:', error);
    res.status(500).json({ error: error.message || 'Gagal menyimpan pertandingan' });
  }
});

// POST /api/matches/:id/analyze (Re-run analysis for an existing match)
app.post('/api/matches/:id/analyze', async (req, res) => {
  const matchId = Number(req.params.id);
  const match = store.matches.find((m) => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: 'Match tidak ditemukan' });
  }

  try {
    const analysis = await generateMatchAnalysis(match);
    match.ai_analysis = analysis;
    saveStore(store);
    res.json({ id: matchId, ai_analysis: analysis });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat analisis AI: ' + err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Simple admin auth check
  // Accepted credentials:
  // Email: admin@pantos.ml or admin / Password: pantos123
  if (
    (email === 'admin@pantos.ml' || email === 'admin' || !email) &&
    password === 'pantos123'
  ) {
    return res.json({
      success: true,
      token: 'admin-pantos-token-' + Date.now(),
      admin: { email: 'admin@pantos.ml', name: 'Admin Pantos' },
    });
  }
  return res.status(401).json({ success: false, error: 'Password admin salah (Gunakan: pantos123)' });
});

// POST /api/tournaments/analyze
app.post('/api/tournaments/analyze', async (req, res) => {
  try {
    const { tournamentName, standings, topPlayers } = req.body;
    const ai = getGenAI();
    let analysis = '';

    if (ai) {
      try {
        const standingsText = (standings || [])
          .map(
            (s: any, idx: number) =>
              `#${idx + 1} ${s.name}: ${s.won} Menang - ${s.lost} Kalah (${s.points} Poin, ${s.mvpCount} MVP, ${s.coklatCount} Coklat)`
          )
          .join('\n');

        const topPlayersText = (topPlayers || [])
          .slice(0, 4)
          .map(
            (p: any) =>
              `${p.playerName} (${p.team}): ${p.mvp}x MVP, ${p.points} Poin, ${p.coklat}x Coklat`
          )
          .join('; ');

        const promptText = `Turnamen: ${tournamentName || 'Piala Amal Pantos'}\n\nKlasemen Tim:\n${standingsText}\n\nTop Pemain & MVP Race:\n${topPlayersText}`;

        const systemInstruction =
          'Bertindaklah sebagai analis e-sport Mobile Legends yang tajam, sinis-bercanda namun objektif dan santai khas gamer Pantos. ' +
          'Analisis perolehan poin dan dinamika klasemen turnamen saat ini: siapa tim pemuncak yang perkasa, siapa yang menghuni zona bahaya/semen, ' +
          'serta ulas pemain yang berpotensi jadi MVP turnamen dan siapa yang sering jadi beban tim. ' +
          'Tulis dalam 3 paragraf bahasa Indonesia yang asyik dibaca.';

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.85,
          },
        });

        if (response.text && response.text.trim().length > 0) {
          analysis = response.text.trim();
        }
      } catch (err) {
        console.warn('Gemini tournament recap error, using fallback:', err);
      }
    }

    if (!analysis) {
      analysis =
        `Klasemen ${tournamentName || 'Piala Amal Pantos'} kian memanas. Tim pemuncak klasemen menunjukkan keunggulan rotasi makro yang rapi, sementara tim-tim pengejar masih berjuang keras memangkas selisih poin.\n\n` +
        `Dalam perburuan gelar MVP Turnamen, para pemain berstatus carry tampil stabil memimpin timnya, kontras dengan lini belakang yang kerap kali kecolongan medali Coklat akibat blunder fatal di fase mid game.\n\n` +
        `Memasuki babak penentuan, kedisiplinan draft dan komunikasi saat perebutan Lord akan jadi pembeda utama antara calon kampiun dan penghuni tetap Kelas Semen.`;
    }

    res.json({ analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal membuat analisis turnamen' });
  }
});

// ----------------- TOURNAMENT ENDPOINTS -----------------

// GET /api/tournaments
app.get('/api/tournaments', (req, res) => {
  res.json(store.tournaments || []);
});

// POST /api/tournaments (Create new tournament)
app.post('/api/tournaments', (req, res) => {
  try {
    const { name, season, format, prizePool, teams } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nama turnamen wajib diisi' });
    }

    const newId = 'trn-' + Date.now();
    const defaultTeams: TournamentTeamStanding[] = (teams && teams.length > 0)
      ? teams
      : [
          {
            id: 'team-pohon-' + newId,
            name: 'Tim Pohon',
            shortName: 'Pohon',
            color: '#4F7942',
            played: 0,
            won: 0,
            lost: 0,
            points: 0,
            gameWins: 0,
            gameLosses: 0,
            mvpCount: 0,
            goldCount: 0,
            silverCount: 0,
            coklatCount: 0,
            streak: '-',
            form: [],
          },
          {
            id: 'team-lobby-' + newId,
            name: 'Tim Lobby',
            shortName: 'Lobby',
            color: '#C97A3D',
            played: 0,
            won: 0,
            lost: 0,
            points: 0,
            gameWins: 0,
            gameLosses: 0,
            mvpCount: 0,
            goldCount: 0,
            silverCount: 0,
            coklatCount: 0,
            streak: '-',
            form: [],
          },
          {
            id: 'team-cabutan-' + newId,
            name: 'Tim Cabutan',
            shortName: 'Cabutan',
            color: '#E8B33D',
            played: 0,
            won: 0,
            lost: 0,
            points: 0,
            gameWins: 0,
            gameLosses: 0,
            mvpCount: 0,
            goldCount: 0,
            silverCount: 0,
            coklatCount: 0,
            streak: '-',
            form: [],
          },
          {
            id: 'team-veteran-' + newId,
            name: 'Tim Veteran',
            shortName: 'Veteran',
            color: '#8A7A6E',
            played: 0,
            won: 0,
            lost: 0,
            points: 0,
            gameWins: 0,
            gameLosses: 0,
            mvpCount: 0,
            goldCount: 0,
            silverCount: 0,
            coklatCount: 0,
            streak: '-',
            form: [],
          },
        ];

    const newTournament: TournamentData = {
      id: newId,
      name,
      season: season || 'Musim 2025',
      status: 'Sedang Berjalan',
      format: format || 'Klasemen Liga (Round-Robin) & Playoff BO5',
      prizePool: prizePool || 'Gelar Juara Laga Amal',
      standings: defaultTeams,
      fixtures: [],
      ai_recap: 'Turnamen baru telah didaftarkan. Hasil pertandingan dan klasemen akan diperbarui seiring berjalannya turnamen.',
    };

    store.tournaments.unshift(newTournament);
    saveStore(store);

    res.status(201).json(newTournament);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal membuat turnamen' });
  }
});

// PUT /api/tournaments/:id (Update tournament info / status)
app.put('/api/tournaments/:id', (req, res) => {
  const tId = req.params.id;
  const tIndex = store.tournaments.findIndex((t) => t.id === tId);
  if (tIndex === -1) {
    return res.status(404).json({ error: 'Turnamen tidak ditemukan' });
  }

  const { name, season, status, format, prizePool, ai_recap } = req.body;
  if (name !== undefined) store.tournaments[tIndex].name = name;
  if (season !== undefined) store.tournaments[tIndex].season = season;
  if (status !== undefined) store.tournaments[tIndex].status = status;
  if (format !== undefined) store.tournaments[tIndex].format = format;
  if (prizePool !== undefined) store.tournaments[tIndex].prizePool = prizePool;
  if (ai_recap !== undefined) store.tournaments[tIndex].ai_recap = ai_recap;

  saveStore(store);
  res.json(store.tournaments[tIndex]);
});

// POST /api/tournaments/:id/fixtures (Add or update fixture and optionally update standings)
app.post('/api/tournaments/:id/fixtures', (req, res) => {
  const tId = req.params.id;
  const tournament = store.tournaments.find((t) => t.id === tId);
  if (!tournament) {
    return res.status(404).json({ error: 'Turnamen tidak ditemukan' });
  }

  const { round, date, teamA, teamB, scoreA, scoreB, status, winner, matchId, autoUpdateStandings } = req.body;

  if (!teamA || !teamB) {
    return res.status(400).json({ error: 'Kedua tim wajib dipilih' });
  }

  const newFixture: TournamentFixture = {
    id: 'fix-' + Date.now(),
    round: round || 'Pekan Reguler',
    date: date || new Date().toLocaleDateString('id-ID'),
    teamA,
    teamB,
    scoreA: Number(scoreA) || 0,
    scoreB: Number(scoreB) || 0,
    status: status || 'Selesai',
    winner: winner || (scoreA > scoreB ? teamA : scoreB > scoreA ? teamB : undefined),
    matchId: matchId ? Number(matchId) : undefined,
  };

  tournament.fixtures.push(newFixture);

  // Auto-update standings if match is finished and requested
  if (autoUpdateStandings && newFixture.status === 'Selesai' && newFixture.winner) {
    const sA = tournament.standings.find((s) => s.name === teamA || s.shortName === teamA);
    const sB = tournament.standings.find((s) => s.name === teamB || s.shortName === teamB);

    if (sA && sB) {
      sA.played += 1;
      sB.played += 1;
      sA.gameWins += newFixture.scoreA;
      sA.gameLosses += newFixture.scoreB;
      sB.gameWins += newFixture.scoreB;
      sB.gameLosses += newFixture.scoreA;

      if (newFixture.winner === sA.name || newFixture.winner === sA.shortName) {
        sA.won += 1;
        sA.points += 3;
        sA.form.push('W');
        sA.streak = 'W' + (sA.streak.startsWith('W') ? (parseInt(sA.streak.slice(1)) || 1) + 1 : 1);

        sB.lost += 1;
        sB.form.push('L');
        sB.streak = 'L' + (sB.streak.startsWith('L') ? (parseInt(sB.streak.slice(1)) || 1) + 1 : 1);
      } else {
        sB.won += 1;
        sB.points += 3;
        sB.form.push('W');
        sB.streak = 'W' + (sB.streak.startsWith('W') ? (parseInt(sB.streak.slice(1)) || 1) + 1 : 1);

        sA.lost += 1;
        sA.form.push('L');
        sA.streak = 'L' + (sA.streak.startsWith('L') ? (parseInt(sA.streak.slice(1)) || 1) + 1 : 1);
      }

      // Re-sort standings by points desc, game diff desc
      tournament.standings.sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        const diffY = y.gameWins - y.gameLosses;
        const diffX = x.gameWins - x.gameLosses;
        if (diffY !== diffX) return diffY - diffX;
        return y.gameWins - x.gameWins;
      });
    }
  }

  saveStore(store);
  res.status(201).json({ fixture: newFixture, tournament });
});

// PUT /api/tournaments/:id/fixtures/:fixtureId
app.put('/api/tournaments/:id/fixtures/:fixtureId', (req, res) => {
  const { id, fixtureId } = req.params;
  const tournament = store.tournaments.find((t) => t.id === id);
  if (!tournament) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });

  const fixture = tournament.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return res.status(404).json({ error: 'Fixture tidak ditemukan' });

  const { round, date, teamA, teamB, scoreA, scoreB, status, winner } = req.body;
  if (round !== undefined) fixture.round = round;
  if (date !== undefined) fixture.date = date;
  if (teamA !== undefined) fixture.teamA = teamA;
  if (teamB !== undefined) fixture.teamB = teamB;
  if (scoreA !== undefined) fixture.scoreA = Number(scoreA);
  if (scoreB !== undefined) fixture.scoreB = Number(scoreB);
  if (status !== undefined) fixture.status = status;
  if (winner !== undefined) fixture.winner = winner;

  saveStore(store);
  res.json({ fixture, tournament });
});

// DELETE /api/tournaments/:id/fixtures/:fixtureId
app.delete('/api/tournaments/:id/fixtures/:fixtureId', (req, res) => {
  const { id, fixtureId } = req.params;
  const tournament = store.tournaments.find((t) => t.id === id);
  if (!tournament) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });

  tournament.fixtures = tournament.fixtures.filter((f) => f.id !== fixtureId);
  saveStore(store);
  res.json({ success: true, tournament });
});

// PUT /api/tournaments/:id/standings (Update standings directly)
app.put('/api/tournaments/:id/standings', (req, res) => {
  const { id } = req.params;
  const { standings } = req.body;
  const tournament = store.tournaments.find((t) => t.id === id);
  if (!tournament) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });

  if (Array.isArray(standings)) {
    tournament.standings = standings;
    saveStore(store);
    return res.json(tournament);
  }
  res.status(400).json({ error: 'Standings data invalid' });
});

// POST /api/tournaments/:id/teams (Add a new team to a tournament)
app.post('/api/tournaments/:id/teams', (req, res) => {
  const { id } = req.params;
  const tournament = store.tournaments.find((t) => t.id === id);
  if (!tournament) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });

  const { name, shortName, color, members, slogan } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nama tim wajib diisi' });
  }

  const trimmedName = name.trim();
  const trimmedShort = (shortName && typeof shortName === 'string' && shortName.trim())
    ? shortName.trim().toUpperCase()
    : trimmedName.slice(0, 3).toUpperCase();

  // Check duplicate team name in this tournament
  const exists = tournament.standings.some(
    (s) => s.name.toLowerCase() === trimmedName.toLowerCase() || s.shortName.toLowerCase() === trimmedShort.toLowerCase()
  );
  if (exists) {
    return res.status(400).json({ error: `Tim '${trimmedName}' atau singkatan '${trimmedShort}' sudah terdaftar dalam turnamen ini` });
  }

  const newTeam: TournamentTeamStanding = {
    id: 'team-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: trimmedName,
    shortName: trimmedShort,
    color: color || '#E8B33D',
    played: 0,
    won: 0,
    lost: 0,
    points: 0,
    gameWins: 0,
    gameLosses: 0,
    mvpCount: 0,
    goldCount: 0,
    silverCount: 0,
    coklatCount: 0,
    streak: '-',
    form: [],
    members: Array.isArray(members) ? members : [],
    slogan: slogan && typeof slogan === 'string' ? slogan.trim() : undefined,
  };

  tournament.standings.push(newTeam);
  saveStore(store);

  res.status(201).json({ success: true, team: newTeam, tournament });
});

// PUT /api/tournaments/:id/teams/:teamId (Update a team)
app.put('/api/tournaments/:id/teams/:teamId', (req, res) => {
  const { id, teamId } = req.params;
  const tournament = store.tournaments.find((t) => t.id === id);
  if (!tournament) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });

  const team = tournament.standings.find((s) => s.id === teamId);
  if (!team) return res.status(404).json({ error: 'Tim tidak ditemukan di turnamen ini' });

  const { name, shortName, color, members, slogan } = req.body;
  const oldName = team.name;

  if (name && typeof name === 'string' && name.trim()) {
    team.name = name.trim();
  }
  if (shortName && typeof shortName === 'string' && shortName.trim()) {
    team.shortName = shortName.trim().toUpperCase();
  }
  if (color && typeof color === 'string') {
    team.color = color;
  }
  if (Array.isArray(members)) {
    team.members = members;
  }
  if (slogan !== undefined) {
    team.slogan = slogan;
  }

  // If team name changed, also update occurrences in fixtures
  if (name && oldName !== team.name) {
    tournament.fixtures.forEach((f) => {
      if (f.teamA === oldName) f.teamA = team.name;
      if (f.teamB === oldName) f.teamB = team.name;
      if (f.winner === oldName) f.winner = team.name;
    });
  }

  saveStore(store);
  res.json({ success: true, team, tournament });
});

// DELETE /api/tournaments/:id/teams/:teamId (Remove a team)
app.delete('/api/tournaments/:id/teams/:teamId', (req, res) => {
  const { id, teamId } = req.params;
  const tournament = store.tournaments.find((t) => t.id === id);
  if (!tournament) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });

  if (tournament.standings.length <= 2) {
    return res.status(400).json({ error: 'Turnamen membutuhkan minimal 2 tim peserta' });
  }

  const team = tournament.standings.find((s) => s.id === teamId);
  if (!team) return res.status(404).json({ error: 'Tim tidak ditemukan' });

  tournament.standings = tournament.standings.filter((s) => s.id !== teamId);
  saveStore(store);

  res.json({ success: true, message: `Tim ${team.name} berhasil dihapus`, tournament });
});

// ----------------- LAGA AMAL (CSV BENCHMARK) ROUTES -----------------
// GET /api/laga-amal (Get all seasons)
app.get('/api/laga-amal', (req, res) => {
  res.json(store.lagaAmalSeasons || [INITIAL_LAGA_AMAL_S41]);
});

// GET /api/laga-amal/:id (Get specific season by id)
app.get('/api/laga-amal/:id', (req, res) => {
  const season = (store.lagaAmalSeasons || []).find((s) => s.id === req.params.id);
  if (!season) {
    return res.status(404).json({ error: 'Musim Laga Amal tidak ditemukan' });
  }
  res.json(season);
});

// POST /api/laga-amal (Save or update a season from CSV import)
app.post('/api/laga-amal', (req, res) => {
  const newSeason: LagaAmalSeasonData = req.body;
  if (!newSeason || !newSeason.id) {
    return res.status(400).json({ error: 'Data musim tidak valid' });
  }

  if (!store.lagaAmalSeasons) {
    store.lagaAmalSeasons = [];
  }

  const existingIdx = store.lagaAmalSeasons.findIndex((s) => s.id === newSeason.id);
  if (existingIdx >= 0) {
    store.lagaAmalSeasons[existingIdx] = newSeason;
  } else {
    store.lagaAmalSeasons.push(newSeason);
  }

  saveStore(store);
  res.json({ success: true, season: newSeason });
});

// POST /api/reset-data
app.post('/api/reset-data', (req, res) => {
  store = {
    players: JSON.parse(JSON.stringify(INITIAL_PLAYERS)),
    matches: JSON.parse(JSON.stringify(INITIAL_MATCHES)),
    tournaments: JSON.parse(JSON.stringify(INITIAL_TOURNAMENTS)),
    lagaAmalSeasons: [JSON.parse(JSON.stringify(INITIAL_LAGA_AMAL_S41))],
  };
  saveStore(store);
  res.json({ success: true, message: 'Data berhasil direset ke seed awal' });
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
