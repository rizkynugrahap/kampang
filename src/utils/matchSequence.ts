import { Match, LagaAmalSeasonData } from '../types';

/**
 * Calculates the next sequential match number for a new match.
 * Prevents timestamp-based runaway IDs (> 1,000,000).
 */
export function calculateNextMatchNumber(
  matches: Match[] = [],
  selectedSeasonId?: string,
  seasons: LagaAmalSeasonData[] = []
): number {
  let highest = 0;

  // 1. Check selected season matchLogs if available
  if (selectedSeasonId && seasons.length > 0) {
    const season = seasons.find((s) => s.id === selectedSeasonId);
    if (season) {
      if (season.matchLogs && season.matchLogs.length > 0) {
        for (const log of season.matchLogs) {
          const num = Number(log.matchNumber);
          if (!isNaN(num) && num > 0 && num < 1000000 && num > highest) {
            highest = num;
          }
        }
      }
      // Also check matchRows in season
      if (season.matchRows && season.matchRows.length > 0) {
        for (const row of season.matchRows) {
          const matchPrefix = String(row.id || '').match(/^match-(\d+)-/);
          if (matchPrefix && matchPrefix[1]) {
            const rowMatchId = parseInt(matchPrefix[1], 10);
            if (!isNaN(rowMatchId) && rowMatchId > 0 && rowMatchId < 1000000 && rowMatchId > highest) {
              highest = rowMatchId;
            }
          }
        }
      }
    }
  }

  // 2. Check matches array
  for (const m of matches) {
    const idNum = Number(m.id);
    if (!isNaN(idNum) && idNum > 0 && idNum < 1000000) {
      if (idNum > highest) {
        highest = idNum;
      }
    }
  }

  return highest > 0 ? highest + 1 : 1;
}

/**
 * Safely format a display match number, converting any inadvertent timestamp ID
 * (e.g. 1789400155412) to a clean sequential number.
 */
export function getMatchDisplayNumber(
  match: { id: number | string; matchNumber?: number },
  allMatches?: Array<{ id: number | string }>
): number {
  if (typeof match.matchNumber === 'number' && match.matchNumber > 0 && match.matchNumber < 1000000) {
    return match.matchNumber;
  }

  const numId = Number(match.id);
  if (!isNaN(numId) && numId > 0 && numId < 1000000) {
    return numId;
  }

  // If numId is a timestamp (> 1,000,000) or NaN:
  if (allMatches && allMatches.length > 0) {
    const validIds = allMatches
      .map((m) => Number(m.id))
      .filter((id) => !isNaN(id) && id > 0 && id < 1000000);
    const baseMax = validIds.length > 0 ? Math.max(...validIds) : 0;

    const timestampMatches = allMatches
      .filter((m) => {
        const val = Number(m.id);
        return isNaN(val) || val <= 0 || val >= 1000000;
      })
      .sort((a, b) => Number(a.id) - Number(b.id));

    const idx = timestampMatches.findIndex((m) => String(m.id) === String(match.id));
    if (idx !== -1) {
      return baseMax + idx + 1;
    }
  }

  return 1;
}

/**
 * Sanitizes matches list: identifies any matches with timestamp IDs
 * and converts them into proper sequential IDs.
 */
export function sanitizeMatches(matches: Match[]): {
  sanitized: Match[];
  remapped: Array<{ oldId: number | string; newId: number }>;
} {
  if (!matches || matches.length === 0) {
    return { sanitized: [], remapped: [] };
  }

  const validIds = matches
    .map((m) => Number(m.id))
    .filter((id) => !isNaN(id) && id > 0 && id < 1000000);

  let maxSequential = validIds.length > 0 ? Math.max(...validIds) : 0;
  const remapped: Array<{ oldId: number | string; newId: number }> = [];

  // Sort chronological for reassignment of timestamps
  const chronological = [...matches].sort((a, b) => {
    const idA = Number(a.id);
    const idB = Number(b.id);
    const aIsTs = isNaN(idA) || idA <= 0 || idA >= 1000000;
    const bIsTs = isNaN(idB) || idB <= 0 || idB >= 1000000;

    if (!aIsTs && !bIsTs) return idA - idB;
    if (aIsTs && !bIsTs) return 1;
    if (!aIsTs && bIsTs) return -1;
    return idA - idB;
  });

  const processed: Match[] = [];
  for (const m of chronological) {
    const numId = Number(m.id);
    if (isNaN(numId) || numId <= 0 || numId >= 1000000) {
      maxSequential += 1;
      remapped.push({ oldId: m.id, newId: maxSequential });
      processed.push({
        ...m,
        id: maxSequential,
      });
    } else {
      if (numId > maxSequential) {
        maxSequential = numId;
      }
      processed.push(m);
    }
  }

  // Return newest first as expected by standard Pantos match listing
  const sanitized = processed.sort((a, b) => Number(b.id) - Number(a.id));
  return { sanitized, remapped };
}
