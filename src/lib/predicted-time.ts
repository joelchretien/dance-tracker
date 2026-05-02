import { parseTime } from './time'

/** Inverse of parseTime: 615 → "10:15 AM". Wraps around midnight. */
export function formatMinutesAsTime(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h24 = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * Apply a wall-clock offset to a scheduled time. Returns the input unchanged
 * if the time can't be parsed.
 */
export function predictedTime(scheduledTime: string, offsetMinutes: number): string {
  const sched = parseTime(scheduledTime)
  if (sched < 0) return scheduledTime
  return formatMinutesAsTime(sched + offsetMinutes)
}
