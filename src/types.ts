export type Medal = 'MVP' | 'Gold' | 'Silver' | 'Coklat';

export const MLBB_TIER_OPTIONS = [
  'Warrior',
  'Elite',
  'Master',
  'Grandmaster',
  'Epic',
  'Legend',
  'Mythic',
  'Mythical Honor',
  'Mythical Glory',
  'Mythical Immortal',
] as const;

export type MLBBTier = typeof MLBB_TIER_OPTIONS[number];

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
  avatar_url?: string;
  score?: number; // Total season score
  avgScore?: number;
  winRate?: number;
  julukan?: string;
  julukan_updated_at?: string;
}

export interface Hero {
  id: number | string;
  name: string;
  role_primary: HeroRole;
  role_secondary?: HeroRole | '';
  avatar_url?: string;
}

export interface MatchPlayerDetail {
  id?: string;
  player_id: number | string;
  player_name: string;
  hero_id?: number | string;
  hero_name: string;
  team: TeamShort;
  medal: Medal;
  score?: number; // Match rating score (e.g. 9.5, 7.8)
}

export type MatchType = 'Laga Amal' | 'Ranked';

export interface Match {
  id: number;
  matchNumber?: number;
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

// Laga Amal Season Types
export interface LagaAmalPlayerStat {
  nickname: string;
  coklat: number;
  silver: number;
  antam: number; // Gold / Antam
  mvp: number;
  matches: number; // Count of Ikut Main
  score: number; // Sum of Score
  winRate: number; // e.g. 78.95
  avgScore: number; // e.g. 8.65
  avatar_url?: string;
  status?: PlayerStatus;
  tier?: string;
  julukan?: string;
  julukan_updated_at?: string;
}

export interface LagaAmalHeroPick {
  player: string;
  hero: string;
  coklat: number;
  silver: number;
  antam: number;
  mvp: number;
  total: number;
}

export interface LagaAmalHeroPoolItem {
  hero: string;
  picked: number;
}

export interface LagaAmalMatchRow {
  id: string;
  date: string;
  nickname: string;
  hero: string;
  coklat: number;
  silver: number;
  antam: number;
  mvp: number;
  result: 'VICTORY' | 'DEFEAT';
  rating: string;
  score: number;
  winRate: number;
  count: number;
}

export interface UserHeroPercentage {
  heroName: string;
  percentage: number;
}

export interface HeroPickByUser {
  user: string;
  heroes: UserHeroPercentage[];
}

export interface HeroPoolItem {
  heroName: string;
  timesPicked: number;
  percentage: number;
  hero?: string;
  picked?: number;
}

export interface LagaAmalMatchLog {
  matchNumber: number;
  date: string;
  winner: string;
  pohonMvp?: string;
  lobbyMvp?: string;
}

export interface LagaAmalSeasonData {
  id: string;
  title: string;
  dateStr: string;
  activePlayersCount: number;
  isActive?: boolean;
  topCoklat: { player: string; count: number };
  topSilver: { player: string; count: number };
  topAntam: { player: string; count: number };
  topMvp: { player: string; count: number };
  totalMatches?: number;
  totalMatchesRecorded?: number;
  totalScore?: number;
  totalScoreAccumulated?: number;
  avgWinRateTotal?: number;
  averageWinRate?: number;
  avgScoreTotal?: number;
  averageScore?: number;
  players: LagaAmalPlayerStat[];
  heroPicksByUser?: LagaAmalHeroPick[];
  heroPicks?: HeroPickByUser[];
  heroPool?: any[];
  matchRows?: LagaAmalMatchRow[];
  matchLogs?: LagaAmalMatchLog[];
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[]; // names of players who reacted
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderTier?: string;
  senderJulukan?: string;
  content: string;
  createdAt: string; // ISO string
  timestamp: number;
  isSystem?: boolean;
  systemType?: 'match_result' | 'announcement' | 'player_joined';
  matchData?: {
    matchId: string | number;
    seasonName?: string;
    winner: string;
    scorePohon?: number;
    scoreLobby?: number;
    mvpPlayer?: string;
    mvpHero?: string;
  };
  mentions?: string[];
  reactions?: Record<string, ChatReaction>;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
}

export interface PlayerAuthSession {
  playerId: string | number;
  playerName: string;
  avatar_url?: string;
  tier?: string;
  julukan?: string;
  isLoggedIn: boolean;
}

