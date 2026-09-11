import { Player, Match } from '../types';

export const INITIAL_PLAYERS: Player[] = [
  {
    id: 1,
    name: 'Mandor',
    status: 'Aktif',
    tier: 'Mythic',
    total_match: 20,
    medals: { MVP: 9, Gold: 6, Silver: 4, Coklat: 1 },
  },
  {
    id: 2,
    name: 'Kelung',
    status: 'Aktif',
    tier: 'Legend',
    total_match: 20,
    medals: { MVP: 5, Gold: 8, Silver: 5, Coklat: 2 },
  },
  {
    id: 3,
    name: 'Gil',
    status: 'Aktif',
    tier: 'Mythic',
    total_match: 19,
    medals: { MVP: 4, Gold: 5, Silver: 7, Coklat: 3 },
  },
  {
    id: 4,
    name: 'Ven',
    status: 'Cabutan',
    tier: 'Epic',
    total_match: 17,
    medals: { MVP: 1, Gold: 2, Silver: 6, Coklat: 8 },
  },
  {
    id: 5,
    name: 'Hees',
    status: 'Aktif',
    tier: 'Legend',
    total_match: 19,
    medals: { MVP: 2, Gold: 4, Silver: 9, Coklat: 4 },
  },
  {
    id: 6,
    name: 'Doni',
    status: 'Aktif',
    tier: 'Epic',
    total_match: 14,
    medals: { MVP: 0, Gold: 3, Silver: 5, Coklat: 6 },
  },
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 12,
    date: '12 Feb 2025',
    season: 'Season 1',
    winner: 'Tim Pohon',
    type: 'Laga Amal',
    pohon: [
      { id: '12-1', player_id: 1, player_name: 'Mandor', hero_id: 66, hero_name: 'Kadita', team: 'Pohon', medal: 'MVP' },
      { id: '12-2', player_id: 3, player_name: 'Gil', hero_id: 88, hero_name: 'Masha', team: 'Pohon', medal: 'Gold' },
      { id: '12-3', player_id: 2, player_name: 'Kelung', hero_id: 94, hero_name: 'Moskov', team: 'Pohon', medal: 'Silver' },
    ],
    lobby: [
      { id: '12-4', player_id: 4, player_name: 'Ven', hero_id: 129, hero_name: 'Yve', team: 'Lobby', medal: 'Coklat' },
      { id: '12-5', player_id: 5, player_name: 'Hees', hero_id: 59, hero_name: 'Hylos', team: 'Lobby', medal: 'Silver' },
    ],
    ai_analysis:
      'Kadita di tangan Mandor lagi-lagi jadi penentu — combo ult ke tim Lobby yang berdiri berdempetan seperti antrean sembako. Ven pantas dapat Coklat malam ini: tiga kali inisiasi sendirian tanpa lirik minimap sama sekali. Tim Pohon menang bukan karena strategi cemerlang, tapi karena lawan menyediakan ruang selebar lapangan bola.',
  },
  {
    id: 11,
    date: '09 Feb 2025',
    season: 'Season 1',
    winner: 'Tim Lobby',
    type: 'Laga Amal',
    pohon: [
      { id: '11-1', player_id: 2, player_name: 'Kelung', hero_id: 27, hero_name: 'Chou', team: 'Pohon', medal: 'Coklat' },
      { id: '11-2', player_id: 3, player_name: 'Gil', hero_id: 41, hero_name: 'Franco', team: 'Pohon', medal: 'Silver' },
    ],
    lobby: [
      { id: '11-3', player_id: 5, player_name: 'Hees', hero_id: 50, hero_name: 'Gusion', team: 'Lobby', medal: 'MVP' },
      { id: '11-4', player_id: 6, player_name: 'Doni', hero_id: 79, hero_name: 'Lesley', team: 'Lobby', medal: 'Gold' },
    ],
    ai_analysis:
      'Gusion Hees akhirnya lepas dari mode "coba-coba" dan tampil rapi mid-late game, layak MVP tanpa perdebatan. Kelung dapat Coklat karena Chou-nya lebih sering nyasar ke arah musuh sendiri daripada membantu tim. Tim Lobby menutup rapat cela di early game yang biasanya jadi kelemahan mereka.',
  },
  {
    id: 10,
    date: '05 Feb 2025',
    season: 'Season 1',
    winner: 'Tim Pohon',
    type: 'Laga Amal',
    pohon: [
      { id: '10-1', player_id: 1, player_name: 'Mandor', hero_id: 79, hero_name: 'Lesley', team: 'Pohon', medal: 'MVP' },
      { id: '10-2', player_id: 2, player_name: 'Kelung', hero_id: 36, hero_name: 'Estes', team: 'Pohon', medal: 'Gold' },
    ],
    lobby: [
      { id: '10-3', player_id: 6, player_name: 'Doni', hero_id: 41, hero_name: 'Franco', team: 'Lobby', medal: 'Coklat' },
      { id: '10-4', player_id: 4, player_name: 'Ven', hero_id: 59, hero_name: 'Hylos', team: 'Lobby', medal: 'Gold' },
    ],
    ai_analysis:
      'Lesley Mandor menyapu bersih dari belakang selagi Doni sibuk menarik hook ke arah tembok. Rotasi Tim Pohon rapi berkat Estes Kelung yang jarang telat heal. Coklat untuk Doni sudah final, tidak ada ruang banding.',
  },
];
