import { describe, it, expect } from 'vitest'
import {
  normalizeMarkedIndex,
  normalizeFontSize,
  normalizeViewMode,
  normalizeWatchedDancers,
  isAnchorCoherent,
  reconcileMarkedIndexWithAnchor,
} from '@/lib/normalize-persisted'

describe('normalizeMarkedIndex', () => {
  it('clamps to valid range', () => {
    expect(normalizeMarkedIndex(5, 10)).toBe(5)
    expect(normalizeMarkedIndex(-1, 10)).toBe(0)
    expect(normalizeMarkedIndex(999999, 10)).toBe(9)
  })

  it('returns 0 for non-integer or non-number values', () => {
    expect(normalizeMarkedIndex('abc', 10)).toBe(0)
    expect(normalizeMarkedIndex(null, 10)).toBe(0)
    expect(normalizeMarkedIndex(undefined, 10)).toBe(0)
    expect(normalizeMarkedIndex(3.14, 10)).toBe(0)
    expect(normalizeMarkedIndex(NaN, 10)).toBe(0)
  })

  it('returns 0 for empty schedule', () => {
    expect(normalizeMarkedIndex(5, 0)).toBe(0)
    expect(normalizeMarkedIndex(5, -1)).toBe(0)
  })
})

describe('normalizeFontSize', () => {
  it('passes through valid values', () => {
    expect(normalizeFontSize('default')).toBe('default')
    expect(normalizeFontSize('medium')).toBe('medium')
    expect(normalizeFontSize('large')).toBe('large')
  })

  it('falls back to default for invalid values', () => {
    expect(normalizeFontSize('giant')).toBe('default')
    expect(normalizeFontSize('')).toBe('default')
    expect(normalizeFontSize(42)).toBe('default')
    expect(normalizeFontSize(null)).toBe('default')
    expect(normalizeFontSize(undefined)).toBe('default')
  })
})

describe('normalizeViewMode', () => {
  it('passes through valid values', () => {
    expect(normalizeViewMode('all')).toBe('all')
    expect(normalizeViewMode('studio')).toBe('studio')
    expect(normalizeViewMode('dancers')).toBe('dancers')
  })

  it('falls back to "all" for invalid values', () => {
    expect(normalizeViewMode('invalid')).toBe('all')
    expect(normalizeViewMode('watched')).toBe('all') // old value name
    expect(normalizeViewMode(null)).toBe('all')
    expect(normalizeViewMode(123)).toBe('all')
  })
})

describe('normalizeWatchedDancers', () => {
  it('returns empty array for non-array', () => {
    expect(normalizeWatchedDancers(null)).toEqual([])
    expect(normalizeWatchedDancers('Alice')).toEqual([])
    expect(normalizeWatchedDancers({ 0: 'Alice' })).toEqual([])
  })

  it('filters out non-string and empty entries', () => {
    expect(normalizeWatchedDancers(['Alice', 123, null, '', 'Bob'])).toEqual(['Alice', 'Bob'])
  })

  it('restricts to roster when provided', () => {
    const roster = new Set(['Alice', 'Bob'])
    expect(normalizeWatchedDancers(['Alice', 'Charlie', 'Bob'], roster)).toEqual(['Alice', 'Bob'])
  })

  it('returns all valid strings when no roster', () => {
    expect(normalizeWatchedDancers(['Alice', 'Bob'])).toEqual(['Alice', 'Bob'])
  })
})

describe('isAnchorCoherent', () => {
  const ENTRY_COUNT = 100

  it('accepts a null anchor with null timestamp', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: null, anchorTimestamp: null, markedIndex: 0 }, ENTRY_COUNT)).toBe(true)
  })

  it('rejects null wall-minutes with non-null timestamp', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: null, anchorTimestamp: 123, markedIndex: 0 }, ENTRY_COUNT)).toBe(false)
  })

  it('accepts a valid anchor', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: 600, anchorTimestamp: Date.now(), markedIndex: 5 }, ENTRY_COUNT)).toBe(true)
  })

  it('tolerates null timestamp on a valid anchor (legacy data)', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: 600, anchorTimestamp: null, markedIndex: 5 }, ENTRY_COUNT)).toBe(true)
  })

  it('rejects out-of-range wall-minutes', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: -1, anchorTimestamp: 123, markedIndex: 0 }, ENTRY_COUNT)).toBe(false)
    expect(isAnchorCoherent({ anchorWallMinutes: 99999, anchorTimestamp: 123, markedIndex: 0 }, ENTRY_COUNT)).toBe(false)
  })

  it('rejects out-of-bounds markedIndex', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: 600, anchorTimestamp: 123, markedIndex: -1 }, ENTRY_COUNT)).toBe(false)
    expect(isAnchorCoherent({ anchorWallMinutes: 600, anchorTimestamp: 123, markedIndex: 999 }, ENTRY_COUNT)).toBe(false)
  })

  it('rejects invalid timestamp', () => {
    expect(isAnchorCoherent({ anchorWallMinutes: 600, anchorTimestamp: -1, markedIndex: 0 }, ENTRY_COUNT)).toBe(false)
    expect(isAnchorCoherent({ anchorWallMinutes: 600, anchorTimestamp: NaN, markedIndex: 0 }, ENTRY_COUNT)).toBe(false)
  })
})

describe('reconcileMarkedIndexWithAnchor', () => {
  it('passes markedIndex through when anchor is set', () => {
    // Anchor is set → coherent state, leave the user's mark alone.
    expect(reconcileMarkedIndexWithAnchor(42, 600, 0)).toBe(42)
  })

  it('resets markedIndex to today\'s firstOfDay when anchor is null', () => {
    // The screenshot bug: anchor went null but markedIndex stayed at a
    // mid-schedule entry, causing the phantom CURRENT highlight + the
    // 'set as current' hint to coexist.
    expect(reconcileMarkedIndexWithAnchor(42, null, 10)).toBe(10)
  })

  it('leaves markedIndex alone when there is no day-start to reset to', () => {
    // No schedule day matches today (e.g., user opens a week before the
    // event with a corrupt persisted state). With nowhere to canonicalize
    // to, leave the index alone — the active-hours gate hides the visual
    // treatment anyway.
    expect(reconcileMarkedIndexWithAnchor(42, null, -1)).toBe(42)
  })

  it('is a no-op when markedIndex already matches firstOfDay', () => {
    expect(reconcileMarkedIndexWithAnchor(0, null, 0)).toBe(0)
    expect(reconcileMarkedIndexWithAnchor(15, null, 15)).toBe(15)
  })

  it('handles markedIndex 0 with non-zero firstOfDay (multi-day schedule)', () => {
    // Day 1's first entry is index 0; day 2's first entry is index 271.
    // A user opening fresh on day 2 with no anchor would have markedIndex=0
    // (default) but should land at 271.
    expect(reconcileMarkedIndexWithAnchor(0, null, 271)).toBe(271)
  })
})
