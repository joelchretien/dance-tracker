/**
 * Hand-rolled validator for schedule JSON files. Schedules are converted from
 * PDFs by a separate Claude skill and dropped into public/schedules/ — typos
 * like type:"danse" or missing time fields would otherwise propagate silently
 * to render code (which uses optional chains and produces empty UI). This
 * validator throws at the boundary so loadSchedule's catch can surface a
 * meaningful error instead of leaving the user staring at a half-rendered
 * schedule.
 */

const VALID_ENTRY_TYPES = new Set(['dance', 'awards', 'break'])

function fail(path: string, msg: string): never {
  throw new Error(`Invalid schedule at ${path}: ${msg}`)
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function validateSchedule(data: unknown): void {
  if (!isPlainObject(data)) fail('root', 'expected object')

  const meta = data.meta
  if (!isPlainObject(meta)) fail('meta', 'expected object')
  if (typeof meta.id !== 'string' || !meta.id) fail('meta.id', 'expected non-empty string')
  if (typeof meta.name !== 'string' || !meta.name) fail('meta.name', 'expected non-empty string')

  const days = data.days
  if (!Array.isArray(days)) fail('days', 'expected array')
  if (days.length === 0) fail('days', 'expected at least one day')

  days.forEach((day, di) => {
    const path = `days[${di}]`
    if (!isPlainObject(day)) fail(path, 'expected object')
    if (typeof day.label !== 'string' || !day.label) fail(`${path}.label`, 'expected non-empty string')
    if (typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      fail(`${path}.date`, 'expected YYYY-MM-DD string')
    }
    if (!Array.isArray(day.entries)) fail(`${path}.entries`, 'expected array')

    day.entries.forEach((entry, ei) => {
      const ep = `${path}.entries[${ei}]`
      if (!isPlainObject(entry)) fail(ep, 'expected object')
      if (typeof entry.type !== 'string') fail(`${ep}.type`, 'expected string')
      if (!VALID_ENTRY_TYPES.has(entry.type)) {
        fail(`${ep}.type`, `expected one of ${[...VALID_ENTRY_TYPES].join('|')}, got "${entry.type}"`)
      }
      if (typeof entry.time !== 'string' || !entry.time) fail(`${ep}.time`, 'expected non-empty string')
      if (typeof entry.title !== 'string') fail(`${ep}.title`, 'expected string')

      if (entry.type === 'dance') {
        // num optional but if present must be number
        if (entry.num !== undefined && typeof entry.num !== 'number') {
          fail(`${ep}.num`, 'expected number when present')
        }
        // dancers optional but if present must be string array
        if (entry.dancers !== undefined) {
          if (!Array.isArray(entry.dancers)) fail(`${ep}.dancers`, 'expected array')
          entry.dancers.forEach((d, i) => {
            if (typeof d !== 'string') fail(`${ep}.dancers[${i}]`, 'expected string')
          })
        }
        // studio optional, string when present
        if (entry.studio !== undefined && typeof entry.studio !== 'string') {
          fail(`${ep}.studio`, 'expected string when present')
        }
      }
    })
  })
}
