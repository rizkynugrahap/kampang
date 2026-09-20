/**
 * Team display names.
 *
 * The underlying data model (match.winner, match.pohon / match.lobby,
 * mp.team === 'Pohon' | 'Lobby', TeamName = 'Tim Pohon' | 'Tim Lobby', etc.)
 * intentionally keeps its original internal values. Renaming those would
 * mean every match already saved in Supabase (whose `winner` field
 * literally contains the string "Tim Pohon"/"Tim Lobby") would stop
 * matching any comparison the moment the rename landed, silently breaking
 * win-rate stats, filters, and badges for historical matches.
 *
 * Instead, only the LABEL shown to the user changes: "Tim Pohon" -> "Tim
 * Kiri" and "Tim Lobby" -> "Tim Kanan" (and their short forms). Use these
 * helpers anywhere a raw stored team value is rendered as text.
 */

export function teamDisplayName(raw?: string | null): string {
  if (raw === 'Tim Pohon') return 'Tim Kiri';
  if (raw === 'Tim Lobby') return 'Tim Kanan';
  return raw || '';
}

export function teamShortDisplayName(raw?: string | null): string {
  if (raw === 'Pohon') return 'Kiri';
  if (raw === 'Lobby') return 'Kanan';
  return raw || '';
}
