import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'

/**
 * Given an anchor point (a manually-set "current" entry and the wall-clock
 * time when it was set), compute the likely current entry index based on
 * elapsed time.
 *
 * The offset between wall clock and schedule time is preserved: if the
 * competition was running 15 min late when anchored, it's assumed to still
 * be 15 min late.
 *
 * Returns the index of the last entry on the anchor's day whose scheduled
 * time ≤ the expected schedule time. Falls back to anchorIndex if no
 * entry qualifies (e.g. before the first entry of the day).
 */
export function findLikelyCurrentIndex(
  flatEntries: IndexedEntry[],
  anchorIndex: number,
  anchorWallMinutes: number,
  currentWallMinutes: number,
): number {
  if (flatEntries.length === 0) return 0

  const anchorEntry = flatEntries[anchorIndex]
  if (!anchorEntry) return anchorIndex

  const anchorScheduleMinutes = parseTime(anchorEntry.entry.time)
  if (anchorScheduleMinutes < 0) return anchorIndex

  // How far off-schedule is the competition?
  // Positive = running late, negative = running early
  const offset = anchorWallMinutes - anchorScheduleMinutes

  // What schedule time corresponds to "right now"?
  const expectedScheduleMinutes = currentWallMinutes - offset

  // Scan entries on the same day as the anchor.
  // Keep the last one whose time ≤ expected (entries are in chronological order).
  const anchorDayIndex = anchorEntry.dayIndex
  let bestIndex = -1

  for (let i = 0; i < flatEntries.length; i++) {
    const item = flatEntries[i]
    if (item.dayIndex !== anchorDayIndex) continue

    const entryMinutes = parseTime(item.entry.time)
    if (entryMinutes < 0) continue

    if (entryMinutes <= expectedScheduleMinutes) {
      bestIndex = i
    }
  }

  // If nothing on this day qualifies (expected time is before the first entry),
  // stay at the anchor — don't jump backward.
  return bestIndex >= 0 ? bestIndex : anchorIndex
}
