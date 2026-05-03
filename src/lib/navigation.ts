import type { IndexedEntry } from '@/types/schedule'
import { parseTime, localDateString } from './time'

/**
 * Find the next-or-last entry on a given day relative to now.
 *
 * Returns the index of the first entry whose scheduled time is >= nowMinutes
 * (i.e. the next dance the user would catch if they looked up). If every
 * entry on the day has already passed, returns the last entry of the day so
 * the "jump to now" pill still has a meaningful target. Returns null if
 * the day has no entries at all.
 *
 * Note: this is "next-or-last", not literally "closest" — we never pick a
 * past entry over a future one.
 */
export function findNowIndex(
  flatEntries: IndexedEntry[],
  nowMinutes: number,
  targetDayIndex: number,
): number | null {
  let lastInDay: number | null = null

  for (let i = 0; i < flatEntries.length; i++) {
    const item = flatEntries[i]
    if (item.dayIndex !== targetDayIndex) continue
    lastInDay = i

    const entryMinutes = parseTime(item.entry.time)
    if (entryMinutes >= nowMinutes) return i
  }

  return lastInDay
}

/**
 * Determine which day index to use based on today's date and the schedule days.
 * Returns 0 for first day, 1 for second day, etc.
 */
export function todayDayIndex(dayDates: string[], todayOverride?: string): number {
  const today = todayOverride ?? localDateString()
  const idx = dayDates.indexOf(today)
  if (idx >= 0) return idx
  // 'YYYY-MM-DDT00:00:00' (no Z, no offset) parses as midnight LOCAL time,
  // which is exactly what we want — both `today` and `dayDates[i]` were
  // produced from local-time `Date` calls, and we're comparing them as
  // local-midnight timestamps. Don't "fix" this to UTC.
  const todayTime = new Date(today + 'T00:00:00').getTime()
  for (let i = dayDates.length - 1; i >= 0; i--) {
    if (new Date(dayDates[i] + 'T00:00:00').getTime() <= todayTime) return i
  }
  return 0
}
