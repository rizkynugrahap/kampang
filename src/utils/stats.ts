import { Match, Player, TopHeroStat } from '../types';

export function getPlayerTopHeroes(playerName: string, matches: Match[]): TopHeroStat[] {
  const heroMap: Record<
    string,
    { games: number; mvp: number; gold: number; silver: number; coklat: number }
  > = {};

  for (const match of matches) {
    const allRoster = [...match.pohon, ...match.lobby];
    for (const p of allRoster) {
      if (p.player_name.toLowerCase() === playerName.toLowerCase()) {
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

  // If match history is short for this player, fallback to predefined signature heroes
  if (list.length === 0) {
    const fallbackSignatures: Record<string, TopHeroStat[]> = {
      Mandor: [
        { hero: 'Kadita', games: 12, mvpCount: 10, mvpRate: 83, goldCount: 2, silverCount: 0, coklatCount: 0 },
        { hero: 'Lesley', games: 9, mvpCount: 5, mvpRate: 55, goldCount: 3, silverCount: 1, coklatCount: 0 },
        { hero: 'Estes', games: 7, mvpCount: 2, mvpRate: 28, goldCount: 4, silverCount: 1, coklatCount: 0 },
      ],
      Kelung: [
        { hero: 'Moskov', games: 14, mvpCount: 7, mvpRate: 50, goldCount: 5, silverCount: 2, coklatCount: 0 },
        { hero: 'Estes', games: 10, mvpCount: 4, mvpRate: 40, goldCount: 4, silverCount: 2, coklatCount: 0 },
        { hero: 'Chou', games: 6, mvpCount: 1, mvpRate: 17, goldCount: 2, silverCount: 1, coklatCount: 2 },
      ],
      Gil: [
        { hero: 'Masha', games: 11, mvpCount: 5, mvpRate: 45, goldCount: 4, silverCount: 2, coklatCount: 0 },
        { hero: 'Franco', games: 8, mvpCount: 2, mvpRate: 25, goldCount: 3, silverCount: 2, coklatCount: 1 },
        { hero: 'Chou', games: 5, mvpCount: 1, mvpRate: 20, goldCount: 1, silverCount: 2, coklatCount: 1 },
      ],
      Ven: [
        { hero: 'Yve', games: 9, mvpCount: 1, mvpRate: 11, goldCount: 2, silverCount: 3, coklatCount: 3 },
        { hero: 'Hylos', games: 7, mvpCount: 1, mvpRate: 14, goldCount: 2, silverCount: 2, coklatCount: 2 },
        { hero: 'Franco', games: 6, mvpCount: 0, mvpRate: 0, goldCount: 1, silverCount: 2, coklatCount: 3 },
      ],
      Hees: [
        { hero: 'Gusion', games: 10, mvpCount: 4, mvpRate: 40, goldCount: 3, silverCount: 2, coklatCount: 1 },
        { hero: 'Hylos', games: 9, mvpCount: 2, mvpRate: 22, goldCount: 4, silverCount: 2, coklatCount: 1 },
        { hero: 'Lesley', games: 4, mvpCount: 1, mvpRate: 25, goldCount: 1, silverCount: 1, coklatCount: 1 },
      ],
      Doni: [
        { hero: 'Franco', games: 8, mvpCount: 1, mvpRate: 12, goldCount: 2, silverCount: 2, coklatCount: 3 },
        { hero: 'Lesley', games: 6, mvpCount: 1, mvpRate: 16, goldCount: 2, silverCount: 1, coklatCount: 2 },
        { hero: 'Chou', games: 5, mvpCount: 0, mvpRate: 0, goldCount: 1, silverCount: 2, coklatCount: 2 },
      ],
    };

    return fallbackSignatures[playerName] || [
      { hero: 'Tigreal', games: 5, mvpCount: 1, mvpRate: 20, goldCount: 2, silverCount: 1, coklatCount: 1 },
      { hero: 'Miya', games: 4, mvpCount: 1, mvpRate: 25, goldCount: 1, silverCount: 1, coklatCount: 1 },
      { hero: 'Nana', games: 3, mvpCount: 0, mvpRate: 0, goldCount: 1, silverCount: 1, coklatCount: 1 },
    ];
  }

  return list.slice(0, 3);
}

// Calculate weekly or match performance trends for a player
// Formula from prompt: MVP=3, Gold=2, Silver=1, Coklat=0
export function getPlayerPerformanceTrend(playerName: string, matches: Match[]) {
  // Check match appearances
  const playerMatches = matches
    .filter((m) =>
      [...m.pohon, ...m.lobby].some(
        (p) => p.player_name.toLowerCase() === playerName.toLowerCase()
      )
    )
    .reverse(); // chronological

  if (playerMatches.length >= 3) {
    return playerMatches.map((m, idx) => {
      const roster = [...m.pohon, ...m.lobby].find(
        (p) => p.player_name.toLowerCase() === playerName.toLowerCase()
      );
      let pts = 1;
      if (roster?.medal === 'MVP') pts = 3;
      else if (roster?.medal === 'Gold') pts = 2;
      else if (roster?.medal === 'Silver') pts = 1;
      else if (roster?.medal === 'Coklat') pts = 0;

      return {
        label: `M${idx + 1}`,
        score: pts,
        detail: `${roster?.medal} (${roster?.hero_name})`,
      };
    });
  }

  // Pre-seeded weekly trend progression
  const seedTrends: Record<string, number[]> = {
    Mandor: [3, 2, 3, 2, 3, 3],
    Kelung: [2, 3, 1, 2, 3, 1],
    Gil: [1, 2, 2, 3, 1, 2],
    Ven: [1, 0, 1, 0, 2, 0],
    Hees: [1, 2, 1, 3, 2, 2],
    Doni: [0, 1, 1, 0, 2, 0],
  };

  const trend = seedTrends[playerName] || [1, 2, 1, 2, 2, 1];
  return trend.map((val, idx) => ({
    label: `Mgg ${idx + 1}`,
    score: val,
    detail: val === 3 ? 'MVP' : val === 2 ? 'Gold' : val === 1 ? 'Silver' : 'Coklat',
  }));
}

// Sort for "Kelas Semen" leaderboard
// (1) MVP terbanyak di atas
// (2) Tie-breaker: Coklat tersedikit
export function sortKelasSemen(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.medals.MVP !== a.medals.MVP) {
      return b.medals.MVP - a.medals.MVP;
    }
    if (a.medals.Coklat !== b.medals.Coklat) {
      return a.medals.Coklat - b.medals.Coklat; // least Coklat wins tie
    }
    return b.medals.Gold - a.medals.Gold;
  });
}
