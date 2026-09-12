import { LagaAmalSeasonData, LagaAmalPlayerStat, Player, Match, Medal } from '../types';
import { INITIAL_LAGA_AMAL_S41, INITIAL_S41_PLAYERS } from './lagaAmalS41Data';
import { getPlayerAvatarUrl } from './playerAvatars';

// Season 40 (Historical Archive)
export const INITIAL_LAGA_AMAL_S40: LagaAmalSeasonData = {
  id: 's40',
  title: 'KLASEMEN LAGA AMAL - S40',
  dateStr: 'Desember 2024 - Januari 2025',
  activePlayersCount: 14,
  topCoklat: { player: 'irvantaufiq12', count: 9 },
  topSilver: { player: 'Mr. GiL', count: 32 },
  topAntam: { player: 'Dignityzed', count: 34 },
  topMvp: { player: 'LAH MANDOOR', count: 21 },
  totalMatches: 72,
  totalMatchesRecorded: 72,
  totalScore: 5410.5,
  totalScoreAccumulated: 5410.5,
  avgWinRateTotal: 49.8,
  averageWinRate: 49.8,
  avgScoreTotal: 7.51,
  averageScore: 7.51,
  players: [
    { nickname: 'LAH MANDOOR', coklat: 3, silver: 16, antam: 32, mvp: 21, matches: 72, score: 620.5, winRate: 62.5, avgScore: 8.61 },
    { nickname: 'Dignityzed', coklat: 2, silver: 15, antam: 34, mvp: 19, matches: 70, score: 602.8, winRate: 74.28, avgScore: 8.61 },
    { nickname: 'POCONG JEPRIE', coklat: 5, silver: 23, antam: 30, mvp: 12, matches: 70, score: 531.0, winRate: 40.0, avgScore: 7.58 },
    { nickname: 'Hees', coklat: 3, silver: 18, antam: 31, mvp: 16, matches: 68, score: 548.2, winRate: 44.11, avgScore: 8.06 },
    { nickname: 'YY', coklat: 3, silver: 26, antam: 28, mvp: 13, matches: 70, score: 519.4, winRate: 51.42, avgScore: 7.42 },
    { nickname: 'Mr. GiL', coklat: 3, silver: 32, antam: 22, mvp: 11, matches: 68, score: 496.4, winRate: 47.05, avgScore: 7.30 },
    { nickname: 'irvantaufiq12', coklat: 9, silver: 33, antam: 20, mvp: 5, matches: 67, score: 420.0, winRate: 37.31, avgScore: 6.26 },
    { nickname: 'Mr P Jay', coklat: 2, silver: 24, antam: 19, mvp: 4, matches: 49, score: 341.2, winRate: 51.02, avgScore: 6.96 },
    { nickname: 'Bau Bandeng !', coklat: 4, silver: 19, antam: 14, mvp: 8, matches: 45, score: 324.5, winRate: 42.22, avgScore: 7.21 },
    { nickname: 'abcdeppp', coklat: 5, silver: 20, antam: 18, mvp: 4, matches: 47, score: 312.0, winRate: 53.19, avgScore: 6.63 },
    { nickname: 'Portgas', coklat: 2, silver: 16, antam: 15, mvp: 6, matches: 39, score: 282.1, winRate: 33.33, avgScore: 7.23 },
    { nickname: 'KELUNG', coklat: 2, silver: 12, antam: 8, mvp: 3, matches: 25, score: 172.5, winRate: 44.0, avgScore: 6.90 },
    { nickname: 'Midzy', coklat: 1, silver: 2, antam: 6, mvp: 5, matches: 14, score: 115.2, winRate: 57.14, avgScore: 8.22 },
    { nickname: 'Blackpink', coklat: 1, silver: 2, antam: 1, mvp: 2, matches: 6, score: 41.0, winRate: 33.33, avgScore: 6.83 },
  ],
  heroPicksByUser: INITIAL_LAGA_AMAL_S41.heroPicksByUser,
  heroPool: INITIAL_LAGA_AMAL_S41.heroPool,
  matchRows: [],
};

