/**
 * Parse "8:03 AM" → minutes since midnight (483).
 * Returns -1 for any unparseable input or out-of-range hour/minute. The
 * 12-hour notation only allows hours 1–12 and minutes 0–59; "0:00 AM" and
 * "13:00 PM" and "12:60 PM" all return -1, not silent nonsense.
 */
export function parseTime(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return -1
  const h12 = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (!Number.isInteger(h12) || h12 < 1 || h12 > 12) return -1
  if (!Number.isInteger(m) || m < 0 || m > 59) return -1
  const ampm = match[3].toUpperCase()
  let h = h12 % 12
  if (ampm === 'PM') h += 12
  return h * 60 + m
}

/** Current time as minutes since midnight (whole) */
export function currentTimeMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

/** Current time as fractional minutes since midnight (includes seconds) */
export function currentTimeFractionalMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
}

/** Today's date as 'YYYY-MM-DD' in local timezone */
export function localDateString(d: Date = new Date()): string {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

/**
 * Format the difference between two minute-values as a human-readable string.
 * Wraps around midnight (adds 1440 if negative, matching original tD behavior).
 */
/**
 * Format a same-day time difference as "~1h 23min" / "~45min" / "~3h".
 *
 * Both inputs must be minutes since midnight on the SAME day, with
 * `toMinutes >= fromMinutes`. The function returns empty string if the
 * diff is negative — callers crossing a day boundary should detect that
 * separately and not call this function (or guard the result), because a
 * "10pm Friday → 8am Saturday" diff isn't meaningfully expressible as a
 * single number of hours/minutes.
 */
export function formatSameDayDiff(fromMinutes: number, toMinutes: number): string {
  if (fromMinutes < 0 || toMinutes < 0) return ''
  const diff = toMinutes - fromMinutes
  if (diff <= 0) return ''
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h === 0) return `~${m}min`
  if (m === 0) return `~${h}h`
  return `~${h}h ${m}min`
}
