import { describe, it, expect } from 'vitest'
import { findLikelyCurrentIndex } from '@/lib/auto-advance'
import type { IndexedEntry, DanceEntry } from '@/types/schedule'

function makeDance(time: string, title: string): DanceEntry {
  return { type: 'dance', time, title, num: 1 }
}

function makeEntries(times: string[]): IndexedEntry[] {
  return times.map((t, i) => ({
    entry: makeDance(t, `Dance ${i + 1}`),
    globalIndex: i,
    dayIndex: 0,
  }))
}

function makeMultiDayEntries(day0Times: string[], day1Times: string[]): IndexedEntry[] {
  const entries: IndexedEntry[] = []
  let gi = 0
  for (const t of day0Times) {
    entries.push({ entry: makeDance(t, `D0-${gi}`), globalIndex: gi, dayIndex: 0 })
    gi++
  }
  for (const t of day1Times) {
    entries.push({ entry: makeDance(t, `D1-${gi}`), globalIndex: gi, dayIndex: 1 })
    gi++
  }
  return entries
}

describe('findLikelyCurrentIndex', () => {
  it('stays at anchor when no time has passed', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM', '9:10 AM', '9:15 AM'])
    // Anchor: index 1 (9:05 AM), set at wall clock 9:20 AM (15 min late)
    // Current wall clock: still 9:20 AM → expected schedule = 9:05 AM → index 1
    const result = findLikelyCurrentIndex(entries, 1, 9 * 60 + 20, 9 * 60 + 20)
    expect(result).toBe(1)
  })

  it('advances when enough wall time has passed', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM', '9:10 AM', '9:15 AM'])
    // Anchor: index 1 (9:05 AM), set at 9:20 AM (15 min late)
    // Wall clock now: 9:25 AM → expected = 9:25 - 15 = 9:10 AM → index 2
    const result = findLikelyCurrentIndex(entries, 1, 9 * 60 + 20, 9 * 60 + 25)
    expect(result).toBe(2)
  })

  it('advances multiple entries when significant time has passed', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM', '9:10 AM', '9:15 AM'])
    // Anchor: index 0 (9:00 AM), set at 9:00 AM (on time)
    // Wall clock now: 9:15 AM → expected = 9:15 AM → index 3
    const result = findLikelyCurrentIndex(entries, 0, 9 * 60, 9 * 60 + 15)
    expect(result).toBe(3)
  })

  it('stays at last entry when past all scheduled times', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM', '9:10 AM'])
    // Anchor: index 0, set at 9:00 AM (on time)
    // Wall clock now: 10:00 AM → expected = 10:00 AM, past all entries → last one
    const result = findLikelyCurrentIndex(entries, 0, 9 * 60, 10 * 60)
    expect(result).toBe(2)
  })

  it('handles competition running early (negative offset)', () => {
    const entries = makeEntries(['9:00 AM', '9:05 AM', '9:10 AM', '9:15 AM'])
    // Anchor: index 1 (9:05 AM), set at 9:00 AM (5 min early!)
    // offset = 9:00 - 9:05 = -5
    // Wall clock now: 9:08 AM → expected = 9:08 - (-5) = 9:13 AM → index 2 (9:10)
    const result = findLikelyCurrentIndex(entries, 1, 9 * 60, 9 * 60 + 8)
    expect(result).toBe(2)
  })

  it('does not cross day boundaries', () => {
    const entries = makeMultiDayEntries(
      ['9:00 AM', '9:05 AM'],
      ['9:00 AM', '9:05 AM'],
    )
    // Anchor: index 1 (day 0, 9:05 AM), set at 9:05 AM
    // Wall clock now: 10:00 AM → expected = 10:00 AM
    // Should stay on day 0 entries only → last day 0 entry = index 1
    const result = findLikelyCurrentIndex(entries, 1, 9 * 60 + 5, 10 * 60)
    expect(result).toBe(1)
  })

  it('returns anchor when expected time is before all entries', () => {
    const entries = makeEntries(['10:00 AM', '10:05 AM', '10:10 AM'])
    // Anchor: index 0 (10:00 AM), set at 10:00 AM
    // But somehow current wall time is 9:50 AM (went back in time / test scenario)
    // expected = 9:50 AM, before first entry → fall back to anchor
    const result = findLikelyCurrentIndex(entries, 0, 10 * 60, 9 * 60 + 50)
    expect(result).toBe(0)
  })

  it('handles empty entries', () => {
    const result = findLikelyCurrentIndex([], 0, 9 * 60, 9 * 60 + 10)
    expect(result).toBe(0)
  })

  it('handles anchor index out of bounds', () => {
    const entries = makeEntries(['9:00 AM'])
    const result = findLikelyCurrentIndex(entries, 99, 9 * 60, 9 * 60 + 10)
    expect(result).toBe(99) // falls back to anchorIndex
  })

  it('picks the last of multiple entries sharing the same time', () => {
    const entries = makeEntries(['9:00 AM', '9:00 AM', '9:00 AM', '9:05 AM'])
    // Anchor: index 0 (9:00 AM), set at 9:00 AM
    // Wall clock: 9:03 AM → expected = 9:03 AM → last entry at 9:00 = index 2
    const result = findLikelyCurrentIndex(entries, 0, 9 * 60, 9 * 60 + 3)
    expect(result).toBe(2)
  })
})
