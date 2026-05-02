import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'

const DEFAULT_DURATION_MINUTES = 3

/**
 * Compute the duration of a schedule entry in minutes by measuring
 * the gap to the next entry on the same day. Falls back to a default
 * for the last entry of a day or if times can't be parsed.
 */
export function getEntryDurationMinutes(
  flatEntries: IndexedEntry[],
  index: number,
): number {
  const entry = flatEntries[index]
  if (!entry) return DEFAULT_DURATION_MINUTES

  const entryMinutes = parseTime(entry.entry.time)
  if (entryMinutes < 0) return DEFAULT_DURATION_MINUTES

  // Find next entry on the same day
  for (let i = index + 1; i < flatEntries.length; i++) {
    if (flatEntries[i].dayIndex !== entry.dayIndex) break
    const nextMinutes = parseTime(flatEntries[i].entry.time)
    if (nextMinutes >= 0) {
      const gap = nextMinutes - entryMinutes
      return gap > 0 ? gap : DEFAULT_DURATION_MINUTES
    }
  }

  return DEFAULT_DURATION_MINUTES
}
