import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'
import { getEntryDurationMinutes } from './entry-duration'

/**
 * Whether wall-clock-now falls within the active-hours window of today's
 * schedule day. False when:
 *   - today's date isn't on the schedule (between days, before, after)
 *   - now is before the first entry of today (offset-adjusted)
 *   - now is past the estimated end of today's last entry, offset-adjusted
 *     (its scheduled time + duration + offset)
 *
 * "Active hours" is the right gate for hiding the "current" indicator
 * outside the actual run hours — it cleanly captures pre-show, post-show,
 * and any non-schedule day. The duration-of-last-entry buffer keeps the
 * gate from flipping the moment the last dance starts.
 *
 * Offset-aware. When the user has anchored a current dance and the
 * competition is running ±N minutes off schedule, the active-hours
 * window shifts by the same offset. Without this, a competition that
 * runs an hour late would have the "current" indicator vanish at the
 * scheduled end time even while the last dance is still being judged.
 *
 * Pure: takes today's date string, now-in-minutes, and offset-in-minutes
 * as args so tests can drive it deterministically without freezing the
 * system clock or instantiating the navigation store.
 */
export function isWithinActiveHours(
  flatEntries: IndexedEntry[],
  dayDates: readonly string[],
  todayDate: string,
  nowMinutes: number,
  offsetMinutes: number = 0,
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

  // The offset shifts both ends of the window equally: a 60-minute delay
  // moves both first-entry-time and last-entry-end-time 60 minutes later
  // in wall-clock terms. A negative offset (event running early) shifts
  // both earlier by the same amount.
  return (
    nowMinutes >= firstTime + offsetMinutes &&
    nowMinutes <= lastTime + lastDuration + offsetMinutes
  )
}
