import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'
import { getEntryDurationMinutes } from './entry-duration'

/**
 * Whether wall-clock-now falls within the active-hours window of today's
 * schedule day. False when:
 *   - today's date isn't on the schedule (between days, before, after)
 *   - now is before the first entry of today
 *   - now is past the estimated end of today's last entry (its scheduled
 *     time + duration)
 *
 * "Active hours" is the right gate for hiding the "current" indicator
 * outside the actual run hours — it cleanly captures pre-show, post-show,
 * and any non-schedule day. The duration-of-last-entry buffer keeps the
 * gate from flipping the moment the last dance starts.
 *
 * Pure: takes today's date string and now-in-minutes as args so tests
 * can drive it deterministically without freezing the system clock.
 */
export function isWithinActiveHours(
  flatEntries: IndexedEntry[],
  dayDates: readonly string[],
  todayDate: string,
  nowMinutes: number,
): boolean {
  const dayIdx = dayDates.indexOf(todayDate)
  if (dayIdx < 0) return false

  // Locate first and last entries on today's day in one pass.
  let firstIdx = -1
  let lastIdx = -1
  for (let i = 0; i < flatEntries.length; i++) {
    if (flatEntries[i].dayIndex === dayIdx) {
      if (firstIdx < 0) firstIdx = i
      lastIdx = i
    }
  }
  if (firstIdx < 0) return false

  const firstTime = parseTime(flatEntries[firstIdx].entry.time)
  const lastTime = parseTime(flatEntries[lastIdx].entry.time)
  if (firstTime < 0 || lastTime < 0) return false

  // Extend the window by the last entry's duration so we don't declare
  // off-hours the instant the last dance begins.
  const lastDuration = getEntryDurationMinutes(flatEntries, lastIdx)

  return nowMinutes >= firstTime && nowMinutes <= lastTime + lastDuration
}
