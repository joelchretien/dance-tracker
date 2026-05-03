import { describe, it, expect } from 'vitest'
import { enrichSearchResults, type SearchEnrichOptions } from '@/lib/search-enrich'
import type { IndexedEntry } from '@/types/schedule'

function dance(
  globalIndex: number,
  title: string,
  opts: { dancers?: string[]; studio?: string; num?: number; time?: string; dayIndex?: number; category?: string } = {},
): IndexedEntry {
  return {
    entry: {
      type: 'dance',
      time: opts.time ?? '8:00 AM',
      title,
      num: opts.num,
      dancers: opts.dancers,
      studio: opts.studio,
      category: opts.category ?? 'JAZZ · SOLO · COMPETITIVE DIV 1',
    },
    dayIndex: opts.dayIndex ?? 0,
    globalIndex,
  }
}

function awards(globalIndex: number, dayIndex = 0): IndexedEntry {
  return {
    entry: { type: 'awards', time: '12:00 PM', title: 'AWARDS' },
    dayIndex,
    globalIndex,
  }
}

function makeOpts(overrides: Partial<SearchEnrichOptions> = {}): SearchEnrichOptions {
  return {
    flatEntries: [],
    dayLabels: ['FRIDAY MAY 1', 'SATURDAY MAY 2', 'SUNDAY MAY 3'],
    watchedDancerSet: new Set(),
    watchedAwardsSet: new Set(),
    watchedStudios: new Set(),
    watchedDancersByAwardsIndex: new Map(),
    activeIndex: -1,
    activeIsLikely: false,
    scheduleOffsetMinutes: null,
    ...overrides,
  }
}

