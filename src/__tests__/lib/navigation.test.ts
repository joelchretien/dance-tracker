import { describe, it, expect } from 'vitest'
import { findNowIndex, todayDayIndex } from '@/lib/navigation'
import type { IndexedEntry } from '@/types/schedule'

function entry(i: number, time: string, dayIndex: number): IndexedEntry {
  return { entry: { type: 'dance', time, title: `Dance ${i}` }, dayIndex, globalIndex: i }
}

describe('findNowIndex', () => {
  const entries = [
    entry(0, '8:00 AM', 0),
    entry(1, '9:00 AM', 0),
    entry(2, '10:00 AM', 0),
    entry(3, '8:00 AM', 1),
    entry(4, '9:00 AM', 1),
  ]

  it('finds first entry at or after current time', () => {
    expect(findNowIndex(entries, 8 * 60 + 30, 0)).toBe(1) // 8:30 → 9:00 AM entry
  })

  it('returns first entry if before all', () => {
    expect(findNowIndex(entries, 7 * 60, 0)).toBe(0)
  })

  it('returns last entry if after all', () => {
    expect(findNowIndex(entries, 23 * 60, 0)).toBe(2)
  })

  it('finds correct day', () => {
    expect(findNowIndex(entries, 8 * 60 + 30, 1)).toBe(4)
  })

  it('returns null if no entries for day', () => {
    expect(findNowIndex(entries, 8 * 60, 5)).toBeNull()
  })
})

describe('todayDayIndex', () => {
  const days = ['2025-04-11', '2025-04-12']

  it('returns matching day index', () => {
    expect(todayDayIndex(days, '2025-04-11')).toBe(0)
    expect(todayDayIndex(days, '2025-04-12')).toBe(1)
  })

  it('returns last day when today is after all days', () => {
    expect(todayDayIndex(days, '2025-04-15')).toBe(1)
  })

  it('returns 0 when today is before all days', () => {
    expect(todayDayIndex(days, '2025-04-01')).toBe(0)
  })

  it('returns closest earlier day when between days', () => {
    const spread = ['2025-04-05', '2025-04-10', '2025-04-15']
    expect(todayDayIndex(spread, '2025-04-12')).toBe(1)
  })

  it('handles single day schedule', () => {
    expect(todayDayIndex(['2025-04-11'], '2025-04-11')).toBe(0)
    expect(todayDayIndex(['2025-04-11'], '2025-04-15')).toBe(0)
    expect(todayDayIndex(['2025-04-11'], '2025-04-01')).toBe(0)
  })
})
