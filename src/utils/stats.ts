import { Match, Player, TopHeroStat, LagaAmalSeasonData } from '../types';

export function getPlayerTopHeroes(
  playerName: string,
  matches: Match[] = [],
  seasonData?: LagaAmalSeasonData
): TopHeroStat[] {
  const normName = playerName.trim().toLowerCase();

  // If seasonData exists, verify if player actually has matches recorded
  const playerSeasonStat = seasonData?.players.find(
    (p) => p.nickname.toLowerCase() === normName
  );
  const hasSeasonMatchesRecorded = (playerSeasonStat?.matches || 0) > 0;

  const heroMap: Record<
    string,
    { games: number; mvp: number; gold: number; silver: number; coklat: number }
  > = {};

  // Check from match history
  for (const match of matches) {
    const allRoster = [...(match.pohon || []), ...(match.lobby || [])];
    for (const p of allRoster) {
      if (p.player_name.toLowerCase() === normName) {
        const hero = p.hero_name || 'Hero';
        if (!heroMap[hero]) {
          heroMap[hero] = { games: 0, mvp: 0, gold: 0, silver: 0, coklat: 0 };
        }
        heroMap[hero].games += 1;
        if (p.medal === 'MVP') heroMap[hero].mvp += 1;
        if (p.medal === 'Gold') heroMap[hero].gold += 1;
        if (p.medal === 'Silver') heroMap[hero].silver += 1;
        if (p.medal === 'Coklat') heroMap[hero].coklat += 1;
      }
    }
  }

  // A match submitted through the admin panel is recorded in BOTH `matches`
  // (the live match-tracking system) AND `season.matchRows` (written by
  // applyMatchToSeason for every match). Summing both sources
  // unconditionally double-counted every such match. `matchRows` is now
  // only used as a legacy fallback for players/seasons with no live-tracked
  // games at all (e.g. an old CSV-imported season with no Match objects).
  const hasLiveTrackedGames = Object.keys(heroMap).length > 0;

  // Also check from seasonData.matchRows if available
  if (!hasLiveTrackedGames && seasonData?.matchRows && seasonData.matchRows.length > 0) {
    for (const r of seasonData.matchRows) {
      if (r.nickname.toLowerCase() === normName && r.hero) {
        const hero = r.hero;
        if (!heroMap[hero]) {
          heroMap[hero] = { games: 0, mvp: 0, gold: 0, silver: 0, coklat: 0 };
        }
        heroMap[hero].games += 1;
        if (r.mvp) heroMap[hero].mvp += 1;
        if (r.antam) heroMap[hero].gold += 1;
        if (r.silver) heroMap[hero].silver += 1;
        if (r.coklat) heroMap[hero].coklat += 1;
      }
    }
  }

  // Also check from seasonData.heroPicksByUser / heroPicks ONLY IF player has matches > 0 in this season
  // and heroMap is still empty (e.g. historical archive season without individual match rows)
  if (Object.keys(heroMap).length === 0 && hasSeasonMatchesRecorded) {
    if (seasonData?.heroPicksByUser && seasonData.heroPicksByUser.length > 0) {
      const picks = seasonData.heroPicksByUser.filter(
        (hp) => hp.player.toLowerCase() === normName
      );
      for (const hp of picks) {
        if (hp.total > 0) {
          heroMap[hp.hero] = {
            games: hp.total,
            mvp: hp.mvp,
            gold: hp.antam,
            silver: hp.silver,
            coklat: hp.coklat,
          };
        }
      }
    } else if (seasonData?.heroPicks && seasonData.heroPicks.length > 0) {
      const userPick = seasonData.heroPicks.find(
        (hp) => hp.user.toLowerCase() === normName
      );
      if (userPick && userPick.heroes) {
        for (const h of userPick.heroes) {
          const estimatedMatches = Math.max(1, Math.round((h.percentage / 100) * (playerSeasonStat?.matches || 5)));
          heroMap[h.heroName] = {
            games: estimatedMatches,
            mvp: 0,
            gold: 0,
            silver: 0,
            coklat: 0,
          };
        }
      }
    }
  }

  const list: TopHeroStat[] = Object.keys(heroMap).map((hero) => {
    const d = heroMap[hero];
    const mvpRate = d.games > 0 ? Math.round((d.mvp / d.games) * 100) : 0;
    return {
      hero,
      games: d.games,
      mvpCount: d.mvp,
      mvpRate,
      goldCount: d.gold,
      silverCount: d.silver,
      coklatCount: d.coklat,
    };
  });

  // Sort by games descending, then mvpRate descending
  list.sort((a, b) => b.games - a.games || b.mvpRate - a.mvpRate);

  // Return real heroes only; no synthetic fallbacks
  return list.slice(0, 3);
}

export interface DailyPerformancePoint {
  label: string; // e.g. "M1", "M2" or "M10"
  fullLabel?: string;
  date: string;
  rating: number | null; // MLBB match score rating (e.g. 8.6, 10.4)
  score?: number | null;
  detail: string;
  matchesCount: number;
  hasMatch: boolean;
  matchIndex?: number;
  hero?: string;
  medal?: string;
  result?: 'VICTORY' | 'DEFEAT' | '-';
  matchId?: string | number;
}