// Season 39 (Historical Archive)
export const INITIAL_LAGA_AMAL_S39: LagaAmalSeasonData = {
  id: 's39',
  title: 'KLASEMEN LAGA AMAL - S39',
  dateStr: 'Oktober - November 2024',
  activePlayersCount: 14,
  topCoklat: { player: 'irvantaufiq12', count: 11 },
  topSilver: { player: 'YY', count: 30 },
  topAntam: { player: 'LAH MANDOOR', count: 33 },
  topMvp: { player: 'Dignityzed', count: 20 },
  totalMatches: 65,
  totalMatchesRecorded: 65,
  totalScore: 4890.0,
  totalScoreAccumulated: 4890.0,
  avgWinRateTotal: 48.2,
  averageWinRate: 48.2,
  avgScoreTotal: 7.42,
  averageScore: 7.42,
  players: [
    { nickname: 'Dignityzed', coklat: 1, silver: 13, antam: 31, mvp: 20, matches: 65, score: 565.5, winRate: 76.92, avgScore: 8.70 },
    { nickname: 'LAH MANDOOR', coklat: 3, silver: 14, antam: 33, mvp: 18, matches: 68, score: 580.2, winRate: 63.23, avgScore: 8.53 },
    { nickname: 'Hees', coklat: 2, silver: 15, antam: 29, mvp: 15, matches: 61, score: 492.0, winRate: 42.62, avgScore: 8.06 },
    { nickname: 'POCONG JEPRIE', coklat: 6, silver: 21, antam: 27, mvp: 10, matches: 64, score: 480.0, winRate: 37.5, avgScore: 7.50 },
    { nickname: 'YY', coklat: 4, silver: 30, antam: 24, mvp: 11, matches: 69, score: 504.0, winRate: 50.72, avgScore: 7.30 },
    { nickname: 'Mr. GiL', coklat: 2, silver: 29, antam: 20, mvp: 10, matches: 61, score: 442.0, winRate: 49.18, avgScore: 7.24 },
    { nickname: 'irvantaufiq12', coklat: 11, silver: 30, antam: 17, mvp: 4, matches: 62, score: 382.0, winRate: 35.48, avgScore: 6.16 },
    { nickname: 'Mr P Jay', coklat: 3, silver: 20, antam: 16, mvp: 3, matches: 42, score: 288.0, winRate: 50.0, avgScore: 6.85 },
    { nickname: 'Bau Bandeng !', coklat: 3, silver: 17, antam: 12, mvp: 7, matches: 39, score: 281.0, winRate: 43.58, avgScore: 7.20 },
    { nickname: 'abcdeppp', coklat: 4, silver: 18, antam: 15, mvp: 3, matches: 40, score: 260.0, winRate: 52.5, avgScore: 6.50 },
    { nickname: 'Portgas', coklat: 2, silver: 13, antam: 12, mvp: 5, matches: 32, score: 230.0, winRate: 34.37, avgScore: 7.18 },
    { nickname: 'KELUNG', coklat: 3, silver: 10, antam: 6, mvp: 2, matches: 21, score: 140.0, winRate: 42.85, avgScore: 6.66 },
    { nickname: 'Midzy', coklat: 0, silver: 2, antam: 5, mvp: 4, matches: 11, score: 92.0, winRate: 63.63, avgScore: 8.36 },
    { nickname: 'Blackpink', coklat: 1, silver: 1, antam: 1, mvp: 1, matches: 4, score: 27.0, winRate: 25.0, avgScore: 6.75 },
  ],
  heroPicksByUser: INITIAL_LAGA_AMAL_S41.heroPicksByUser,
  heroPool: INITIAL_LAGA_AMAL_S41.heroPool,
  matchRows: [],
};

export const ALL_INITIAL_SEASONS: LagaAmalSeasonData[] = [
  INITIAL_LAGA_AMAL_S41,
  INITIAL_LAGA_AMAL_S40,
  INITIAL_LAGA_AMAL_S39,
];

/**
 * Builds the application-wide Player[] roster directly from a LagaAmalSeasonData object.
 * This guarantees 100% data synchronicity across Dashboard, Profile, and Standings.
 */
