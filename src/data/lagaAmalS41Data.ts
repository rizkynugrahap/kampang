import { LagaAmalSeasonData, LagaAmalPlayerStat, LagaAmalHeroPick, LagaAmalHeroPoolItem, LagaAmalMatchRow } from '../types';

export const INITIAL_S41_PLAYERS: LagaAmalPlayerStat[] = [
  { nickname: 'LAH MANDOOR', coklat: 2, silver: 18, antam: 36, mvp: 23, matches: 79, score: 680.8, winRate: 64.56, avgScore: 8.62 },
  { nickname: 'Dignityzed', coklat: 2, silver: 14, antam: 37, mvp: 23, matches: 76, score: 657.1, winRate: 78.95, avgScore: 8.65 },
  { nickname: 'POCONG JEPRIE', coklat: 4, silver: 25, antam: 35, mvp: 14, matches: 78, score: 594.2, winRate: 35.90, avgScore: 7.62 },
  { nickname: 'Hees', coklat: 2, silver: 16, antam: 36, mvp: 19, matches: 73, score: 592.3, winRate: 39.73, avgScore: 8.11 },
  { nickname: 'YY', coklat: 4, silver: 28, antam: 31, mvp: 14, matches: 77, score: 571.5, winRate: 54.55, avgScore: 7.42 },
  { nickname: 'Mr. GiL', coklat: 2, silver: 36, antam: 25, mvp: 13, matches: 76, score: 558.4, winRate: 48.68, avgScore: 7.35 },
  { nickname: 'irvantaufiq12', coklat: 8, silver: 37, antam: 24, mvp: 6, matches: 75, score: 474.1, winRate: 40.00, avgScore: 6.32 },
  { nickname: 'Mr P Jay', coklat: 2, silver: 26, antam: 22, mvp: 4, matches: 54, score: 378.6, winRate: 53.70, avgScore: 7.01 },
  { nickname: 'Bau Bandeng !', coklat: 3, silver: 22, antam: 15, mvp: 10, matches: 50, score: 363.6, winRate: 40.00, avgScore: 7.27 },
  { nickname: 'abcdeppp', coklat: 4, silver: 23, antam: 20, mvp: 5, matches: 52, score: 349.7, winRate: 55.77, avgScore: 6.73 },
  { nickname: 'Portgas', coklat: 1, silver: 18, antam: 18, mvp: 7, matches: 44, score: 321.6, winRate: 31.82, avgScore: 7.31 },
  { nickname: 'KELUNG', coklat: 2, silver: 14, antam: 9, mvp: 4, matches: 29, score: 203.6, winRate: 44.83, avgScore: 7.02 },
  { nickname: 'Midzy', coklat: 1, silver: 3, antam: 7, mvp: 6, matches: 17, score: 140.4, winRate: 52.94, avgScore: 8.26 },
  { nickname: 'Blackpink', coklat: 1, silver: 2, antam: 1, mvp: 3, matches: 7, score: 48.2, winRate: 28.57, avgScore: 6.89 },
];

