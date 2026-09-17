import {
  LagaAmalSeasonData,
  LagaAmalPlayerStat,
  Player,
  Match,
  LagaAmalHeroPick,
  HeroPickByUser,
  UserHeroPercentage,
} from '../types';
import { getPlayerAvatarUrl } from '../data/playerAvatars';

export const EMPTY_SEASON: LagaAmalSeasonData = {
  id: 's1',
  title: 'KLASEMEN LAGA AMAL - S1',
  dateStr: '',
  activePlayersCount: 0,
  topCoklat: { player: '-', count: 0 },
  topSilver: { player: '-', count: 0 },
  topAntam: { player: '-', count: 0 },
  topMvp: { player: '-', count: 0 },
  totalMatches: 0,
  totalMatchesRecorded: 0,
  totalScore: 0,
  totalScoreAccumulated: 0,
  avgWinRateTotal: 0,
  averageWinRate: 0,
  avgScoreTotal: 0,
  averageScore: 0,
  players: [],
  matchRows: [],
  heroPicksByUser: [],
  heroPool: [],
  heroPicks: [],
  matchLogs: [],
};

/**
 * Builds the application-wide Player[] roster directly from a LagaAmalSeasonData object.
 * This guarantees 100% data synchronicity across Dashboard, Profile, and Standings.
 */
