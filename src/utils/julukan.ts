import { Player, Medal } from '../types';

interface SeasonPlayerStatLike {
  mvp?: number;
  coklat?: number;
  antam?: number;
  silver?: number;
  winRate?: number;
}

export interface MatchPerformanceLike {
  medal?: Medal;
  hero?: string;
  won?: boolean;
  score?: number;
}

/**
 * Produces a super nyeleneh, ngeselin, and memorable Pantos-flavored nickname
 * from a player's stats and recent match performance.
 */
export function generateHeuristicPlayerJulukan(
  player: Player,
  seasonStat?: SeasonPlayerStatLike,
  topHeroes: string[] = [],
  matchPerformance?: MatchPerformanceLike
): string {
  const mvp = seasonStat?.mvp ?? player.medals?.MVP ?? 0;
  const coklat = seasonStat?.coklat ?? player.medals?.Coklat ?? 0;
  const antam = seasonStat?.antam ?? player.medals?.Gold ?? 0;
  const winRate = seasonStat?.winRate ?? player.winRate ?? 50;
  const isCabutan = player.status === 'Cabutan';

  // Seed choice based on player name length, id, and current timestamp to ensure variety
  const seed = (String(player.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + Date.now()) % 100;
  const pick = (list: string[]) => list[seed % list.length];

  // If specific match performance is provided from newly inputted match:
  if (matchPerformance) {
    const perfHero = (matchPerformance.hero || topHeroes[0] || '').toLowerCase();
    
    // Fresh MVP of the match
    if (matchPerformance.medal === 'MVP') {
      return pick([
        'MVP Gendong Rombongan',
        'Punggung Baja Anti Patah',
        'Dewa Perang Laga Terakhir',
        'Sapu Bersih Bintang Musuh',
        'Bintang 1 Lawan 9',
        'Gendong 4 Karung Beras',
        'Carry Keras Kepala Pantos',
      ]);
    }

    // Fresh Coklat of the match (Semen / Beban)
    if (matchPerformance.medal === 'Coklat') {
      return pick([
        'Coklat Hangat Baru Matang',
        'Beban Nomor Satu Laga Ini',
        'Pondasi Semen Cor Instan',
        'Donatur Bintang Free Ongkir',
        'ATM Berjalan Babak Terakhir',
        'Spesialis Mati Menit Pertama',
        'Pabrik Semen Tiga Roda',
      ]);
    }

    // Hero-specific match flavor
    if (perfHero.includes('johnson')) {
      return pick(['Supir Truk Nabrak Tembok', 'Tukang Ojek Nabrak Turret', 'Johnson SIM Nembak']);
    }
    if (perfHero.includes('angela')) {
      return pick(['Nempel Doang Gak Mau Turun', 'Parasit Tubuh Sahabat', 'Angela Hobi Tinggal Kabur']);
    }
    if (perfHero.includes('tigreal') || perfHero.includes('atlas')) {
      return pick(['Montage Gagal Kena Mental', 'Tukang Dorong Angin', 'Inisiasi Tanpa Backup']);
    }
    if (perfHero.includes('saber') || perfHero.includes('yin')) {
      return pick(['Penculik Anak Orang', 'Penculik Salah Target', 'Spesialis Bawa Musuh ke Ring']);
    }
    if (perfHero.includes('lesley') || perfHero.includes('miya') || perfHero.includes('layla')) {
      return pick(['Bintang Paling Cepat Diculik', 'Marksman Empuk Santapan Musuh', 'Petani Hutan Pantang War']);
    }
    if (perfHero.includes('franco')) {
      return pick(['Franco Mancing Emosi Sendiri', 'Hook Kosong Bikin Sakit Hati', 'Mancing Keributan Satu Tim']);
    }
    if (perfHero.includes('chou')) {
      return pick(['Chou Freestyle Berakhir Kuburan', 'Spesialis Recall Depan Musuh', 'Freestyle Gagal Kena Mental']);
    }
    if (perfHero.includes('nana')) {
      return pick(['Tukang Lempar Molina Kabur', 'Nana Jahil Bikin Darting', 'Kucing Pembawa Bencana Tim']);
    }
    if (perfHero.includes('fanny') || perfHero.includes('ling')) {
      return pick(['Gesek Tembok Kehabisan Energi', 'Assasin Mabuk Kabel', 'Burung Pipit Kehabisan Mana']);
    }
  }

  // Specific hero banter if topHero matches known MLBB memes
  const favHero = topHeroes[0]?.toLowerCase() || '';
  if (favHero.includes('franco')) {
    return pick(['Franco Mancing Emosi Sendiri', 'Hook Kosong Bikin Sakit Hati', 'Mancing Keributan Satu Tim']);
  }
  if (favHero.includes('chou')) {
    return pick(['Chou Freestyle Berakhir Kuburan', 'Spesialis Recall Depan Musuh', 'Freestyle Gagal Kena Mental']);
  }
  if (favHero.includes('nana')) {
    return pick(['Tukang Lempar Molina Kabur', 'Nana Jahil Bikin Darting', 'Kucing Pembawa Bencana Tim']);
  }
  if (favHero.includes('fanny') || favHero.includes('ling')) {
    return pick(['Gesek Tembok Kehabisan Energi', 'Assasin Mabuk Kabel', 'Burung Pipit Kehabisan Mana']);
  }
  if (favHero.includes('layla') || favHero.includes('miya')) {
    return pick(['Preman Late Game Tak Kunjung Tiba', 'Marksman Empuk Santapan Musuh', 'Bintang Paling Cepat Diculik']);
  }

  // 1. Coklat Feeder / Semen (Paling Ngeselin & Nyeleneh)
  if (coklat >= 4 || (coklat > mvp && coklat >= 2)) {
    return pick([
      'Pabrik Coklat Meleleh',
      'ATM Berjalan Tim Musuh',
      'Tukang Sedekah Bintang Lintas Agama',
      'Pondasi Semen Cor Tiga Roda',
      'Tukang Antar Nyawa Free Ongkir',
      'Cita-cita MVP Realita Coklat',
      'Beban Tim & Beban Keluarga',
      'Spons Penyerap Damage Musuh',
      'Donatur Bintang Terpercaya',
      'Donatur Poin Paling Ikhlas',
      'Spesialis Mati Menit Pertama',
    ]);
  }

  // 2. High MVP / High Winrate (Punggung Bungkuk & Sombong)
  if (mvp >= 5 || winRate >= 68) {
    return pick([
      'Tulang Punggung Bungkuk 90°',
      'Gendong Beban Sampe Skoliosis',
      'Pura-Pura Jago Padahal Hoki',
      'Sombong Dikit Langsung Blunder',
      'Dewa Smurf Penindas Rakyat',
      'Penggendong 4 Karung Beras',
      'Master Egois Pantang Mengalah',
      'Tukang Pamer Medal MVP',
      'Satu Lawan Lima Sisanya Nonton',
    ]);
  }

  // 3. Cabutan / Joker
  if (isCabutan) {
    return pick([
      'Joker Titipan Pengacau Winrate',
      'Cabutan Bikin Jantungan',
      'Impostor Berkedok Cabutan',
      'Tamu Tak Diundang Pembawa Sial',
      'Penyusup Pengikis Bintang',
      'Joker Pengadu Domba Roster',
    ]);
  }

  // 4. Antam / Silver (Main Aman / Nyampah)
  if (antam >= 4 || (antam > mvp && antam > coklat)) {
    return pick([
      'Spesialis Nyampah Kill Sahabat',
      'Jago Kagak Beban Kagak',
      'Bunglon Rank Nyari Selamat',
      'Kolektor Silver Tanpa Dosa',
      'Pemain Gaib Jarang Ikut War',
      'Tukang Last Hit Bikin Emosi',
      'Pencuri Lord Tanpa Permisi',
      'Pembersih Sisa War Teman',
    ]);
  }

  // 5. Tier-based / General Nyeleneh
  if (player.tier === 'Mythic') {
    return pick([
      'Sepuh Mythic Gengsi Selangit',
      'Mythic Karbitan Kurang Tidur',
      'Preman Mythic Hati Rengginang',
      'Mantan Jagoan Sekarang Meleyot',
    ]);
  }

  return pick([
    'Spesialis Retri Indomaret',
    'Tukang Blunder Menit Krusial',
    'Preman Lane Bermental Kerupuk',
    'Penunggu Semak Tanpa Kejelasan',
    'Tukang Emote Saat Sekarat',
    'Solo Player Kena Mental',
    'Sultan Recall Tanpa Mekanik',
  ]);
}
