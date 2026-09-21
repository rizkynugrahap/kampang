/**
 * The `players` table's row id (and therefore each player's real identity
 * in Supabase) is a slug of their name — not their numeric Player.id — so
 * that the app can look a player up by name before it even knows their
 * numeric id. That means two DIFFERENT names that normalize to the same
 * slug (e.g. "Mr. GiL" and "Mr GiL" — punctuation/spacing stripped) would
 * collide on this same row id and silently overwrite each other's data.
 *
 * Callers that let an admin type a player name (add/edit player forms)
 * should check a new name against this slug — not just exact-name
 * equality — before saving, and reject it if it collides with a
 * DIFFERENT existing player.
 */
export function getPlayerDocId(player: { name?: string; id?: number | string }): string {
  const slug = (player.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || String(player.id ?? '');
}
