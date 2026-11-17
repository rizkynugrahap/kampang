/**
 * A match's `id` is only unique WITHIN one season (the "Match #" counter
 * resets for every new season), so its Firestore document id is namespaced by
 * season (e.g. "klasemen-laga-amal-s41-3"). `match.id` itself (the plain
 * number used everywhere in the app) is untouched. Legacy documents keyed by
 * the plain number are still read, and delete calls check both formats.
 */
export function buildMatchRowId(match: { id: number | string; season?: string }): string {
  const seasonSlug = (match.season || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return seasonSlug ? `${seasonSlug}-${match.id}` : String(match.id);
}
