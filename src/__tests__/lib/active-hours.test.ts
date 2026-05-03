import { describe, it, expect } from 'vitest'
import { isWithinActiveHours } from '@/lib/active-hours'
import type { IndexedEntry } from '@/types/schedule'

function entry(globalIndex: number, dayIndex: number, time: string, type: 'dance' | 'awards' | 'break' = 'dance'): IndexedEntry {
  if (type === 'dance') {
    return { entry: { type: 'dance', time, title: `D${globalIndex}` }, dayIndex, globalIndex }
  }
  return { entry: { type, time, title: `${type}` } as IndexedEntry['entry'], dayIndex, globalIndex }
}

describe('isWithinActiveHours', () => {
  // Schedule with two days; day 0 runs 8 AM → 10:39 PM, day 1 runs 8 AM → 5 PM.
  // The day-0 last entry (Awards) has no explicit duration so it falls back
  // to the default break/awards duration in entry-duration.ts.
  const flat = [
    entry(0, 0, '8:00 AM'),
    entry(1, 0, '12:00 PM'),
    entry(2, 0, '10:39 PM', 'awards'),
    entry(3, 1, '8:00 AM'),
    entry(4, 1, '5:00 PM'),
  ]
  const dayDates = ['2026-05-02', '2026-05-03']

  it('returns true during the day, between first and last entries', () => {
    // Saturday at 12:00 PM — squarely inside the window.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 12 * 60)).toBe(true)
  })

  it('returns true exactly at the first entry time', () => {
    // Boundary: equality counts as inside.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 8 * 60)).toBe(true)
  })

  it('returns false before the first entry', () => {
    // Saturday 7:55 AM — pre-show.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 7 * 60 + 55)).toBe(false)
  })

  it('returns false past the last entry plus its duration', () => {
    // The screenshot's case: Saturday 11:10 PM, 31 minutes after the
    // 10:39 PM Awards entry — the Awards' default duration is short
    // enough that 11:10 PM is past it.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 23 * 60 + 10)).toBe(false)
  })

  it('returns false on a non-schedule date (between days)', () => {
    // A date that isn't on the schedule — even at noon, off-hours.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-04', 12 * 60)).toBe(false)
  })

  it('returns false on a date before the schedule starts', () => {
    expect(isWithinActiveHours(flat, dayDates, '2026-04-15', 12 * 60)).toBe(false)
  })

  it('returns false on a date after the schedule ends', () => {
    expect(isWithinActiveHours(flat, dayDates, '2026-12-25', 12 * 60)).toBe(false)
  })

  it('returns false when today has no entries (degenerate day)', () => {
    // A schedule day exists in dayDates but has no entries on it
    // (e.g., a typo or future-day placeholder).
    const flatMissingDay = [entry(0, 0, '8:00 AM'), entry(1, 0, '5:00 PM')]
    const dates = ['2026-05-02', '2026-05-03'] // day 1 has no entries
    expect(isWithinActiveHours(flatMissingDay, dates, '2026-05-03', 12 * 60)).toBe(false)
  })

  it('handles single-day schedules', () => {
    const single = [entry(0, 0, '8:00 AM'), entry(1, 0, '5:00 PM')]
    const dates = ['2026-05-02']
    expect(isWithinActiveHours(single, dates, '2026-05-02', 12 * 60)).toBe(true)
    expect(isWithinActiveHours(single, dates, '2026-05-02', 7 * 60 + 30)).toBe(false)
  })

  it('returns false on empty schedule', () => {
    expect(isWithinActiveHours([], [], '2026-05-02', 12 * 60)).toBe(false)
  })

  // Offset-aware behavior. The `offsetMinutes` parameter shifts both ends
  // of the window equally to track the actual competition wall-clock when
  // it's running ±N minutes off the printed schedule.

  it('positive offset (running late) extends the window past scheduled end', () => {
    // Without offset, 11:10 PM Saturday is past Awards 10:39 PM end.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 23 * 60 + 10)).toBe(false)
    // With a 60-minute delay, the same wall-clock time is well inside
    // the offset-adjusted window (Awards is "running" at ~10:39 PM + 60m).
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 23 * 60 + 10, 60)).toBe(true)
  })

  it('positive offset shifts the start as well', () => {
    // Saturday 7:55 AM is pre-show without offset; with a -30 minute
    // offset (event running early) it counts as inside the window.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 7 * 60 + 55)).toBe(false)
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 7 * 60 + 55, -30)).toBe(true)
  })

  it('negative offset (running early) shifts the end earlier too', () => {
    // 5:00 PM Sunday is at the scheduled last-entry time. A negative
    // offset means the event finished before its scheduled time, so
    // 5:00 PM is past the offset-adjusted window.
    // (Last entry's duration is the awards/dance default, ~3 minutes.)
    const SUNDAY_5PM = 17 * 60
    // Negative 60: last entry's end-of-window is at lastTime + duration - 60.
    expect(isWithinActiveHours(flat, dayDates, '2026-05-03', SUNDAY_5PM, -60)).toBe(false)
  })

  it('zero offset matches default (backward compat)', () => {
    expect(isWithinActiveHours(flat, dayDates, '2026-05-02', 12 * 60))
      .toBe(isWithinActiveHours(flat, dayDates, '2026-05-02', 12 * 60, 0))
  })
})