export function buildPlayersFromSeason(season?: LagaAmalSeasonData | null): Player[] {
  if (!season || !Array.isArray(season.players)) return [];

  const uniquePlayers: LagaAmalPlayerStat[] = [];
  const seenNames = new Set<string>();

  for (const p of season.players) {
    const key = (p.nickname || '').trim().toLowerCase();
    if (!key || seenNames.has(key)) continue;
    seenNames.add(key);
    uniquePlayers.push(p);
  }

  return uniquePlayers.map((p, idx) => {
    let tier = 'Legend';
    if (p.mvp >= 20 || p.winRate >= 65) tier = 'Mythic Glory';
    else if (p.mvp >= 10 || p.winRate >= 50) tier = 'Mythic';
    else if (p.coklat >= 6) tier = 'Epic (Semen)';

    return {
      id: idx + 1,
      name: p.nickname,
      status: p.status || (p.matches >= 20 ? 'Aktif' : 'Cabutan'),
      tier: p.tier || tier,
      julukan: p.julukan,
      julukan_updated_at: p.julukan_updated_at,
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
 * Derives the UI-facing "Hero Picks" shape (grouped per player, with
 * percentage share per hero) from the raw per-player-per-hero tally
 * (heroPicksByUser). This is the single source of truth the "Hero Picks"
 * tab reads from — call this any time heroPicksByUser changes so the
 * tab never goes stale.
 */
export function deriveHeroPicksForUI(heroPicksByUser: LagaAmalHeroPick[] = []): HeroPickByUser[] {
  const byPlayer = new Map<string, LagaAmalHeroPick[]>();

  heroPicksByUser.forEach((hp) => {
    const list = byPlayer.get(hp.player) || [];
    list.push(hp);
    byPlayer.set(hp.player, list);
  });

  const result: HeroPickByUser[] = [];
  byPlayer.forEach((picks, player) => {
    const totalPicks = picks.reduce((sum, p) => sum + (p.total || 0), 0);
    const heroes: UserHeroPercentage[] = picks
      .map((p) => ({
        heroName: p.hero,
        percentage: totalPicks > 0 ? Math.round((p.total / totalPicks) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
    result.push({ user: player, heroes });
  });

  return result.sort((a, b) => a.user.localeCompare(b.user));
}

/**
 * Recalculates season summary stats (tops, totals, averages)
 */
export function recalculateSeasonStats(season: LagaAmalSeasonData): LagaAmalSeasonData {
  const updated = { ...season };
  const players = [...(updated.players || [])];

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

  if (updated.heroPicksByUser && updated.heroPicksByUser.length > 0) {
    updated.heroPicks = deriveHeroPicksForUI(updated.heroPicksByUser);
  }

  return updated;
}

/**
 * Applies a newly completed match to a season, updating player stats,
 * hero picks, hero pool, and match logs synchronously.
 */
export function applyMatchToSeason(season: LagaAmalSeasonData, match: Match): LagaAmalSeasonData {
  const updated = JSON.parse(JSON.stringify(season)) as LagaAmalSeasonData;
  if (!updated.players) updated.players = [];
  if (!updated.heroPicksByUser) updated.heroPicksByUser = [];
  if (!updated.heroPool) updated.heroPool = [];
  if (!updated.matchRows) updated.matchRows = [];

  const allMatchPlayers = [...(match.pohon || []), ...(match.lobby || [])];

  allMatchPlayers.forEach((mp) => {
    let playerStat = updated.players.find(
      (p) => p.nickname.toLowerCase() === mp.player_name.toLowerCase()
    );

    const isWinner =
      (mp.team === 'Pohon' && match.winner === 'Tim Pohon') ||
      (mp.team === 'Lobby' && match.winner === 'Tim Lobby');

    const scoreDelta =
      typeof mp.score === 'number' && !isNaN(mp.score)
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

  if (!updated.matchLogs) updated.matchLogs = [];
  const pohonMvpEntry = (match.pohon || []).find((mp) => mp.medal === 'MVP');
  const lobbyMvpEntry = (match.lobby || []).find((mp) => mp.medal === 'MVP');
  const validNum =
    typeof (match as any).matchNumber === 'number' && (match as any).matchNumber > 0 && (match as any).matchNumber < 1000000
      ? (match as any).matchNumber
      : Number(match.id) > 0 && Number(match.id) < 1000000
      ? Number(match.id)
      : updated.matchLogs.length + 1;

  updated.matchLogs.unshift({
    matchNumber: validNum,
    date: match.date,
    winner: match.winner,
    pohonMvp: pohonMvpEntry?.player_name,
    lobbyMvp: lobbyMvpEntry?.player_name,
  });

  updated.heroPicks = deriveHeroPicksForUI(updated.heroPicksByUser);

  return recalculateSeasonStats(updated);
}

/**
 * Reverts a deleted match from a season, adjusting player stats,
 * hero picks, hero pool, and match logs synchronously.
 */
export function revertMatchFromSeason(season: LagaAmalSeasonData, match: Match): LagaAmalSeasonData {
  const updated = JSON.parse(JSON.stringify(season)) as LagaAmalSeasonData;
  const allMatchPlayers = [...(match.pohon || []), ...(match.lobby || [])];

  // 1. Remove from matchRows
  if (updated.matchRows) {
    updated.matchRows = updated.matchRows.filter(
      (row) => !row.id.startsWith(`match-${match.id}-`)
    );
  }

  // 2. Remove from matchLogs
  if (updated.matchLogs) {
    updated.matchLogs = updated.matchLogs.filter(
      (log) => !(log.date === match.date && log.winner === match.winner)
    );
    // re-number matchLogs
    const total = updated.matchLogs.length;
    updated.matchLogs.forEach((log, idx) => {
      log.matchNumber = total - idx;
    });
  }

  // 3. Subtract player stats
  allMatchPlayers.forEach((mp) => {
    const playerStat = (updated.players || []).find(
      (p) => p.nickname.toLowerCase() === mp.player_name.toLowerCase()
    );
    if (!playerStat) return;

    const isWinner =
      (mp.team === 'Pohon' && match.winner === 'Tim Pohon') ||
      (mp.team === 'Lobby' && match.winner === 'Tim Lobby');

    const scoreDelta =
      typeof mp.score === 'number' && !isNaN(mp.score)
        ? mp.score
        : mp.medal === 'MVP'
        ? 10.0
        : mp.medal === 'Gold'
        ? 8.5
        : mp.medal === 'Silver'
        ? 6.0
        : 3.5;

    if (playerStat.matches > 1) {
      const currentWins = Math.round(((playerStat.winRate || 0) * playerStat.matches) / 100);
      const newWins = Math.max(0, currentWins - (isWinner ? 1 : 0));
      playerStat.matches -= 1;
      playerStat.winRate = parseFloat(((newWins / playerStat.matches) * 100).toFixed(2));
      playerStat.score = parseFloat(Math.max(0, playerStat.score - scoreDelta).toFixed(1));
      playerStat.avgScore = parseFloat((playerStat.score / playerStat.matches).toFixed(2));

      if (mp.medal === 'Coklat') playerStat.coklat = Math.max(0, playerStat.coklat - 1);
      else if (mp.medal === 'Silver') playerStat.silver = Math.max(0, playerStat.silver - 1);
      else if (mp.medal === 'Gold') playerStat.antam = Math.max(0, playerStat.antam - 1);
      else if (mp.medal === 'MVP') playerStat.mvp = Math.max(0, playerStat.mvp - 1);
    } else {
      playerStat.matches = 0;
      playerStat.score = 0;
      playerStat.avgScore = 0;
      playerStat.winRate = 0;
      playerStat.coklat = 0;
      playerStat.silver = 0;
      playerStat.antam = 0;
      playerStat.mvp = 0;
    }

    // 4. Update hero picks
    if (updated.heroPicksByUser) {
      const heroPick = updated.heroPicksByUser.find(
        (hp) =>
          hp.player.toLowerCase() === mp.player_name.toLowerCase() &&
          hp.hero.toLowerCase() === mp.hero_name.toLowerCase()
      );
      if (heroPick) {
        heroPick.total = Math.max(0, heroPick.total - 1);
        if (mp.medal === 'Coklat') heroPick.coklat = Math.max(0, heroPick.coklat - 1);
        else if (mp.medal === 'Silver') heroPick.silver = Math.max(0, heroPick.silver - 1);
        else if (mp.medal === 'Gold') heroPick.antam = Math.max(0, heroPick.antam - 1);
        else if (mp.medal === 'MVP') heroPick.mvp = Math.max(0, heroPick.mvp - 1);
      }
    }

    // 5. Update hero pool
    if (updated.heroPool) {
      const poolItem = updated.heroPool.find(
        (item: any) => (item.heroName || item.hero || '').toLowerCase() === mp.hero_name.toLowerCase()
      );
      if (poolItem) {
        poolItem.picked = Math.max(0, (poolItem.picked || 0) - 1);
        poolItem.timesPicked = Math.max(0, (poolItem.timesPicked || 0) - 1);
      }
    }
  });

  if (updated.heroPicksByUser) {
    updated.heroPicksByUser = updated.heroPicksByUser.filter((hp) => hp.total > 0);
    updated.heroPicks = deriveHeroPicksForUI(updated.heroPicksByUser);
  }

  return recalculateSeasonStats(updated);
}