// Calculate rating score trend for the last 10 matches of a player
export function getPlayerPerformanceTrend(
  playerName: string,
  matches: Match[] = [],
  season?: LagaAmalSeasonData,
  maxMatches = 10
): DailyPerformancePoint[] {
  const normName = playerName.trim().toLowerCase();

  // Parse any date string into { year, month, day }
  const parseToDateParts = (dateStr?: string): { year: number; month: number; day: number } | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();

    // Check if standard parseable string or ISO
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    }

    // Indonesian text format: "13 Sep 2026" or "13 September 2026"
    const parts = cleanStr.split(/[\s,/-]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const mStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);

      const idMonths: Record<string, number> = {
        jan: 0, januari: 0,
        feb: 1, februari: 1,
        mar: 2, maret: 2,
        apr: 3, april: 3,
        mei: 4, may: 4,
        jun: 5, juni: 5,
        jul: 6, juli: 6,
        agu: 7, ags: 7, agustus: 7, aug: 7,
        sep: 8, sept: 8, september: 8,
        okt: 9, oktober: 9, oct: 9,
        nov: 10, november: 10,
        des: 11, desember: 11, dec: 11,
      };

      const month = idMonths[mStr];
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return { year, month, day };
      }
    }
    return null;
  };

  const parseTimestamp = (dateStr?: string, fallbackId = 0): number => {
    const parts = parseToDateParts(dateStr);
    if (parts) {
      return new Date(parts.year, parts.month, parts.day).getTime() + (Number(fallbackId) || 0);
    }
    return Number(fallbackId) || 0;
  };

  interface PlayerMatchRecord {
    timestamp: number;
    matchId: string | number;
    date: string;
    score: number;
    medal: string;
    hero: string;
    result: 'VICTORY' | 'DEFEAT' | '-';
  }

  const playerRecords: PlayerMatchRecord[] = [];

  // 1. Collect from live matches
  for (const m of matches) {
    const pohonRoster = m.pohon || [];
    const lobbyRoster = m.lobby || [];
    const inPohon = pohonRoster.find((p) => p.player_name.toLowerCase() === normName);
    const inLobby = lobbyRoster.find((p) => p.player_name.toLowerCase() === normName);
    const playerDetail = inPohon || inLobby;

    if (playerDetail) {
      const isWinner =
        (Boolean(inPohon) && m.winner === 'Tim Pohon') ||
        (Boolean(inLobby) && m.winner === 'Tim Lobby');

      const scoreVal =
        typeof playerDetail.score === 'number' && !isNaN(playerDetail.score) && playerDetail.score > 0
          ? playerDetail.score
          : playerDetail.medal === 'MVP'
          ? 10.0
          : playerDetail.medal === 'Gold'
          ? 8.5
          : playerDetail.medal === 'Silver'
          ? 6.5
          : 4.0;

      playerRecords.push({
        timestamp: parseTimestamp(m.date, Number(m.id) || 0),
        matchId: m.id,
        date: m.date || 'Laga Amal',
        score: scoreVal,
        medal: playerDetail.medal,
        hero: playerDetail.hero_name || '',
        result: isWinner ? 'VICTORY' : 'DEFEAT',
      });
    }
  }

  // 2. Fallback to season matchRows if no live matches recorded for this player
  if (playerRecords.length === 0 && season?.matchRows && season.matchRows.length > 0) {
    for (const r of season.matchRows) {
      if (r.nickname.toLowerCase() === normName) {
        const medal = r.mvp ? 'MVP' : r.antam ? 'Gold' : r.silver ? 'Silver' : 'Coklat';
        const scoreVal =
          typeof r.score === 'number' && !isNaN(r.score) && r.score > 0
            ? r.score
            : r.mvp
            ? 10.0
            : r.antam
            ? 8.5
            : r.silver
            ? 6.5
            : 4.0;

        playerRecords.push({
          timestamp: parseTimestamp(r.date, 0),
          matchId: r.id || 'row',
          date: r.date || 'Laga Amal',
          score: scoreVal,
          medal,
          hero: r.hero || '',
          result: r.result || (r.mvp || r.antam ? 'VICTORY' : 'DEFEAT'),
        });
      }
    }
  }

  if (playerRecords.length === 0) {
    return [];
  }

  // Sort chronologically (oldest to newest)
  playerRecords.sort((a, b) => a.timestamp - b.timestamp);

  // Take the most recent `maxMatches` (default: 10 matches)
  const recentRecords = playerRecords.slice(-maxMatches);

  return recentRecords.map((rec, idx) => {
    const matchNum = idx + 1;
    const cleanScore = parseFloat(rec.score.toFixed(1));
    const medalLabel =
      rec.medal === 'MVP'
        ? '👑 MVP'
        : rec.medal === 'Gold' || rec.medal === 'Antam'
        ? '🥇 Antam'
        : rec.medal === 'Silver'
        ? '🥈 Silver'
        : '🍫 Coklat';

    const resultLabel = rec.result === 'VICTORY' ? '🏆 Menang' : 'Kalah';
    const detailStr = `${medalLabel} (${cleanScore}) · ${rec.hero || 'Hero'} · ${resultLabel}`;

    return {
      label: `M${matchNum}`,
      fullLabel: `Match #${matchNum}`,
      date: rec.date,
      rating: cleanScore,
      score: cleanScore,
      detail: detailStr,
      matchesCount: 1,
      hasMatch: true,
      matchIndex: matchNum,
      hero: rec.hero,
      medal: rec.medal,
      result: rec.result,
      matchId: rec.matchId,
    };
  });
}

// Sort for "Kelas Semen" leaderboard:
// Prioritizes MVP, then lowest Coklat, then score
export function sortKelasSemen(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.medals.MVP !== a.medals.MVP) {
      return b.medals.MVP - a.medals.MVP;
    }
    if (a.medals.Coklat !== b.medals.Coklat) {
      return a.medals.Coklat - b.medals.Coklat; // least Coklat wins tie
    }
    return (b.score || 0) - (a.score || 0);
  });
}
