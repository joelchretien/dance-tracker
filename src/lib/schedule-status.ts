import type { ScheduleStatus } from '@/types/schedule'

/**
 * Classify how the competition is running relative to the scheduled time.
 *
 * @param entryTimeMinutes scheduled time of the current entry (minutes since midnight)
 * @param nowMinutes current time (minutes since midnight)
 * @param sameDay whether the selected entry's day matches today's date
 * @param entryDayLabel label for the entry's day (e.g. "Saturday schedule") shown when wrong day
 */
export function classifyScheduleStatus(
  entryTimeMinutes: number,
  nowMinutes: number,
  sameDay: boolean,
  entryDayLabel: string,
): ScheduleStatus {
  if (entryTimeMinutes < 0) return { kind: 'not-started' }

  if (!sameDay) return { kind: 'wrong-day', dayLabel: entryDayLabel }

  const diff = nowMinutes - entryTimeMinutes // positive = behind schedule

  if (diff < -5) return { kind: 'ahead', minutes: Math.round(Math.abs(diff)) }
  if (diff <= 5) return { kind: 'on-schedule' }
  if (diff <= 30) return { kind: 'behind', minutes: Math.round(diff) }
  return { kind: 'way-behind', minutes: Math.round(diff) }
}
