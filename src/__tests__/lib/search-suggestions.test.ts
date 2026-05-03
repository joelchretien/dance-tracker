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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
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
      activeIndex: null,
    })
    expect(out.map(s => s.key)).toEqual(['next-watched', 'previous-awards', 'next-awards'])
  })

  // The bug: when the comp runs offset from wall-clock, "previous"/"next"
  // by wall-clock-time is wrong. A user sitting on the awards block whose
  // scheduled time was 9:33 AM, with comp running 30min late, has wall-
  // clock = 10:03 AM. Walking by wall-clock-time would say "previous
  // awards" is the SAME awards block we're sitting on (its scheduled
  // 9:33 AM <= 10:03 AM wall now). Walking by activeIndex correctly
  // says "previous awards before the one we're sitting on" — and finds
  // the prior day's awards (or none, if it's the first awards in the
  // schedule).
  describe('activeIndex pivot (when anchor is set)', () => {
    it('previous-awards uses schedule position, not wall-clock', () => {
      // User is sitting on the Sunday 5 PM awards (index 4). Wall-clock
      // says 6 PM. By wall-clock-time, both Saturday 4 PM and Sunday
      // 5 PM are "previous" — and walking backwards from the end picks
      // the latest one, which is Sunday 5 PM (the one the user is ON).
      // By activeIndex, "previous" means earlier in the schedule, so
      // Saturday 4 PM (index 2) is picked.
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-03',
        nowMinutes: 18 * 60,
        nextWatchedIndex: null,
        activeIndex: 4, // Sunday 5 PM awards
      })
      const prev = out.find(s => s.key === 'previous-awards')
      expect(prev?.globalIndex).toBe(2) // Saturday 4 PM, NOT 4
    })

    it('next-awards uses schedule position, not wall-clock', () => {
      // User on Saturday's 4 PM awards (index 2). Comp running EARLY,
      // wall-clock is 3 PM. By wall-clock-time, Saturday 4 PM is "next"
      // (it's later than 3 PM) — and forward-walk picks Saturday 4 PM,
      // the SAME awards we're on. By activeIndex, "next" is the awards
      // block AFTER index 2, which is Sunday 5 PM (index 4).
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-02',
        nowMinutes: 15 * 60,
        nextWatchedIndex: null,
        activeIndex: 2, // Saturday 4 PM awards
      })
      const next = out.find(s => s.key === 'next-awards')
      expect(next?.globalIndex).toBe(4) // Sunday 5 PM, NOT 2
    })

    it('previous-awards finds the one immediately before activeIndex even if anchored to a non-awards entry', () => {
      // User anchored on Sunday's "Sunday Open" dance (index 3).
      // The previous awards in schedule order is Saturday's 4 PM
      // (index 2). Wall-clock-comparison would also pick this one,
      // so this test isn't a regression catch — but it locks the
      // expected behavior for the common case.
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-03',
        nowMinutes: 8 * 60 + 30,
        nextWatchedIndex: null,
        activeIndex: 3,
      })
      const prev = out.find(s => s.key === 'previous-awards')
      expect(prev?.globalIndex).toBe(2)
    })

    it('returns null for previous when activeIndex is at or before the first awards block', () => {
      // User on the very first dance, before any awards. There IS
      // no previous awards.
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-02',
        nowMinutes: 8 * 60,
        nextWatchedIndex: null,
        activeIndex: 0,
      })
      expect(out.find(s => s.key === 'previous-awards')).toBeUndefined()
    })

    it('returns null for next when activeIndex is at or past the last awards block', () => {
      // User on the very last awards. Nothing comes after.
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-03',
        nowMinutes: 17 * 60,
        nextWatchedIndex: null,
        activeIndex: 4,
      })
      expect(out.find(s => s.key === 'next-awards')).toBeUndefined()
    })

    it('falls back to wall-clock when activeIndex is null (no anchor)', () => {
      // Same input as the offset bug repro, but without an anchor.
      // Should pick by wall-clock now (current behavior preserved).
      const out = buildSearchSuggestions({
        flatEntries: FLAT,
        dayLabels: DAY_LABELS,
        dayDates: DAY_DATES,
        todayDate: '2026-05-03',
        nowMinutes: 18 * 60,
        nextWatchedIndex: null,
        activeIndex: null,
      })
      const prev = out.find(s => s.key === 'previous-awards')
      // Wall-clock-walking finds Sunday 5 PM (index 4) since 5 PM <= 6 PM.
      expect(prev?.globalIndex).toBe(4)
    })
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