export const INITIAL_S41_HERO_PICKS: LagaAmalHeroPick[] = [
  // abcdeppp
  { player: 'abcdeppp', hero: 'Balmond', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Belerick', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Claude', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Gatotkaca', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Gord', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Harley', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Hayabusa', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Hilda', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Hirara', coklat: 1, silver: 1, antam: 0, mvp: 0, total: 2 },
  { player: 'abcdeppp', hero: 'Nana', coklat: 0, silver: 0, antam: 1, mvp: 1, total: 2 },
  { player: 'abcdeppp', hero: 'Paquito', coklat: 0, silver: 2, antam: 3, mvp: 0, total: 5 },
  { player: 'abcdeppp', hero: 'Sora', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Zilong', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Granger', coklat: 0, silver: 1, antam: 1, mvp: 0, total: 2 },
  { player: 'abcdeppp', hero: 'X-Borg', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Pharsa', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Barats', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Atlas', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Melissa', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Kagura', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'abcdeppp', hero: 'Layla', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Yin Shun Shin', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Saber', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Gusion', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Benedetta', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Julian', coklat: 0, silver: 1, antam: 1, mvp: 1, total: 3 },
  { player: 'abcdeppp', hero: 'Yu Zhong', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Lylia', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Lancelot', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Ixia', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Vexana', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Miya', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Kalea', coklat: 0, silver: 1, antam: 2, mvp: 1, total: 4 },
  { player: 'abcdeppp', hero: 'Khaleed', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Bane', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Ruby', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Estes', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'abcdeppp', hero: 'Diggie', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'abcdeppp', hero: 'Lolita', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },

  // Bau Bandeng !
  { player: 'Bau Bandeng !', hero: 'Arlott', coklat: 0, silver: 3, antam: 0, mvp: 0, total: 3 },
  { player: 'Bau Bandeng !', hero: 'Fanny', coklat: 0, silver: 0, antam: 1, mvp: 1, total: 2 },
  { player: 'Bau Bandeng !', hero: 'Guinevere', coklat: 1, silver: 1, antam: 2, mvp: 2, total: 6 },
  { player: 'Bau Bandeng !', hero: 'Harley', coklat: 0, silver: 5, antam: 0, mvp: 1, total: 6 },
  { player: 'Bau Bandeng !', hero: 'Hayabusa', coklat: 0, silver: 1, antam: 1, mvp: 1, total: 3 },
  { player: 'Bau Bandeng !', hero: 'Helcurt', coklat: 1, silver: 0, antam: 0, mvp: 2, total: 3 },
  { player: 'Bau Bandeng !', hero: 'Ling', coklat: 0, silver: 3, antam: 0, mvp: 0, total: 3 },
  { player: 'Bau Bandeng !', hero: 'Selena', coklat: 0, silver: 5, antam: 3, mvp: 0, total: 8 },
  { player: 'Bau Bandeng !', hero: 'Kadita', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'Bau Bandeng !', hero: 'Chou', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Bau Bandeng !', hero: 'Nolan', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'Bau Bandeng !', hero: 'Joy', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Bau Bandeng !', hero: 'Pharsa', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Bau Bandeng !', hero: 'Gusion', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'Bau Bandeng !', hero: 'Lancelot', coklat: 0, silver: 0, antam: 2, mvp: 1, total: 3 },
  { player: 'Bau Bandeng !', hero: 'Yi Sun-Shin', coklat: 0, silver: 2, antam: 1, mvp: 2, total: 5 },

  // Blackpink
  { player: 'Blackpink', hero: 'Akai', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Blackpink', hero: 'Brody', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'Blackpink', hero: 'Hilda', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Blackpink', hero: 'Melissa', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Blackpink', hero: 'Zhask', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Blackpink', hero: 'Cyclops', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Blackpink', hero: 'Miya', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },

  // Dignityzed
  { player: 'Dignityzed', hero: 'Akai', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Claude', coklat: 0, silver: 0, antam: 3, mvp: 1, total: 4 },
  { player: 'Dignityzed', hero: 'Franco', coklat: 0, silver: 1, antam: 0, mvp: 2, total: 3 },
  { player: 'Dignityzed', hero: 'Gord', coklat: 0, silver: 0, antam: 3, mvp: 5, total: 8 },
  { player: 'Dignityzed', hero: 'Helcurt', coklat: 0, silver: 5, antam: 4, mvp: 0, total: 9 },
  { player: 'Dignityzed', hero: 'Minsitthar', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Silvana', coklat: 0, silver: 4, antam: 8, mvp: 0, total: 12 },
  { player: 'Dignityzed', hero: 'Zetian', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Kadita', coklat: 0, silver: 0, antam: 1, mvp: 1, total: 2 },
  { player: 'Dignityzed', hero: 'Johnson', coklat: 0, silver: 0, antam: 0, mvp: 4, total: 4 },
  { player: 'Dignityzed', hero: 'Granger', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Novaria', coklat: 0, silver: 0, antam: 6, mvp: 7, total: 13 },
  { player: 'Dignityzed', hero: 'Jawhead', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Dignityzed', hero: 'Pharsa', coklat: 1, silver: 0, antam: 1, mvp: 0, total: 2 },
  { player: 'Dignityzed', hero: 'Obsidia', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'Dignityzed', hero: 'Clint', coklat: 0, silver: 0, antam: 1, mvp: 1, total: 2 },
  { player: 'Dignityzed', hero: 'Lancelot', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Ixia', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Wanwan', coklat: 0, silver: 0, antam: 3, mvp: 0, total: 3 },
  { player: 'Dignityzed', hero: 'Alpha', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Eudora', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Moskov', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Harith', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'Dignityzed', hero: 'Ruby', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },

  // Hees
  { player: 'Hees', hero: 'Sun', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Akai', coklat: 0, silver: 0, antam: 2, mvp: 1, total: 3 },
  { player: 'Hees', hero: 'Arlott', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Balmond', coklat: 0, silver: 1, antam: 0, mvp: 1, total: 2 },
  { player: 'Hees', hero: 'Belerick', coklat: 0, silver: 0, antam: 2, mvp: 2, total: 4 },
  { player: 'Hees', hero: 'Fanny', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Gatotkaca', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Harley', coklat: 0, silver: 1, antam: 2, mvp: 0, total: 3 },
  { player: 'Hees', hero: 'Helcurt', coklat: 0, silver: 0, antam: 3, mvp: 0, total: 3 },
  { player: 'Hees', hero: 'Hilda', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Hirara', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Ling', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Lunox', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Nana', coklat: 0, silver: 0, antam: 1, mvp: 2, total: 3 },
  { player: 'Hees', hero: 'Selena', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Silvana', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Sora', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Tigreal', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Zetian', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Zilong', coklat: 0, silver: 2, antam: 0, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Kadita', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Chou', coklat: 0, silver: 1, antam: 1, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Jawhead', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Barats', coklat: 0, silver: 1, antam: 1, mvp: 2, total: 4 },
  { player: 'Hees', hero: 'Atlas', coklat: 0, silver: 1, antam: 1, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Angela', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Melissa', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Mathilda', coklat: 0, silver: 1, antam: 1, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Kimmy', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Badang', coklat: 0, silver: 0, antam: 0, mvp: 3, total: 3 },
  { player: 'Hees', hero: 'Kaja', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Yu Zhong', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Cyclops', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Karina', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Vexana', coklat: 0, silver: 1, antam: 1, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Alpha', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'Hees', hero: 'Eudora', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Esmeralda', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Kalea', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Aurora', coklat: 0, silver: 0, antam: 1, mvp: 1, total: 2 },
  { player: 'Hees', hero: 'Luo Yi', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Marcel', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Martis', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Terizla', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'Hees', hero: 'Freya', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Fredrin', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'Hees', hero: 'Cici', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },

  // LAH MANDOOR
  { player: 'LAH MANDOOR', hero: 'Belerick', coklat: 0, silver: 1, antam: 8, mvp: 3, total: 12 },
  { player: 'LAH MANDOOR', hero: 'Zetian', coklat: 0, silver: 1, antam: 5, mvp: 3, total: 9 },
  { player: 'LAH MANDOOR', hero: 'Atlas', coklat: 0, silver: 0, antam: 5, mvp: 3, total: 8 },
  { player: 'LAH MANDOOR', hero: 'Cyclops', coklat: 0, silver: 0, antam: 0, mvp: 5, total: 5 },
  { player: 'LAH MANDOOR', hero: 'Helcurt', coklat: 0, silver: 4, antam: 0, mvp: 1, total: 5 },
  { player: 'LAH MANDOOR', hero: 'Hayabusa', coklat: 0, silver: 2, antam: 1, mvp: 0, total: 3 },
  { player: 'LAH MANDOOR', hero: 'Chang\'e', coklat: 0, silver: 1, antam: 2, mvp: 0, total: 3 },
  { player: 'LAH MANDOOR', hero: 'Novaria', coklat: 0, silver: 1, antam: 1, mvp: 1, total: 3 },
  { player: 'LAH MANDOOR', hero: 'Odette', coklat: 0, silver: 0, antam: 1, mvp: 2, total: 3 },
  { player: 'LAH MANDOOR', hero: 'Vexana', coklat: 0, silver: 1, antam: 1, mvp: 1, total: 3 },
  { player: 'LAH MANDOOR', hero: 'Dyrroth', coklat: 0, silver: 1, antam: 1, mvp: 1, total: 3 },
  { player: 'LAH MANDOOR', hero: 'Claude', coklat: 1, silver: 0, antam: 0, mvp: 1, total: 2 },
  { player: 'LAH MANDOOR', hero: 'Irithel', coklat: 1, silver: 0, antam: 0, mvp: 1, total: 2 },
  { player: 'LAH MANDOOR', hero: 'Kadita', coklat: 0, silver: 1, antam: 1, mvp: 0, total: 2 },
  { player: 'LAH MANDOOR', hero: 'Eudora', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'LAH MANDOOR', hero: 'Bruno', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Franco', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Selena', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Silvana', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Chou', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Nolan', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Granger', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Nathan', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Argus', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Clint', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Luo Yi', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Uranus', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Minotaur', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'LAH MANDOOR', hero: 'Gloo', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },

  // POCONG JEPRIE
  { player: 'POCONG JEPRIE', hero: 'Fanny', coklat: 0, silver: 4, antam: 4, mvp: 4, total: 12 },
  { player: 'POCONG JEPRIE', hero: 'Ling', coklat: 0, silver: 3, antam: 5, mvp: 3, total: 11 },
  { player: 'POCONG JEPRIE', hero: 'Claude', coklat: 0, silver: 3, antam: 2, mvp: 0, total: 5 },
  { player: 'POCONG JEPRIE', hero: 'Chou', coklat: 1, silver: 0, antam: 3, mvp: 1, total: 5 },
  { player: 'POCONG JEPRIE', hero: 'Kadita', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'POCONG JEPRIE', hero: 'Granger', coklat: 0, silver: 0, antam: 1, mvp: 1, total: 2 },
  { player: 'POCONG JEPRIE', hero: 'Cecilion', coklat: 0, silver: 0, antam: 2, mvp: 0, total: 2 },
  { player: 'POCONG JEPRIE', hero: 'Brody', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Balmond', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Guinevere', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Harley', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Nana', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Selena', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Zetian', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Zilong', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Carmilla', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Jawhead', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Kagura', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Layla', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Xavier', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Saber', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Gusion', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Kaja', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Julian', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Clint', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Lylia', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Lancelot', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Ixia', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Karina', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Vexana', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Lapu-Lapu', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Miya', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Eudora', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Kalea', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Vale', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Moskov', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Grock', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Yi Sun-Shin', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Estes', coklat: 1, silver: 0, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Irithel', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Martis', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Valentina', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Khufra', coklat: 0, silver: 0, antam: 0, mvp: 1, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Aamon', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Alice', coklat: 0, silver: 0, antam: 1, mvp: 0, total: 1 },
  { player: 'POCONG JEPRIE', hero: 'Yve', coklat: 0, silver: 1, antam: 0, mvp: 0, total: 1 },
];

export const INITIAL_S41_HERO_POOL: LagaAmalHeroPoolItem[] = [
  { hero: 'Novaria', picked: 27 },
  { hero: 'Selena', picked: 27 },
  { hero: 'Franco', picked: 25 },
  { hero: 'Helcurt', picked: 25 },
  { hero: 'Belerick', picked: 21 },
  { hero: 'Nana', picked: 17 },
  { hero: 'Harley', picked: 15 },
  { hero: 'Claude', picked: 14 },
  { hero: 'Silvana', picked: 14 },
  { hero: 'Fanny', picked: 13 },
  { hero: 'Ling', picked: 13 },
  { hero: 'Guinevere', picked: 12 },
  { hero: 'Zetian', picked: 12 },
  { hero: 'Hayabusa', picked: 10 },
  { hero: 'Atlas', picked: 10 },
  { hero: 'Chou', picked: 10 },
  { hero: 'Sun', picked: 9 },
  { hero: 'Zilong', picked: 9 },
  { hero: 'Gord', picked: 9 },
  { hero: 'Paquito', picked: 9 },
  { hero: 'Tigreal', picked: 9 },
  { hero: 'Lesley', picked: 8 },
  { hero: 'Hanzo', picked: 8 },
  { hero: 'Cyclops', picked: 8 },
  { hero: 'Bruno', picked: 7 },
  { hero: 'Akai', picked: 7 },
  { hero: 'Balmond', picked: 7 },
  { hero: 'Barats', picked: 7 },
  { hero: 'Vexana', picked: 7 },
  { hero: 'Eudora', picked: 7 },
  { hero: 'Kaja', picked: 7 },
  { hero: 'Carmilla', picked: 6 },
  { hero: 'Kadita', picked: 6 },
  { hero: 'Gatotkaca', picked: 6 },
  { hero: 'Hanabi', picked: 6 },
  { hero: 'Jawhead', picked: 6 },
  { hero: 'Johnson', picked: 6 },
  { hero: 'Obsidia', picked: 6 },
  { hero: 'Yi Sun-Shin', picked: 6 },
  { hero: 'Dyrroth', picked: 6 },
  { hero: 'Arlott', picked: 5 },
  { hero: 'Odette', picked: 5 },
  { hero: 'Julian', picked: 5 },
  { hero: 'Kalea', picked: 5 },
  { hero: 'Lapu-Lapu', picked: 5 },
  { hero: 'Brody', picked: 4 },
  { hero: 'Saber', picked: 4 },
  { hero: 'Kimmy', picked: 4 },
  { hero: 'Melissa', picked: 4 },
  { hero: 'Badang', picked: 4 },
  { hero: 'Alpha', picked: 4 },
  { hero: 'Miya', picked: 4 },
  { hero: 'Moskov', picked: 4 },
  { hero: 'Wanwan', picked: 4 },
  { hero: 'Chang\'e', picked: 4 },
  { hero: 'Lylia', picked: 4 },
  { hero: 'Lancelot', picked: 4 },
  { hero: 'Granger', picked: 3 },
  { hero: 'Hilda', picked: 3 },
  { hero: 'Hirara', picked: 3 },
  { hero: 'Lunox', picked: 3 },
  { hero: 'Mathilda', picked: 3 },
  { hero: 'Gusion', picked: 3 },
  { hero: 'Pharsa', picked: 3 },
  { hero: 'Clint', picked: 3 },
  { hero: 'Xavier', picked: 3 },
  { hero: 'Yu Zhong', picked: 3 },
  { hero: 'Irithel', picked: 3 },
  { hero: 'Argus', picked: 3 },
  { hero: 'Ixia', picked: 3 },
  { hero: 'Lukas', picked: 2 },
  { hero: 'Sora', picked: 2 },
  { hero: 'Karina', picked: 2 },
  { hero: 'Layla', picked: 2 },
  { hero: 'Kagura', picked: 2 },
  { hero: 'Angela', picked: 2 },
  { hero: 'Cecilion', picked: 2 },
  { hero: 'Luo Yi', picked: 2 },
  { hero: 'Aurora', picked: 2 },
  { hero: 'Esmeralda', picked: 2 },
  { hero: 'Vale', picked: 2 },
  { hero: 'Aamon', picked: 2 },
  { hero: 'Alice', picked: 2 },
  { hero: 'Minsitthar', picked: 1 },
  { hero: 'X-Borg', picked: 1 },
  { hero: 'Joy', picked: 1 },
  { hero: 'Nolan', picked: 1 },
  { hero: 'Edith', picked: 1 },
  { hero: 'Natalia', picked: 1 },
  { hero: 'Zhask', picked: 1 },
  { hero: 'Suyou', picked: 1 },
  { hero: 'Thamuz', picked: 1 },
  { hero: 'Aldous', picked: 1 },
  { hero: 'Alucard', picked: 1 },
  { hero: 'Khaleed', picked: 1 },
  { hero: 'Leomord', picked: 1 },
  { hero: 'Masha', picked: 1 },
  { hero: 'Valir', picked: 1 },
  { hero: 'Yin', picked: 1 },
  { hero: 'Grock', picked: 1 },
  { hero: 'Estes', picked: 1 },
  { hero: 'Martis', picked: 1 },
  { hero: 'Valentina', picked: 1 },
  { hero: 'Khufra', picked: 1 },
  { hero: 'Yve', picked: 1 },
  { hero: 'Chips', picked: 1 },
  { hero: 'Karrie', picked: 1 },
  { hero: 'Harith', picked: 1 },
  { hero: 'Ruby', picked: 1 },
  { hero: 'Bane', picked: 1 },
  { hero: 'Diggie', picked: 1 },
  { hero: 'Lolita', picked: 1 },
  { hero: 'Marcel', picked: 1 },
  { hero: 'Terizla', picked: 1 },
  { hero: 'Freya', picked: 1 },
  { hero: 'Fredrin', picked: 1 },
  { hero: 'Cici', picked: 1 },
  { hero: 'Phoveus', picked: 1 },
  { hero: 'Uranus', picked: 1 },
  { hero: 'Minotaur', picked: 1 },
  { hero: 'Gloo', picked: 1 },
  { hero: 'Nathan', picked: 1 },
  { hero: 'Beatrix', picked: 1 },
  { hero: 'Popol and Kupa', picked: 1 },
  { hero: 'Faramis', picked: 1 },
];

export const INITIAL_LAGA_AMAL_S41: LagaAmalSeasonData = {
  id: 's41',
  title: 'KELASEMEN LAGA AMAL - S41',
  dateStr: 'Friday, September 11, 2026',
  activePlayersCount: 14,
  topCoklat: { player: 'irvantaufiq12', count: 8 },
  topSilver: { player: 'irvantaufiq12', count: 37 },
  topAntam: { player: 'Dignityzed', count: 37 },
  topMvp: { player: 'LAH MANDOOR', count: 23 },
  totalMatches: 79,
  totalScore: 5934.1,
  avgWinRateTotal: 49.94,
  avgScoreTotal: 7.54,
  players: INITIAL_S41_PLAYERS,
  heroPicksByUser: INITIAL_S41_HERO_PICKS,
  heroPool: INITIAL_S41_HERO_POOL,
  matchRows: [], // Populated dynamically or via parser
};

/**
 * Parses raw CSV exported or pasted from spreadsheet
 */
export function parseLagaAmalCsv(csvText: string): LagaAmalSeasonData {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  
  let title = 'KELASEMEN LAGA AMAL - S41';
  let dateStr = 'Friday, September 11, 2026';
  let activePlayersCount = 14;
  let topCoklat = { player: 'irvantaufiq12', count: 8 };
  let topSilver = { player: 'irvantaufiq12', count: 37 };
  let topAntam = { player: 'Dignityzed', count: 37 };
  let topMvp = { player: 'LAH MANDOOR', count: 23 };
  let totalMatches = 79;
  let totalScore = 5934.1;
  let avgWinRateTotal = 49.94;
  let avgScoreTotal = 7.54;

  const players: LagaAmalPlayerStat[] = [];
  const heroPicks: LagaAmalHeroPick[] = [];
  const matchRows: LagaAmalMatchRow[] = [];
  const heroPoolMap = new Map<string, number>();

  let section: 'meta' | 'players' | 'heropicks' | 'matches' | 'unknown' = 'meta';
  let currentPlayer = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = rawLine.split(',').map((c) => c.replace(/^"|"$/g, '').trim());

    if (cells[0]?.includes('KELASEMEN LAGA AMAL') || cells[1]?.includes('KELASEMEN LAGA AMAL')) {
      title = cells[0]?.includes('KELASEMEN LAGA AMAL') ? cells[0] : cells[1];
      continue;
    }

    if (cells[1]?.includes('2026') || cells[0]?.includes('2026') || cells[1]?.includes('September')) {
      dateStr = cells[1] || cells[0];
      continue;
    }

    if (cells.includes('ACTIVE PLAYER') || cells.includes('TOP COKLAT🥉')) {
      const nextLine = lines[i + 1]?.split(',').map((c) => c.replace(/^"|"$/g, '').trim()) || [];
      if (nextLine.length >= 7) {
        activePlayersCount = Number(nextLine[1]) || 14;
        topCoklat = { player: nextLine[2] || 'irvantaufiq12', count: 8 };
        topSilver = { player: nextLine[3] || 'irvantaufiq12', count: 37 };
        topAntam = { player: nextLine[4] || 'Dignityzed', count: 37 };
        topMvp = { player: nextLine[5] || 'LAH MANDOOR', count: 23 };
        totalMatches = Number(nextLine[6]) || 79;
        const rawScore = nextLine[7]?.replace(/[^0-9.]/g, '');
        totalScore = rawScore ? parseFloat(rawScore) : 5934.1;
      }
      continue;
    }

    if (cells.includes('Nickname') && cells.includes('Sum of Makan Coklat')) {
      section = 'players';
      continue;
    }

    if (cells.includes('MOST HERO PICK BY USER')) {
      section = 'heropicks';
      continue;
    }

    if (cells.includes('Date') && cells.includes('Hero') && cells.includes('Ikut Main')) {
      section = 'matches';
      continue;
    }

    if (section === 'players') {
      const name = cells[1] || cells[0];
      if (name && name !== 'Total Result' && cells.length >= 7) {
        const coklat = parseInt(cells[2]) || 0;
        const silver = parseInt(cells[3]) || 0;
        const antam = parseInt(cells[4]) || 0;
        const mvp = parseInt(cells[5]) || 0;
        const matches = parseInt(cells[6]) || 0;
        const score = parseFloat(cells[7]?.replace(/[^0-9.]/g, '') || '0');
        if (matches > 0) {
          players.push({
            nickname: name,
            coklat,
            silver,
            antam,
            mvp,
            matches,
            score,
            winRate: 50.0,
            avgScore: score > 0 && matches > 0 ? parseFloat((score / matches).toFixed(2)) : 0,
          });
        }
      } else if (name === 'Total Result') {
        section = 'unknown';
      }
    } else if (section === 'matches') {
      const date = cells[0];
      const nickname = cells[1];
      const hero = cells[2];
      if (date && nickname && hero && !date.includes('Date') && !nickname.includes('Nickname')) {
        const coklat = parseInt(cells[3]) || 0;
        const silver = parseInt(cells[4]) || 0;
        const antam = parseInt(cells[5]) || 0;
        const mvp = parseInt(cells[6]) || 0;
        const result = cells[7]?.toUpperCase().includes('VICTORY') ? 'VICTORY' : 'DEFEAT';
        const rating = cells[8] || (mvp ? '4. MVP' : antam ? '3. ANTAM' : silver ? '2. SILVER' : '1. COKLAT');
        const score = parseFloat(cells[9]?.replace(/[^0-9.]/g, '') || '0');
        const winRate = parseInt(cells[10]) || (result === 'VICTORY' ? 1 : 0);

        matchRows.push({
          id: `csv-match-${matchRows.length + 1}`,
          date,
          nickname,
          hero,
          coklat,
          silver,
          antam,
          mvp,
          result,
          rating,
          score,
          winRate,
          count: 1,
        });

        heroPoolMap.set(hero, (heroPoolMap.get(hero) || 0) + 1);
      }
    }
  }

  // Populate hero pool array
  const heroPool: LagaAmalHeroPoolItem[] = [];
  if (heroPoolMap.size > 0) {
    heroPoolMap.forEach((count, hero) => {
      heroPool.push({ hero, picked: count });
    });
    heroPool.sort((a, b) => b.picked - a.picked);
  }

  return {
    id: 's41',
    title: title || INITIAL_LAGA_AMAL_S41.title,
    dateStr: dateStr || INITIAL_LAGA_AMAL_S41.dateStr,
    activePlayersCount: activePlayersCount || (players.length > 0 ? players.length : 14),
    topCoklat,
    topSilver,
    topAntam,
    topMvp,
    totalMatches,
    totalScore,
    avgWinRateTotal,
    avgScoreTotal,
    players: players.length > 0 ? players : INITIAL_S41_PLAYERS,
    heroPicksByUser: heroPicks.length > 0 ? heroPicks : INITIAL_S41_HERO_PICKS,
    heroPool: heroPool.length > 0 ? heroPool : INITIAL_S41_HERO_POOL,
    matchRows,
  };
}

/**
 * Exports current Laga Amal season data into standard CSV text
 */
export function exportLagaAmalCsv(season: LagaAmalSeasonData): string {
  const lines: string[] = [];
  lines.push(`${season.title},,,,,,,,,,,,,,,,,,,`);
  lines.push(`,"${season.dateStr}",,,,,,,,,,,,,,,,,,,`);
  lines.push(',ACTIVE PLAYER,TOP COKLAT🥉,TOP SILVER 🥈,TOP ANTAM🥇,MVP👑,TOTAL MATCHES,TOTAL SCORE,,,,,,,,,,,,,');
  lines.push(
    `,${season.activePlayersCount},${season.topCoklat.player},${season.topSilver.player},${season.topAntam.player},${season.topMvp.player},${season.totalMatches}," ${season.totalScore.toLocaleString()} ",,,,,,,,,,,,,`
  );
  lines.push(',Nickname,Sum of Makan Coklat,Sum of Silver,Sum of Antam,Sum of MVP,Count of Ikut Main,Sum of Score,Sum of WR,Sum of AVG,,,,,,,,,,');

  season.players.forEach((p) => {
    lines.push(
      `,${p.nickname},${p.coklat},${p.silver},${p.antam},${p.mvp},${p.matches}, ${p.score.toFixed(1)} ,${p.winRate.toFixed(2)}%,${p.avgScore.toFixed(2)},,,,,,,,,,`
    );
  });

  lines.push(',,,,,,,,,,,,,,,,,,,,');
  lines.push(',MOST HERO PICK BY USER,,,,,,,,,,,,,,,,,,,');
  lines.push(',Player,Hero,1. COKLAT,2. SILVER,3. ANTAM,4. MVP,Total Result,,,,,,,,,,,,,');

  season.heroPicksByUser.forEach((hp) => {
    lines.push(
      `,${hp.player},${hp.hero},${hp.coklat || ''},${hp.silver || ''},${hp.antam || ''},${hp.mvp || ''},${hp.total},,,,,,,,,,,,,`
    );
  });

  return lines.join('\n');
}
