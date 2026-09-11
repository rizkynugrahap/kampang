export type Medal = 'MVP' | 'Gold' | 'Silver' | 'Coklat';

export type TeamName = 'Tim Pohon' | 'Tim Lobby';
export type TeamShort = 'Pohon' | 'Lobby';

export type PlayerStatus = 'Aktif' | 'Cabutan';

export type HeroRole = 'Mage' | 'Marksman' | 'Fighter' | 'Tank' | 'Assassin' | 'Support';

export interface PlayerMedals {
  MVP: number;
  Gold: number;
  Silver: number;
  Coklat: number;
}

export interface Player {
  id: number | string;
  name: string;
  status: PlayerStatus;
  tier: string;
  total_match: number;
  medals: PlayerMedals;
}

export interface Hero {
  id: number | string;
  name: string;
  role_primary: HeroRole;
  role_secondary?: HeroRole | '';
}

export interface MatchPlayerDetail {
  id?: string;
  player_id: number | string;
  player_name: string;
  hero_id?: number | string;
  hero_name: string;
  team: TeamShort;
  medal: Medal;
}

export type MatchType = 'Laga Amal' | 'Ranked' | 'Turnamen';

export interface Match {
  id: number;
  date: string;
  season: string;
  winner: TeamName;
  type: MatchType;
  tournament_stage?: string;
  ai_analysis?: string;
  is_generating_analysis?: boolean;
  pohon: MatchPlayerDetail[];
  lobby: MatchPlayerDetail[];
}

export interface TopHeroStat {
  hero: string;
  games: number;
  mvpCount: number;
  mvpRate: number;
  goldCount: number;
  silverCount: number;
  coklatCount: number;
}

export interface TournamentTeamStanding {
  id: string;
  name: string;
  shortName: string;
  color: string;
  played: number;
  won: number;
  lost: number;
  points: number; // Menang: +3, Kalah: 0
  gameWins: number;
  gameLosses: number;
  mvpCount: number;
  goldCount: number;
  silverCount: number;
  coklatCount: number;
  streak: string;
  form: ('W' | 'L')[];
  members?: string[];
  slogan?: string;
}

export interface TournamentPlayerStanding {
  playerName: string;
  team: TeamShort;
  tier: string;
  played: number;
  mvp: number;
  gold: number;
  silver: number;
  coklat: number;
  points: number;
}

export interface TournamentFixture {
  id: string;
  round: string;
  date: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  status: 'Selesai' | 'Live' | 'Mendatang';
  winner?: string;
  matchId?: number;
}

export interface TournamentData {
  id: string;
  name: string;
  season: string;
  status: 'Sedang Berjalan' | 'Selesai';
  format: string;
  prizePool: string;
  standings: TournamentTeamStanding[];
  fixtures: TournamentFixture[];
  ai_recap?: string;
}
