import { Player, Match } from '../types';
import { INITIAL_LAGA_AMAL_S41 } from './lagaAmalS41Data';
import { buildPlayersFromSeason } from './seasonsSeed';

// Primary source of truth for all players is derived from Laga Amal Season data!
export const INITIAL_PLAYERS: Player[] = buildPlayersFromSeason(INITIAL_LAGA_AMAL_S41);

export const INITIAL_MATCHES: Match[] = [
  {
    id: 12,
    date: '12 Feb 2025',
    season: 'Season 41',
    winner: 'Tim Pohon',
    type: 'Laga Amal',
    pohon: [
      { id: '12-1', player_id: 1, player_name: 'LAH MANDOOR', hero_id: 66, hero_name: 'Kadita', team: 'Pohon', medal: 'MVP', score: 10.4 },
      { id: '12-2', player_id: 2, player_name: 'Dignityzed', hero_id: 88, hero_name: 'Claude', team: 'Pohon', medal: 'Gold', score: 9.1 },
      { id: '12-3', player_id: 6, player_name: 'Mr. GiL', hero_id: 94, hero_name: 'Moskov', team: 'Pohon', medal: 'Silver', score: 6.8 },
      { id: '12-4', player_id: 12, player_name: 'KELUNG', hero_id: 27, hero_name: 'Chou', team: 'Pohon', medal: 'Silver', score: 6.5 },
      { id: '12-5', player_id: 5, player_name: 'YY', hero_id: 36, hero_name: 'Estes', team: 'Pohon', medal: 'Gold', score: 8.4 },
    ],
    lobby: [
      { id: '12-6', player_id: 7, player_name: 'irvantaufiq12', hero_id: 129, hero_name: 'Yve', team: 'Lobby', medal: 'Coklat', score: 3.4 },
      { id: '12-7', player_id: 4, player_name: 'Hees', hero_id: 50, hero_name: 'Gusion', team: 'Lobby', medal: 'Silver', score: 6.9 },
      { id: '12-8', player_id: 3, player_name: 'POCONG JEPRIE', hero_id: 59, hero_name: 'Hylos', team: 'Lobby', medal: 'Silver', score: 6.2 },
      { id: '12-9', player_id: 10, player_name: 'abcdeppp', hero_id: 10, hero_name: 'Paquito', team: 'Lobby', medal: 'Silver', score: 6.0 },
      { id: '12-10', player_id: 9, player_name: 'Bau Bandeng !', hero_id: 79, hero_name: 'Lesley', team: 'Lobby', medal: 'Coklat', score: 4.1 },
    ],
    ai_analysis:
      'Kadita di tangan LAH MANDOOR lagi-lagi jadi penentu dengan skor 10.4 — combo ultimate meluluhlantakkan Tim Lobby. irvantaufiq12 terpaksa mengunyah coklat (3.4) setelah gagal menjaga posisi saat teamfight Lord. Tim Pohon mengamankan kemenangan meyakinkan.',
  },
  {
    id: 11,
    date: '09 Feb 2025',
    season: 'Season 41',
    winner: 'Tim Lobby',
    type: 'Laga Amal',
    pohon: [
      { id: '11-1', player_id: 12, player_name: 'KELUNG', hero_id: 27, hero_name: 'Chou', team: 'Pohon', medal: 'Coklat', score: 3.8 },
      { id: '11-2', player_id: 6, player_name: 'Mr. GiL', hero_id: 41, hero_name: 'Franco', team: 'Pohon', medal: 'Silver', score: 6.4 },
      { id: '11-3', player_id: 5, player_name: 'YY', hero_id: 10, hero_name: 'Paquito', team: 'Pohon', medal: 'Silver', score: 6.7 },
      { id: '11-4', player_id: 8, player_name: 'Mr P Jay', hero_id: 36, hero_name: 'Estes', team: 'Pohon', medal: 'Silver', score: 6.1 },
      { id: '11-5', player_id: 11, player_name: 'Portgas', hero_id: 79, hero_name: 'Lesley', team: 'Pohon', medal: 'Gold', score: 8.2 },
    ],
    lobby: [
      { id: '11-6', player_id: 4, player_name: 'Hees', hero_id: 50, hero_name: 'Gusion', team: 'Lobby', medal: 'MVP', score: 10.8 },
      { id: '11-7', player_id: 2, player_name: 'Dignityzed', hero_id: 88, hero_name: 'Claude', team: 'Lobby', medal: 'Gold', score: 9.3 },
      { id: '11-8', player_id: 1, player_name: 'LAH MANDOOR', hero_id: 66, hero_name: 'Kadita', team: 'Lobby', medal: 'Gold', score: 8.9 },
      { id: '11-9', player_id: 13, player_name: 'Midzy', hero_id: 115, hero_name: 'Julian', team: 'Lobby', medal: 'Silver', score: 7.2 },
      { id: '11-10', player_id: 7, player_name: 'irvantaufiq12', hero_id: 59, hero_name: 'Hylos', team: 'Lobby', medal: 'Silver', score: 6.8 },
    ],
    ai_analysis:
      'Gusion milik Hees tampil mengganas mencetak skor 10.8 MVP tanpa ampun. KELUNG kesulitan membendung agresivitas early game dan menerima Coklat. Tim Lobby menutup laga dengan tempo cepat di menit ke-14.',
  },
  {
    id: 10,
    date: '05 Feb 2025',
    season: 'Season 41',
    winner: 'Tim Pohon',
    type: 'Laga Amal',
    pohon: [
      { id: '10-1', player_id: 1, player_name: 'LAH MANDOOR', hero_id: 79, hero_name: 'Lesley', team: 'Pohon', medal: 'MVP', score: 10.1 },
      { id: '10-2', player_id: 2, player_name: 'Dignityzed', hero_id: 36, hero_name: 'Estes', team: 'Pohon', medal: 'Gold', score: 8.7 },
      { id: '10-3', player_id: 3, player_name: 'POCONG JEPRIE', hero_id: 59, hero_name: 'Hylos', team: 'Pohon', medal: 'Silver', score: 7.0 },
      { id: '10-4', player_id: 4, player_name: 'Hees', hero_id: 10, hero_name: 'Paquito', team: 'Pohon', medal: 'Gold', score: 8.4 },
      { id: '10-5', player_id: 10, player_name: 'abcdeppp', hero_id: 27, hero_name: 'Chou', team: 'Pohon', medal: 'Silver', score: 6.3 },
    ],
    lobby: [
      { id: '10-6', player_id: 7, player_name: 'irvantaufiq12', hero_id: 41, hero_name: 'Franco', team: 'Lobby', medal: 'Coklat', score: 3.5 },
      { id: '10-7', player_id: 8, player_name: 'Mr P Jay', hero_id: 50, hero_name: 'Gusion', team: 'Lobby', medal: 'Gold', score: 8.0 },
      { id: '10-8', player_id: 9, player_name: 'Bau Bandeng !', hero_id: 129, hero_name: 'Yve', team: 'Lobby', medal: 'Silver', score: 6.5 },
      { id: '10-9', player_id: 11, player_name: 'Portgas', hero_id: 88, hero_name: 'Claude', team: 'Lobby', medal: 'Silver', score: 6.1 },
      { id: '10-10', player_id: 12, player_name: 'KELUNG', hero_id: 66, hero_name: 'Kadita', team: 'Lobby', medal: 'Coklat', score: 4.2 },
    ],
    ai_analysis:
      'Lesley LAH MANDOOR menyapu bersih lini belakang Lobby. Hook Franco irvantaufiq12 minim impact sehingga Tim Pohon leluasa mengamankan objektif Turtle dan Lord tanpa perlawanan berarti.',
  },
];
