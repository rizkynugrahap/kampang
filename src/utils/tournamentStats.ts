import { Match, Player, TournamentData, TournamentPlayerStanding, TeamShort } from '../types';

export function calculateTournamentPlayerStandings(
  players: Player[],
  matches: Match[]
): TournamentPlayerStanding[] {
  // We can calculate points: MVP = 3, Gold = 2, Silver = 1, Coklat = 0
  return players
    .map((p) => {
      // Find matches in which this player participated
      const playerTeam: TeamShort =
        p.name === 'Mandor' || p.name === 'Kelung' || p.name === 'Gil'
          ? 'Pohon'
          : 'Lobby';

      const points =
        p.medals.MVP * 3 +
        p.medals.Gold * 2 +
        p.medals.Silver * 1;

      return {
        playerName: p.name,
        team: playerTeam,
        tier: p.tier,
        played: p.total_match,
        mvp: p.medals.MVP,
        gold: p.medals.Gold,
        silver: p.medals.Silver,
        coklat: p.medals.Coklat,
        points,
      };
    })
    .sort((a, b) => b.points - a.points || b.mvp - a.mvp || a.coklat - b.coklat);
}

export function getTournamentSummaryStats(tournament: TournamentData) {
  const totalMatches = tournament.fixtures.length;
  const completedMatches = tournament.fixtures.filter((f) => f.status === 'Selesai').length;
  const topTeam = tournament.standings[0];
  const totalGamesPlayed = tournament.standings.reduce((acc, curr) => acc + curr.gameWins, 0);

  return {
    totalMatches,
    completedMatches,
    topTeam,
    totalGamesPlayed,
  };
}
