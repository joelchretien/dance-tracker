import { describe, it, expect } from 'vitest'
import { buildSearchSuggestions } from '@/lib/search-suggestions'
import type { IndexedEntry } from '@/types/schedule'

function dance(globalIndex: number, dayIndex: number, time: string, title: string): IndexedEntry {
  return { entry: { type: 'dance', time, title }, dayIndex, globalIndex }
}
function awards(globalIndex: number, dayIndex: number, time: string): IndexedEntry {
  return { entry: { type: 'awards', time, title: 'AWARDS' }, dayIndex, globalIndex }
}

const FLAT: IndexedEntry[] = [
  dance(0, 0, '8:00 AM', 'Opening'),
  dance(1, 0, '12:00 PM', 'Solo One'),
  awards(2, 0, '4:00 PM'),
  dance(3, 1, '8:00 AM', 'Sunday Open'),
  awards(4, 1, '5:00 PM'),
]
const DAY_LABELS = ['SATURDAY MAY 2', 'SUNDAY MAY 3']
const DAY_DATES = ['2026-05-02', '2026-05-03']

describe('buildSearchSuggestions', () => {
  it('returns empty list with no relevant context', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-04-15', // not a schedule day
      nowMinutes: 600,
      activeIndex: null,
      showCurrent: false,
      nextWatchedIndex: null,
    })
    expect(out).toEqual([])
  })

  it('shows "current dance" suggestion when showCurrent is true', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 12 * 60,
      activeIndex: 1, // Solo One at noon
      showCurrent: true,
      nextWatchedIndex: null,
    })
    expect(out[0].key).toBe('current')
    expect(out[0].globalIndex).toBe(1)
    expect(out[0].detail).toBe('Solo One')
  })

  it('shows "next watched" when set and distinct from active', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 8 * 60,
      activeIndex: 0,
      showCurrent: true,
      nextWatchedIndex: 3, // Sunday's open
    })
    const watched = out.find(s => s.key === 'next-watched')
    expect(watched?.globalIndex).toBe(3)
    expect(watched?.detail).toContain('8:00 AM')
  })

  it("does not duplicate the active entry as 'next watched'", () => {
    // Active = next watched: only one chip should appear (the current one).
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 8 * 60,
      activeIndex: 1,
      showCurrent: true,
      nextWatchedIndex: 1,
    })
    const watched = out.find(s => s.key === 'next-watched')
    expect(watched).toBeUndefined()
  })

  it("includes today's next awards when there's an upcoming awards block today", () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02', // Saturday
      nowMinutes: 12 * 60, // noon, before 4 PM awards
      activeIndex: null,
      showCurrent: false,
      nextWatchedIndex: null,
    })
    const a = out.find(s => s.key === 'next-awards')
    expect(a?.globalIndex).toBe(2)
    expect(a?.detail).toBe('4:00 PM')
  })

  it("hides today's awards once the time has passed", () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 17 * 60, // 5 PM, after the 4 PM awards
      activeIndex: null,
      showCurrent: false,
      nextWatchedIndex: null,
    })
    expect(out.find(s => s.key === 'next-awards')).toBeUndefined()
  })

  it('omits current chip when showCurrent is false', () => {
    // Off-hours: no anchor or wall-clock outside the window.
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 12 * 60,
      activeIndex: 1,
      showCurrent: false,
      nextWatchedIndex: null,
    })
    expect(out.find(s => s.key === 'current')).toBeUndefined()
  })

  it('orders suggestions: current → next watched → next awards', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 12 * 60,
      activeIndex: 1,
      showCurrent: true,
      nextWatchedIndex: 3,
    })
    expect(out.map(s => s.key)).toEqual(['current', 'next-watched', 'next-awards'])
  })
})
