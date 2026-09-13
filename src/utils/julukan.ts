import { Player } from '../types';

interface SeasonPlayerStatLike {
  mvp?: number;
  coklat?: number;
  antam?: number;
  winRate?: number;
}

/**
 * Produces a Pantos-flavored nickname from a player's stats alone, no AI
 * call. Used whenever Gemini is unavailable (missing/invalid API key,
 * model error) so "Generate Julukan" always produces something instead of
 * silently doing nothing.
 */
export function generateHeuristicPlayerJulukan(player: Player, seasonStat?: SeasonPlayerStatLike): string {
  const mvp = seasonStat?.mvp ?? player.medals?.MVP ?? 0;
  const coklat = seasonStat?.coklat ?? player.medals?.Coklat ?? 0;
  const antam = seasonStat?.antam ?? player.medals?.Gold ?? 0;
  const winRate = seasonStat?.winRate ?? player.winRate ?? 50;

  if (mvp >= 8 || winRate >= 70) return 'Sang Penggendong Patah Tulang';
  if (coklat >= 5) return 'Warga Kehormatan Kelas Semen';
  if (antam >= 6) return 'Kolektor Antam Anti Beban';
  if (player.status === 'Cabutan') return 'Joker Cabutan Penentu Nasib';
  if (player.tier === 'Mythic') return 'Sepuh Mythic Pantos';
  if (player.tier === 'Epic') return 'Abadi di Neraka Epic';
  if (mvp >= 4) return 'Pencuri Gelar MVP Handal';
  return 'Pejuang Laga Amal Pantos';
}