export function buildPlayersFromSeason(season: LagaAmalSeasonData): Player[] {
  return season.players.map((p, idx) => {
    let tier = 'Legend';
    if (p.mvp >= 20 || p.winRate >= 65) tier = 'Mythic Glory';
    else if (p.mvp >= 10 || p.winRate >= 50) tier = 'Mythic';
    else if (p.coklat >= 6) tier = 'Epic (Semen)';

    return {
      id: idx + 1,
      name: p.nickname,
      status: p.matches >= 20 ? 'Aktif' : 'Cabutan',
      tier,
      total_match: p.matches,
      medals: {
        MVP: p.mvp,
        Gold: p.antam,
        Silver: p.silver,
        Coklat: p.coklat,
      },
      score: p.score,
      avgScore: p.avgScore,
      winRate: p.winRate,
      avatar_url: getPlayerAvatarUrl(p.nickname, p.avatar_url),
    };
  });
}

/**
 * Recalculates season summary stats (tops, totals, averages)
 */
export function recalculateSeasonStats(season: LagaAmalSeasonData): LagaAmalSeasonData {
  const updated = { ...season };
  const players = [...updated.players];

  let topCoklat = { player: players[0]?.nickname || '-', count: 0 };
  let topSilver = { player: players[0]?.nickname || '-', count: 0 };
  let topAntam = { player: players[0]?.nickname || '-', count: 0 };
  let topMvp = { player: players[0]?.nickname || '-', count: 0 };

  let totalScore = 0;
  let totalWinRate = 0;
  let maxMatches = 0;

  players.forEach((p) => {
    if (p.coklat > topCoklat.count) topCoklat = { player: p.nickname, count: p.coklat };
    if (p.silver > topSilver.count) topSilver = { player: p.nickname, count: p.silver };
    if (p.antam > topAntam.count) topAntam = { player: p.nickname, count: p.antam };
    if (p.mvp > topMvp.count) topMvp = { player: p.nickname, count: p.mvp };

    totalScore += p.score;
    totalWinRate += p.winRate;
    if (p.matches > maxMatches) maxMatches = p.matches;
  });

  const avgWR = players.length > 0 ? parseFloat((totalWinRate / players.length).toFixed(2)) : 0;
  const avgSc =
    players.length > 0
      ? parseFloat((players.reduce((sum, p) => sum + p.avgScore, 0) / players.length).toFixed(2))
      : 0;

  updated.topCoklat = topCoklat;
  updated.topSilver = topSilver;
  updated.topAntam = topAntam;
  updated.topMvp = topMvp;
  updated.totalMatches = maxMatches;
  updated.totalMatchesRecorded = maxMatches;
  updated.totalScore = parseFloat(totalScore.toFixed(1));
  updated.totalScoreAccumulated = parseFloat(totalScore.toFixed(1));
  updated.avgWinRateTotal = avgWR;
  updated.averageWinRate = avgWR;
  updated.avgScoreTotal = avgSc;
  updated.averageScore = avgSc;
  updated.activePlayersCount = players.length;

  return updated;
}

/**
 * Applies a newly completed match to a season, updating player stats,
 * hero picks, hero pool, and match logs synchronously.
 */
