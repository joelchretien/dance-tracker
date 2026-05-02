import type { ScheduleStatus } from '@/types/schedule'

/**
 * Classify how the competition is running relative to the scheduled time.
 *
 * @param entryTimeMinutes scheduled time of the current entry (minutes since midnight)
 * @param nowMinutes current time (minutes since midnight)
 * @param sameDay whether the selected entry's day matches today's date
 * @param entryDayLabel label for the entry's day (e.g. "Saturday schedule") shown when wrong day
 * @param onScheduleThreshold tolerance in minutes for the "on schedule" range. Defaults
 *   to 5 (suitable for the no-anchor case where the diff naturally drifts as wall clock
 *   crosses entries). Pass 0 when an anchor is set so the user sees every minute of
 *   offset they've established by scrubbing or marking.
 */
export function classifyScheduleStatus(
  entryTimeMinutes: number,
  nowMinutes: number,
  sameDay: boolean,
  entryDayLabel: string,
  onScheduleThreshold = 5,
): ScheduleStatus {
  if (entryTimeMinutes < 0) return { kind: 'not-started' }

  if (!sameDay) return { kind: 'wrong-day', dayLabel: entryDayLabel }

  const rounded = Math.round(nowMinutes - entryTimeMinutes) // positive = behind schedule

  if (Math.abs(rounded) <= onScheduleThreshold) return { kind: 'on-schedule' }
  if (rounded < 0) return { kind: 'ahead', minutes: Math.abs(rounded) }
  if (rounded <= 30) return { kind: 'behind', minutes: rounded }
  return { kind: 'way-behind', minutes: rounded }
}
