import { Match, MatchPlayerDetail } from '../types';

/**
 * Produces a serviceable "Kelas Semen" style commentary paragraph from the
 * match data alone, with no AI call. Used as the fallback whenever Gemini
 * is unavailable (missing/invalid API key, model error, or the backend
 * itself being unreachable) so the analysis card never shows a flat,
 * generic placeholder like "Pertandingan selesai dengan sengit!".
 */
export function generateHeuristicMatchAnalysis(match: Match): string {
  const winnerTeam = match.winner;
  const loserTeam = winnerTeam === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';
  const winnerPlayers = winnerTeam === 'Tim Pohon' ? match.pohon : match.lobby;
  const loserPlayers = loserTeam === 'Tim Pohon' ? match.pohon : match.lobby;
  const allPlayers: MatchPlayerDetail[] = [...match.pohon, ...match.lobby];

  const mvp = allPlayers.find((p) => p.medal === 'MVP');
  const coklat = allPlayers.find((p) => p.medal === 'Coklat');
  const secondMvp = winnerPlayers.find((p) => p.medal === 'Gold');

  let commentary = `${winnerTeam} keluar sebagai pemenang atas ${loserTeam} dalam laga yang sengit. `;

  if (mvp) {
    commentary += `${mvp.player_name} tampil gemilang membawa ${mvp.hero_name} dan pantas menyandang gelar MVP pertandingan ini${
      typeof mvp.score === 'number' ? ` dengan skor ${mvp.score}` : ''
    }. `;
  }

  if (secondMvp && secondMvp.player_name !== mvp?.player_name) {
    commentary += `${secondMvp.player_name} (${secondMvp.hero_name}) juga jadi andalan lewat kontribusi solid di setiap teamfight. `;
  }

  if (coklat) {
    commentary += `Di kubu satunya, ${coklat.player_name} (${coklat.hero_name}) harus rela menelan medali Coklat setelah beberapa kali kena culik dan gagal berkontribusi maksimal untuk timnya.`;
  } else {
    commentary += `Kedua tim bermain cukup rapat tanpa ada yang benar-benar tergelincir ke zona semen — laning bersih, rotasi disiplin.`;
  }

  return commentary;
}