describe('enrichSearchResults', () => {
  it('returns empty array for empty query', () => {
    expect(enrichSearchResults('', makeOpts())).toEqual([])
    expect(enrichSearchResults('   ', makeOpts())).toEqual([])
  })

  it('returns empty array when nothing matches', () => {
    const opts = makeOpts({ flatEntries: [dance(0, 'Lucky 7')] })
    expect(enrichSearchResults('xyz', opts)).toEqual([])
  })

  it('finds matches by title', () => {
    const opts = makeOpts({ flatEntries: [dance(0, 'Lucky 7'), dance(1, 'Happy Days')] })
    const r = enrichSearchResults('lucky', opts)
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Lucky 7')
  })

  it('finds matches by exact entry number', () => {
    const opts = makeOpts({ flatEntries: [dance(0, 'Lucky 7', { num: 42 }), dance(1, 'Happy', { num: 100 })] })
    const r = enrichSearchResults('42', opts)
    expect(r).toHaveLength(1)
    expect(r[0].num).toBe(42)
  })

  it('uses first 3 chars of day label for dayShort', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'A', { dayIndex: 0 }), dance(1, 'B', { dayIndex: 1 }), dance(2, 'C', { dayIndex: 2 })],
    })
    const r = enrichSearchResults('A', opts)
    expect(r[0].dayShort).toBe('FRI')
    expect(enrichSearchResults('B', opts)[0].dayShort).toBe('SAT')
    expect(enrichSearchResults('C', opts)[0].dayShort).toBe('SUN')
  })

  it('handles missing day label gracefully', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'A', { dayIndex: 99 })],
      dayLabels: ['FRIDAY MAY 1'],
    })
    const r = enrichSearchResults('A', opts)
    expect(r[0].dayShort).toBe('')
  })

  it('flags entries with watched dancers as isWatched', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky', { dancers: ['Alice', 'Bob'] }), dance(1, 'Lucky 2', { dancers: ['Charlie'] })],
      watchedDancerSet: new Set(['Alice']),
    })
    const r = enrichSearchResults('lucky', opts)
    const a = r.find(x => x.title === 'Lucky')!
    const b = r.find(x => x.title === 'Lucky 2')!
    expect(a.isWatched).toBe(true)
    expect(a.watchedDancers).toEqual(['Alice'])
    expect(b.isWatched).toBe(false)
    expect(b.watchedDancers).toEqual([])
  })

  it('flags sameStudio for non-watched dancers in a watched studio', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky', { dancers: ['Charlie'], studio: 'Acme' })],
      watchedStudios: new Set(['Acme']),
    })
    const r = enrichSearchResults('lucky', opts)
    expect(r[0].isWatched).toBe(false)
    expect(r[0].sameStudio).toBe(true)
  })

  it('marks the active entry', () => {
    const opts = makeOpts({
      flatEntries: [dance(5, 'Lucky'), dance(6, 'Lucky 2')],
      activeIndex: 5,
      activeIsLikely: true,
    })
    const r = enrichSearchResults('lucky', opts)
    const a = r.find(x => x.globalIndex === 5)!
    const b = r.find(x => x.globalIndex === 6)!
    expect(a.isMarked).toBe(true)
    expect(a.isLikely).toBe(true)
    expect(b.isMarked).toBe(false)
  })

  it('shows scheduled time when no offset', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky', { time: '4:30 PM' })],
      scheduleOffsetMinutes: null,
    })
    const r = enrichSearchResults('lucky', opts)
    expect(r[0].displayTime).toBe('4:30 PM')
    expect(r[0].hasOffset).toBe(false)
  })

  it('shows scheduled time when offset is below threshold', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky', { time: '4:30 PM' })],
      scheduleOffsetMinutes: 3,
    })
    const r = enrichSearchResults('lucky', opts)
    expect(r[0].displayTime).toBe('4:30 PM')
    expect(r[0].hasOffset).toBe(false)
  })

  it('shows predicted time when offset is meaningful', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky', { time: '4:30 PM' })],
      scheduleOffsetMinutes: 15,
    })
    const r = enrichSearchResults('lucky', opts)
    expect(r[0].displayTime).toBe('~4:45 PM')
    expect(r[0].hasOffset).toBe(true)
  })

  it('handles negative offsets (running ahead)', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky', { time: '4:30 PM' })],
      scheduleOffsetMinutes: -10,
    })
    const r = enrichSearchResults('lucky', opts)
    expect(r[0].displayTime).toBe('~4:20 PM')
    expect(r[0].hasOffset).toBe(true)
  })

  it('uses awards-block dancers for awards entries', () => {
    const opts = makeOpts({
      flatEntries: [awards(5)],
      watchedAwardsSet: new Set([5]),
      watchedDancersByAwardsIndex: new Map([[5, ['Alice', 'Bob']]]),
    })
    const r = enrichSearchResults('awards', opts)
    expect(r).toHaveLength(1)
    expect(r[0].isWatched).toBe(true)
    expect(r[0].watchedDancers).toEqual(['Alice', 'Bob'])
    expect(r[0].subtitle).toBe('Awards')
  })

  it('sorts by score descending', () => {
    const opts = makeOpts({
      flatEntries: [dance(0, 'Lucky Number'), dance(1, 'Lucky'), dance(2, 'Looney Lucky')],
    })
    const r = enrichSearchResults('lucky', opts)
    // Exact match should rank highest
    expect(r[0].title).toBe('Lucky')
  })

  it('caps results at maxResults (default 20)', () => {
    const flatEntries = Array.from({ length: 30 }, (_, i) => dance(i, `Match ${i}`))
    const r = enrichSearchResults('match', makeOpts({ flatEntries }))
    expect(r).toHaveLength(20)
  })

  it('respects custom maxResults', () => {
    const flatEntries = Array.from({ length: 10 }, (_, i) => dance(i, `Match ${i}`))
    const r = enrichSearchResults('match', makeOpts({ flatEntries, maxResults: 3 }))
    expect(r).toHaveLength(3)
  })

  it('skips break entries (not dances or awards)', () => {
    const flatEntries: IndexedEntry[] = [
      { entry: { type: 'break', time: '12:00 PM', title: 'LUNCH' }, dayIndex: 0, globalIndex: 0 },
      dance(1, 'Lunch Special'),
    ]
    const r = enrichSearchResults('lunch', makeOpts({ flatEntries }))
    // Only the dance should match, not the break
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Lunch Special')
  })
})
