import { describe, it, expect } from 'vitest'
import {
  normalizeMarkedIndex,
  normalizeFontSize,
  normalizeViewMode,
  normalizeWatchedDancers,
  isAnchorCoherent,
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
