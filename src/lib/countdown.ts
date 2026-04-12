import type { IndexedEntry } from '@/types/schedule'

/**
 * Find the next entry (at or after currentIndex) that involves a watched dancer
 * or is a watched-dancer-relevant awards entry.
 */
export function findNextTarget(
  flatEntries: IndexedEntry[],
  currentIndex: number,
  watchedSet: Set<string>,
  watchedAwards: Set<number>,
): number | null {
  if (watchedSet.size === 0) return null

  for (let i = currentIndex; i < flatEntries.length; i++) {
    const entry = flatEntries[i].entry
    if (entry.type === 'dance' && entry.dancers?.some(d => watchedSet.has(d))) {
      return i
    }
    if (entry.type === 'awards' && watchedAwards.has(i)) {
      return i
    }
  }
  return null
}

/**
 * Count the number of non-break entries from (from+1) to (to) inclusive.
 * Matches the original cU(t) behavior: counts dances from ci+1 through target.
 */
export function countDancesUntil(
  flatEntries: IndexedEntry[],
  from: number,
  to: number,
): number {
  let count = 0
  for (let i = from + 1; i <= to; i++) {
    if (flatEntries[i]?.entry.type === 'dance') count++
  }
  return count
}
