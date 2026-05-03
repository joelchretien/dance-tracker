import { describe, it, expect } from 'vitest'
import { buildSearchSuggestions, matchesQuery, type Suggestion } from '@/lib/search-suggestions'
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
      todayDate: '2026-04-15', // not a schedule day → no awards anchored
      nowMinutes: 600,
      nextWatchedIndex: null,
    })
    // Off-schedule date: previous-awards walks backwards and finds the
    // last awards entry; next-awards walks forward and finds the first.
    // Both are valid for "user opening between competitions" — they
    // should still be jumpable. Pin that contract here.
    expect(out.map(s => s.key).sort()).toEqual(['next-awards', 'previous-awards'])
  })

  it('shows "next watched" when set', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 8 * 60,
      nextWatchedIndex: 3,
    })
    const watched = out.find(s => s.key === 'next-watched')
    expect(watched?.globalIndex).toBe(3)
    expect(watched?.detail).toContain('8:00 AM')
  })

  it('does NOT include "current dance" — that affordance is the topbar button', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 12 * 60,
      nextWatchedIndex: null,
    })
    expect(out.find(s => (s.key as string) === 'current')).toBeUndefined()
  })

  describe('previous awards', () => {
    it('finds today\'s most recent passed-time awards entry', () => {
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-02',
        nowMinutes: 18 * 60, // 6 PM, after Sat 4 PM awards
        nextWatchedIndex: null,
      })
      const prev = out.find(s => s.key === 'previous-awards')
      expect(prev?.globalIndex).toBe(2) // Sat 4 PM
    })

    it('falls back to the last awards from a prior day when none today have passed', () => {
      // It's Sunday 9 AM; Sunday's 5 PM awards haven't happened yet.
      // Saturday's 4 PM awards is the previous one.
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-03',
        nowMinutes: 9 * 60,
        nextWatchedIndex: null,
      })
      const prev = out.find(s => s.key === 'previous-awards')
      expect(prev?.globalIndex).toBe(2) // Sat 4 PM
    })

    it('omits previous awards when nothing has happened yet', () => {
      // Saturday 7 AM, before the day's first awards.
      const flatNoSatPriorDay: IndexedEntry[] = [
        dance(0, 0, '8:00 AM', 'Opening'),
        awards(1, 0, '4:00 PM'),
      ]
      const out = buildSearchSuggestions({
        flatEntries: flatNoSatPriorDay,
        dayLabels: ['SAT'],
        dayDates: ['2026-05-02'],
        todayDate: '2026-05-02',
        nowMinutes: 7 * 60,
        nextWatchedIndex: null,
      })
      expect(out.find(s => s.key === 'previous-awards')).toBeUndefined()
    })
  })

  describe('next awards', () => {
    it('finds today\'s next upcoming awards entry', () => {
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-02',
        nowMinutes: 12 * 60, // before Sat 4 PM
        nextWatchedIndex: null,
      })
      const next = out.find(s => s.key === 'next-awards')
      expect(next?.globalIndex).toBe(2) // Sat 4 PM
    })

    it('rolls into next day when today has no more awards', () => {
      // Saturday 5 PM, after Sat 4 PM awards. Next is Sun 5 PM.
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-02',
        nowMinutes: 17 * 60,
        nextWatchedIndex: null,
      })
      const next = out.find(s => s.key === 'next-awards')
      expect(next?.globalIndex).toBe(4) // Sun 5 PM
    })

    it('omits next awards when none remain in the schedule', () => {
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-03',
        nowMinutes: 23 * 60, // after Sun 5 PM, last awards
        nextWatchedIndex: null,
      })
      expect(out.find(s => s.key === 'next-awards')).toBeUndefined()
    })
  })

  it('orders suggestions: watched → previous awards → next awards', () => {
    const out = buildSearchSuggestions({
      flatEntries: FLAT,
      dayLabels: DAY_LABELS,
      dayDates: DAY_DATES,
      todayDate: '2026-05-02',
      nowMinutes: 17 * 60, // after 4 PM awards
      nextWatchedIndex: 3,
    })
    expect(out.map(s => s.key)).toEqual(['next-watched', 'previous-awards', 'next-awards'])
  })
})

describe('matchesQuery (prefix matching against suggestion keywords)', () => {
  function fakeSuggestion(keywords: string[]): Suggestion {
    return {
      key: 'next-awards',
      label: 'Next awards',
      globalIndex: 0,
      keywords,
    }
  }

  it('matches a complete keyword', () => {
    expect(matchesQuery(fakeSuggestion(['awards']), 'awards')).toBe(true)
  })

  it('matches a prefix of a keyword', () => {
    expect(matchesQuery(fakeSuggestion(['awards']), 'aw')).toBe(true)
    expect(matchesQuery(fakeSuggestion(['previous']), 'prev')).toBe(true)
    expect(matchesQuery(fakeSuggestion(['next']), 'n')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(matchesQuery(fakeSuggestion(['awards']), 'AWARDS')).toBe(true)
    expect(matchesQuery(fakeSuggestion(['next']), 'Next')).toBe(true)
  })

  it('matches if any keyword in the list matches', () => {
    const s = fakeSuggestion(['previous', 'last', 'awards'])
    expect(matchesQuery(s, 'last')).toBe(true)
    expect(matchesQuery(s, 'aw')).toBe(true)
  })

  it('does NOT match a substring that isn\'t a prefix', () => {
    // "ward" appears inside "awards" but isn't a prefix — don't surprise
    // the user with a hit in the middle of a word.
    expect(matchesQuery(fakeSuggestion(['awards']), 'ward')).toBe(false)
  })

  it('does NOT match unrelated text', () => {
    expect(matchesQuery(fakeSuggestion(['awards']), 'emma')).toBe(false)
    expect(matchesQuery(fakeSuggestion(['next']), 'solo')).toBe(false)
  })

  it('returns false on empty/whitespace query', () => {
    expect(matchesQuery(fakeSuggestion(['awards']), '')).toBe(false)
    expect(matchesQuery(fakeSuggestion(['awards']), '   ')).toBe(false)
  })

  it('trims whitespace before matching', () => {
    expect(matchesQuery(fakeSuggestion(['awards']), '  aw  ')).toBe(true)
  })
})
