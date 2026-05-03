import { describe, it, expect } from 'vitest'
import {
  normalizeMarkedIndex,
  normalizeFontSize,
  normalizeViewMode,
  normalizeWatchedDancers,
  isAnchorCoherent,
  reconcileMarkedIndexWithAnchor,
  numberOrNullSerializer,
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

describe('numberOrNullSerializer', () => {
  // The bug this serializer fixes:
  //
  // Without it, `useLocalStorage(key, null)` falls back to VueUse's
  // 'any' serializer (because the null default makes `guessSerializerType`
  // pick 'any'), whose read function is `(v) => v` — returning the raw
  // localStorage string. So a number written as 695.5 is stored as
  // "695.5" but read back as the STRING "695.5". Anything downstream
  // that uses Number.isFinite to validate the value rejects it.
  //
  // These tests pin down both halves of the round-trip so any future
  // regression (e.g., 'simplifying' by removing the explicit serializer)
  // fails loudly instead of silently breaking anchor persistence.

  describe('write', () => {
    it('serializes a number to its string representation', () => {
      expect(numberOrNullSerializer.write(695.5)).toBe('695.5')
      expect(numberOrNullSerializer.write(0)).toBe('0')
      expect(numberOrNullSerializer.write(-12.34)).toBe('-12.34')
    })

    it('serializes null to empty string', () => {
      // Empty string round-trips to null on read, which keeps localStorage
      // free of the literal token "null" (which would also work but reads
      // less cleanly when inspected in devtools).
      expect(numberOrNullSerializer.write(null)).toBe('')
    })
  })

  describe('read', () => {
    it('parses a numeric string back to a number — the critical case', () => {
      // This is the round-trip that VueUse's 'any' serializer broke.
      // Number.isFinite('695.5') is false; Number.isFinite(695.5) is true.
      // The whole bug hinged on whether read returned a number or a string.
      const result = numberOrNullSerializer.read('695.5')
      expect(result).toBe(695.5)
      expect(typeof result).toBe('number')
      expect(Number.isFinite(result)).toBe(true)
    })

    it('parses integers', () => {
      expect(numberOrNullSerializer.read('42')).toBe(42)
      expect(numberOrNullSerializer.read('0')).toBe(0)
      expect(numberOrNullSerializer.read('-7')).toBe(-7)
    })

    it('returns null for empty string', () => {
      expect(numberOrNullSerializer.read('')).toBeNull()
    })

    it('returns null for the literal token "null"', () => {
      // Defensive: if some other writer puts the string "null" in storage
      // (hand edit, migration from a different serializer), don't try to
      // parseFloat it and end up with NaN.
      expect(numberOrNullSerializer.read('null')).toBeNull()
    })

    it('returns null for unparseable strings', () => {
      // parseFloat('abc') is NaN, Number.isFinite(NaN) is false, so we
      // coerce back to null rather than letting NaN flow downstream.
      expect(numberOrNullSerializer.read('abc')).toBeNull()
      expect(numberOrNullSerializer.read('not a number')).toBeNull()
    })

    it('returns null for Infinity', () => {
      // parseFloat('Infinity') === Infinity, Number.isFinite(Infinity) is
      // false. Anchor minutes should never be infinite — null is the
      // safer default than letting it through.
      expect(numberOrNullSerializer.read('Infinity')).toBeNull()
      expect(numberOrNullSerializer.read('-Infinity')).toBeNull()
    })
  })

  describe('round-trip', () => {
    // Property: write then read returns the original value (modulo the
    // null<->'' canonicalization). This is the test that would have
    // caught the original bug if it had existed.
    function roundTrip(value: number | null): number | null {
      return numberOrNullSerializer.read(numberOrNullSerializer.write(value))
    }

    it('preserves numbers across write+read', () => {
      expect(roundTrip(695.5)).toBe(695.5)
      expect(roundTrip(0)).toBe(0)
      expect(roundTrip(-12.34)).toBe(-12.34)
      expect(roundTrip(1439.98)).toBe(1439.98) // largest plausible anchor
    })

    it('preserves null across write+read', () => {
      expect(roundTrip(null)).toBeNull()
    })

    it('round-tripped value passes Number.isFinite (the bug-trigger check)', () => {
      // Belt and braces: this is the specific predicate isAnchorCoherent
      // calls on the persisted value. If any future change to the
      // serializer breaks this assertion, the anchor-clearing bug is back.
      const result = roundTrip(695.5)
      expect(result).not.toBeNull()
      expect(Number.isFinite(result)).toBe(true)
    })
  })
})