export function applyMatchToSeason(season: LagaAmalSeasonData, match: Match): LagaAmalSeasonData {
  const updated = JSON.parse(JSON.stringify(season)) as LagaAmalSeasonData;
  if (!updated.heroPicksByUser) updated.heroPicksByUser = [];
  if (!updated.heroPool) updated.heroPool = [];
  if (!updated.matchRows) updated.matchRows = [];

  const allMatchPlayers = [...match.pohon, ...match.lobby];

  allMatchPlayers.forEach((mp) => {
    let playerStat = updated.players.find(
      (p) => p.nickname.toLowerCase() === mp.player_name.toLowerCase()
    );

    const isWinner =
      (mp.team === 'Pohon' && match.winner === 'Tim Pohon') ||
      (mp.team === 'Lobby' && match.winner === 'Tim Lobby');

    const scoreDelta = typeof mp.score === 'number' && !isNaN(mp.score)
      ? mp.score
      : mp.medal === 'MVP'
      ? 10.0
      : mp.medal === 'Gold'
      ? 8.5
      : mp.medal === 'Silver'
      ? 6.0
      : 3.5;

    if (!playerStat) {
      playerStat = {
        nickname: mp.player_name,
        coklat: mp.medal === 'Coklat' ? 1 : 0,
        silver: mp.medal === 'Silver' ? 1 : 0,
        antam: mp.medal === 'Gold' ? 1 : 0,
        mvp: mp.medal === 'MVP' ? 1 : 0,
        matches: 1,
        score: scoreDelta,
        winRate: isWinner ? 100 : 0,
        avgScore: scoreDelta,
      };
      updated.players.push(playerStat);
    } else {
      playerStat.matches += 1;
      if (mp.medal === 'Coklat') playerStat.coklat += 1;
      else if (mp.medal === 'Silver') playerStat.silver += 1;
      else if (mp.medal === 'Gold') playerStat.antam += 1;
      else if (mp.medal === 'MVP') playerStat.mvp += 1;

      playerStat.score = parseFloat((playerStat.score + scoreDelta).toFixed(1));
      playerStat.avgScore = parseFloat((playerStat.score / playerStat.matches).toFixed(2));

      // Update win rate
      const currentWins = Math.round(((playerStat.winRate || 0) * (playerStat.matches - 1)) / 100);
      const newWins = currentWins + (isWinner ? 1 : 0);
      playerStat.winRate = parseFloat(((newWins / playerStat.matches) * 100).toFixed(2));
    }

    // Update Hero Picks
    let heroPick = (updated.heroPicksByUser || []).find(
      (hp) =>
        hp.player.toLowerCase() === mp.player_name.toLowerCase() &&
        hp.hero.toLowerCase() === mp.hero_name.toLowerCase()
    );

    if (!heroPick) {
      heroPick = {
        player: mp.player_name,
        hero: mp.hero_name,
        coklat: mp.medal === 'Coklat' ? 1 : 0,
        silver: mp.medal === 'Silver' ? 1 : 0,
        antam: mp.medal === 'Gold' ? 1 : 0,
        mvp: mp.medal === 'MVP' ? 1 : 0,
        total: 1,
      };
      if (!updated.heroPicksByUser) updated.heroPicksByUser = [];
      updated.heroPicksByUser.push(heroPick);
    } else {
      heroPick.total += 1;
      if (mp.medal === 'Coklat') heroPick.coklat += 1;
      else if (mp.medal === 'Silver') heroPick.silver += 1;
      else if (mp.medal === 'Gold') heroPick.antam += 1;
      else if (mp.medal === 'MVP') heroPick.mvp += 1;
    }

    // Update Hero Pool
    let poolItem = (updated.heroPool || []).find(
      (item: any) => (item.heroName || item.hero || '').toLowerCase() === mp.hero_name.toLowerCase()
    );
    if (!poolItem) {
      poolItem = { hero: mp.hero_name, heroName: mp.hero_name, picked: 1, timesPicked: 1, percentage: 5 };
      if (!updated.heroPool) updated.heroPool = [];
      updated.heroPool.push(poolItem);
    } else {
      poolItem.picked = (poolItem.picked || 0) + 1;
      poolItem.timesPicked = (poolItem.timesPicked || 0) + 1;
    }

    // Append to matchRows
    if (!updated.matchRows) updated.matchRows = [];
    updated.matchRows.unshift({
      id: `match-${match.id}-${mp.player_name}`,
      date: match.date,
      nickname: mp.player_name,
      hero: mp.hero_name,
      coklat: mp.medal === 'Coklat' ? 1 : 0,
      silver: mp.medal === 'Silver' ? 1 : 0,
      antam: mp.medal === 'Gold' ? 1 : 0,
      mvp: mp.medal === 'MVP' ? 1 : 0,
      result: isWinner ? 'VICTORY' : 'DEFEAT',
      rating:
        mp.medal === 'MVP'
          ? '4. MVP'
          : mp.medal === 'Gold'
          ? '3. ANTAM'
          : mp.medal === 'Silver'
          ? '2. SILVER'
          : '1. COKLAT',
      score: scoreDelta,
      winRate: isWinner ? 1 : 0,
      count: 1,
    });
  });

  // Re-sort hero pool
  if (updated.heroPool) {
    updated.heroPool.sort((a: any, b: any) => (b.picked || b.timesPicked || 0) - (a.picked || a.timesPicked || 0));
  }

  return recalculateSeasonStats(updated);
}
