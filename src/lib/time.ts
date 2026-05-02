/** Parse "8:03 AM" → minutes since midnight (483) */
export function parseTime(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return -1
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
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
export function formatTimeDiff(fromMinutes: number, toMinutes: number): string {
  if (fromMinutes < 0 || toMinutes < 0) return ''
  let diff = toMinutes - fromMinutes
  if (diff < 0) diff += 1440
  if (diff === 0) return ''
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h === 0) return `~${m}min`
  if (m === 0) return `~${h}h`
  return `~${h}h ${m}min`
}
