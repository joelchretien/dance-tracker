import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'

/**
 * Find the entry index closest to the current time for a given day.
 * Returns the index of the first entry whose time is >= nowMinutes,
 * or the last entry of the day if all have passed.
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
export function todayDayIndex(dayDates: string[]): number {
  const today = new Date().toISOString().slice(0, 10)
  const idx = dayDates.indexOf(today)
  if (idx >= 0) return idx
  // Default to last day if today is after all days, or first day otherwise
  const todayTime = new Date(today + 'T00:00:00').getTime()
  for (let i = dayDates.length - 1; i >= 0; i--) {
    if (new Date(dayDates[i] + 'T00:00:00').getTime() <= todayTime) return i
  }
  return 0
}
