import { Match, MatchPlayerDetail } from '../types';
import { teamDisplayName } from './teamLabels';

/**
 * Helper to analyze player streak / history from previous matches in the season.
 */
function analyzePlayerPastContext(playerName: string, previousMatches: Match[]): {
  recentMvps: number;
  recentCoklats: number;
  lastMedal?: string;
} {
  const norm = playerName.trim().toLowerCase();
  let recentMvps = 0;
  let recentCoklats = 0;
  let lastMedal: string | undefined;

  for (let i = 0; i < Math.min(previousMatches.length, 5); i++) {
    const pm = previousMatches[i];
    const all = [...pm.pohon, ...pm.lobby];
    const found = all.find((p) => p.player_name.trim().toLowerCase() === norm);
    if (found) {
      if (!lastMedal) lastMedal = found.medal;
      if (found.medal === 'MVP') recentMvps++;
      if (found.medal === 'Coklat') recentCoklats++;
    }
  }

  return { recentMvps, recentCoklats, lastMedal };
}

/**
 * Produces an ultra-sarcastic, witty, and roasting commentary with past-match awareness.
 * Used when offline or as immediate instant fallback, completely eliminating stiff/monotone templates.
 */
export function generateHeuristicMatchAnalysis(
  match: Match,
  previousMatches: Match[] = []
): string {
  const winnerTeam = match.winner;
  const loserTeam = winnerTeam === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';
  const winnerPlayers = winnerTeam === 'Tim Pohon' ? match.pohon : match.lobby;
  const loserPlayers = loserTeam === 'Tim Pohon' ? match.pohon : match.lobby;
  const allPlayers: MatchPlayerDetail[] = [...match.pohon, ...match.lobby];

  const mvp = allPlayers.find((p) => p.medal === 'MVP');
  const coklat = allPlayers.find((p) => p.medal === 'Coklat');
  const secondMvp = winnerPlayers.find((p) => p.medal === 'Gold');
  const loserBest = loserPlayers.find((p) => p.medal === 'Gold' || p.medal === 'Silver');

  // Varied sarcastic openers based on match id hash
  const hash = Math.abs((match.id || 1) * 31);
  const openers = [
    `Buset dah, ini match atau pembantaian berkedok Laga Amal? ${teamDisplayName(winnerTeam)} sukses bikin ${teamDisplayName(loserTeam)} kocar-kacir kayak minion kehilangan induknya.`,
    `Aroma kekacauan bener-bener menyengat di Land of Dawn! ${teamDisplayName(winnerTeam)} main kesurupan dan berhasil memulangkan ${teamDisplayName(loserTeam)} langsung ke beranda dengan kepala tertunduk.`,
    `Gak ada ampun! ${teamDisplayName(winnerTeam)} bener-bener ngasih kuliah umum gratis ke ${teamDisplayName(loserTeam)} tentang cara main Mobile Legends yang bener, bukan asal pencet tombol di layar.`,
    `Sebuah pertunjukan sirkus yang luar biasa dramatis! ${teamDisplayName(winnerTeam)} keluar sebagai penguasa mutlak, sementara kubu ${teamDisplayName(loserTeam)} tampak bermain seperti orang yang tangannya lagi dipinjam orang lain.`,
    `Woy woy woy, santai dikit dong! ${teamDisplayName(winnerTeam)} membabat habis pertahanan ${teamDisplayName(loserTeam)} tanpa sisa, bikin pertandingan ini terasa berat sebelah dari menit awal.`,
  ];
  const selectedOpener = openers[hash % openers.length];

  // MVP praise & roast
  let mvpSection = '';
  if (mvp) {
    const pastContext = analyzePlayerPastContext(mvp.player_name, previousMatches);
    const scoreStr = typeof mvp.score === 'number' ? `skor fantastis ${mvp.score}` : 'performa dewa';

    if (pastContext.recentMvps >= 2) {
      mvpSection = `Gelar MVP fix mutlak disikat lagi sama ${mvp.player_name} yang bawa ${mvp.hero_name} dengan ${scoreStr}. Orang ini beneran gak ada obat—udah berapa match berturut-turut langganan bawa piala, tulang punggungnya apa gak retak gendong rekan-rekannya tiap hari?`;
    } else if (pastContext.lastMedal === 'Coklat') {
      mvpSection = `Plot twist paling gila datang dari ${mvp.player_name} (${mvp.hero_name})! Padahal di match kemarin sempat jadi badut makan Coklat, eh sekarang mendadak tobat dan ngamuk jadi MVP dengan ${scoreStr}. Respect buat penebusan dosanya!`;
    } else {
      const mvpPraises = [
        `Si ${mvp.player_name} yang make ${mvp.hero_name} pantas dapet medali MVP plus surat apresiasi. Rotasinya licin kayak belut, damage-nya pedes banget bikin lawan mikir dua kali buat nongol di map.`,
        `${mvp.player_name} (${mvp.hero_name}) bener-bener jadi monster di game ini dengan ${scoreStr}. Lawan baru liat bayangannya aja udah pada buyar panik mencet flicker ke semak.`,
        `Tulang punggung sejati jatuh ke ${mvp.player_name} dengan ${mvp.hero_name}-nya. Kalau bukan dia yang buka map dan inisiasi perang, mungkin ceritanya bakal beda jauh.`,
      ];
      mvpSection = mvpPraises[hash % mvpPraises.length];
    }
  }

  // Coklat roast & banter
  let coklatSection = '';
  if (coklat) {
    const pastCoklatContext = analyzePlayerPastContext(coklat.player_name, previousMatches);
    const coklatScoreStr = typeof coklat.score === 'number' ? ` (skor ${coklat.score})` : '';

    if (pastCoklatContext.recentCoklats >= 2) {
      coklatSection = `Nah sekarang giliran roasting wajib buat ${coklat.player_name} (${coklat.hero_name})${coklatScoreStr}. Bro, tolong lah, lu ini udah langganan makan Coklat dari match kemarin! Mau buka pabrik coklat apa gimana? Hero dipilih buat menang, bukan buat jadi ATM berjalan penyuplai gold musuh. Segera istighfar dan bersihin jari sebelum match berikutnya!`;
    } else if (pastCoklatContext.lastMedal === 'MVP') {
      coklatSection = `Tragedi paling mengenaskan nimpa ${coklat.player_name} (${coklat.hero_name})${coklatScoreStr}. Kemarin dipuja-puja bak dewa carry, sekarang malah terjun bebas nelen Coklat terpanas di zona semen. Dari pahlawan jadi donatur kill cuma butuh satu match!`;
    } else {
      const coklatRoasts = [
        `Di sisi lain, ${coklat.player_name} yang bawa ${coklat.hero_name}${coklatScoreStr} harus pasrah dinobatkan jadi juru selamat buat tim lawan. Hobi banget kena culik di semak dan nyumbang nyawa cuma-cuma. Mending HP-nya direndem beras dulu biar layarnya gak ngelag.`,
        `Kubu ${teamDisplayName(loserTeam)} kayaknya wajib patungan beliin kacamata buat ${coklat.player_name} (${coklat.hero_name})${coklatScoreStr}. Buta map-nya udah level kronis, tiap ada teamfight malah asyik cosplay jadi minion di lane seberang.`,
        `Medali Coklat kehormatan jatuh kepada ${coklat.player_name} (${coklat.hero_name})${coklatScoreStr}. Performanya bener-bener definisi "sedekah poin". Tiap nongol di layar bukannya ngasih perlawanan, malah nyodorin leher buat dieksekusi musuh.`,
      ];
      coklatSection = coklatRoasts[hash % coklatRoasts.length];
    }
  } else {
    coklatSection = `Ajaibnya, di match ini gak ada yang bener-bener hancur lebur sampai level semen. Kedua kubu main disiplin, cuma beda nasib aja di kontes Lord menit akhir.`;
  }

  // Supporting / ending note
  let closingSection = '';
  if (secondMvp && secondMvp.player_name !== mvp?.player_name) {
    closingSection = `Apresiasi sampingan buat ${secondMvp.player_name} (${secondMvp.hero_name}) yang diam-diam ngasih cover solid tanpa banyak bacot di chat. `;
  }
  if (loserBest) {
    closingSection += `Kasihan juga liat ${loserBest.player_name} (${loserBest.hero_name}) di kubu kalah, udah berusaha keras banting tulang tapi tetep aja kalah gara-gara rekannya terlalu dermawan bagi-bagi kill.`;
  } else {
    closingSection += `Evaluasi buat match selanjutnya: jangan main sambil ngantuk, dan please jangan ada yang pick hero coba-coba lagi!`;
  }

  return `${selectedOpener}\n\n${mvpSection} ${closingSection}\n\n${coklatSection}`;
}
