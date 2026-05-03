/**
 * Hand-rolled validator for schedule JSON files. Schedules are converted from
 * PDFs by a separate Claude skill and dropped into public/schedules/ — typos
 * like type:"danse" or missing time fields would otherwise propagate silently
 * to render code (which uses optional chains and produces empty UI). This
 * validator throws at the boundary so loadSchedule's catch can surface a
 * meaningful error instead of leaving the user staring at a half-rendered
 * schedule.
 *
 * Goes beyond shape: every entry's time must be a parseable, in-range
 * 12-hour value, and entries within a day must be chronologically ordered.
 * Both invariants are assumed downstream by entry-duration, auto-advance,
 * findNowIndex, and the gap rendering in WatchedDancesList — silent drift
 * here would manifest as wrong "now" indices or negative durations far from
 * the actual cause.
 */

import { parseTime } from './time'

const VALID_ENTRY_TYPES = new Set(['dance', 'awards', 'break'])

/** Same grammar the route accepts; keeping these in sync prevents
 * unloadable schedules whose ID contains characters the router rejects. */
const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/

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
  if (!SAFE_ID_RE.test(meta.id as string)) {
    fail('meta.id', `must match ${SAFE_ID_RE} (alphanumeric, dash, underscore)`)
  }
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

    let prevMinutes = -1
    day.entries.forEach((entry, ei) => {
      const ep = `${path}.entries[${ei}]`
      if (!isPlainObject(entry)) fail(ep, 'expected object')
      if (typeof entry.type !== 'string') fail(`${ep}.type`, 'expected string')
      if (!VALID_ENTRY_TYPES.has(entry.type)) {
        fail(`${ep}.type`, `expected one of ${[...VALID_ENTRY_TYPES].join('|')}, got "${entry.type}"`)
      }
      if (typeof entry.time !== 'string' || !entry.time) fail(`${ep}.time`, 'expected non-empty string')
      if (typeof entry.title !== 'string') fail(`${ep}.title`, 'expected string')

      const minutes = parseTime(entry.time as string)
      if (minutes < 0) fail(`${ep}.time`, `unparseable time "${entry.time}"`)
      if (minutes < prevMinutes) {
        fail(`${ep}.time`, `entries must be chronological within a day (got ${entry.time} after a later time)`)
      }
      prevMinutes = minutes

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
        // category optional, string when present
        if (entry.category !== undefined && typeof entry.category !== 'string') {
          fail(`${ep}.category`, 'expected string when present')
        }
        // age optional, number when present
        if (entry.age !== undefined && typeof entry.age !== 'number') {
          fail(`${ep}.age`, 'expected number when present')
        }
      }
    })
  })
}

/**
 * Validates the shape of public/schedules/index.json. Schedules listed
 * here drive the picker, the route resolution, and which JSON files
 * the SW caches as schedule data. A typo or wrong shape would surface
 * as confusing "Failed to load" errors deeper in the stack rather than
 * a clear "manifest is malformed" at boundary load time.
 *
 * Each manifest entry's id must match the same SAFE_ID_RE that the
 * router and the schedule-file validator already use, so a manifest
 * can never reference a schedule that the route would reject or that
 * the schedule-file validator would block from loading.
 */
export interface ManifestEntry {
  id: string
  name: string
}

export interface Manifest {
  schedules: ManifestEntry[]
}

export function validateManifest(data: unknown): asserts data is Manifest {
  if (!isPlainObject(data)) fail('manifest', 'expected an object')
  if (!Array.isArray(data.schedules)) fail('manifest.schedules', 'expected array')
  data.schedules.forEach((entry: unknown, i: number) => {
    const path = `manifest.schedules[${i}]`
    if (!isPlainObject(entry)) fail(path, 'expected object')
    if (typeof entry.id !== 'string' || !entry.id) fail(`${path}.id`, 'expected non-empty string')
    if (!SAFE_ID_RE.test(entry.id)) {
      fail(`${path}.id`, `must match ${SAFE_ID_RE} (got "${entry.id}")`)
    }
    if (typeof entry.name !== 'string' || !entry.name) {
      fail(`${path}.name`, 'expected non-empty string')
    }
  })

  // Reject duplicate ids — last-write-wins routing would silently mask
  // one of the entries.
  const seen = new Set<string>()
  for (const entry of data.schedules) {
    if (seen.has(entry.id)) fail('manifest.schedules', `duplicate id "${entry.id}"`)
    seen.add(entry.id)
  }
}
