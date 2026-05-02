import { describe, it, expect } from 'vitest'
import { getEntryDurationMinutes } from '@/lib/entry-duration'
import type { IndexedEntry, DanceEntry } from '@/types/schedule'

function makeDance(time: string): DanceEntry {
  return { type: 'dance', time, title: 'Test', num: 1 }
}

function makeEntries(times: string[], dayIndex = 0): IndexedEntry[] {
  return times.map((t, i) => ({
    entry: makeDance(t),
    globalIndex: i,
    dayIndex,
  }))
}

describe('getEntryDurationMinutes', () => {
  it('computes gap to next entry', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM', '9:10 AM'])
    expect(getEntryDurationMinutes(entries, 0)).toBe(5)
    expect(getEntryDurationMinutes(entries, 1)).toBe(5)
  })

  it('returns default for last entry of the day', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM'])
    expect(getEntryDurationMinutes(entries, 1)).toBe(3)
  })

  it('returns default for out-of-bounds index', () => {
    const entries = makeEntries(['9:00 AM'])
    expect(getEntryDurationMinutes(entries, 99)).toBe(3)
  })

  it('returns default for empty entries', () => {
    expect(getEntryDurationMinutes([], 0)).toBe(3)
  })

  it('does not cross day boundaries', () => {
    const entries: IndexedEntry[] = [
      { entry: makeDance('10:00 PM'), globalIndex: 0, dayIndex: 0 },
      { entry: makeDance('8:00 AM'), globalIndex: 1, dayIndex: 1 },
    ]
    expect(getEntryDurationMinutes(entries, 0)).toBe(3)
  })

  it('handles 2-minute gaps', () => {
    const entries = makeEntries(['8:00 AM', '8:02 AM', '8:05 AM'])
    expect(getEntryDurationMinutes(entries, 0)).toBe(2)
    expect(getEntryDurationMinutes(entries, 1)).toBe(3)
  })
})
