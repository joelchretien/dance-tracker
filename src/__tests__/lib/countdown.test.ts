import { describe, it, expect } from 'vitest'
import { findNextTarget, countDancesUntil } from '@/lib/countdown'
import type { IndexedEntry } from '@/types/schedule'

function dance(i: number, dancers: string[] = []): IndexedEntry {
  return { entry: { type: 'dance', time: '8:00 AM', title: `Dance ${i}`, dancers }, dayIndex: 0, globalIndex: i }
}
function brk(i: number): IndexedEntry {
  return { entry: { type: 'break', time: '9:00 AM', title: 'BREAK' }, dayIndex: 0, globalIndex: i }
}
function awards(i: number): IndexedEntry {
  return { entry: { type: 'awards', time: '10:00 AM', title: 'AWARDS' }, dayIndex: 0, globalIndex: i }
}

describe('findNextTarget', () => {
  it('finds next watched dance', () => {
    const entries = [dance(0), dance(1, ['Alice']), dance(2, ['Bob'])]
    expect(findNextTarget(entries, 0, new Set(['Bob']), new Set())).toBe(2)
  })

  it('finds current entry if it matches', () => {
    const entries = [dance(0, ['Alice']), dance(1)]
    expect(findNextTarget(entries, 0, new Set(['Alice']), new Set())).toBe(0)
  })

  it('finds watched awards', () => {
    const entries = [dance(0), awards(1), dance(2)]
    expect(findNextTarget(entries, 0, new Set(['Alice']), new Set([1]))).toBe(1)
  })

  it('returns null when no watched dancers', () => {
    expect(findNextTarget([], 0, new Set(), new Set())).toBeNull()
  })

  it('returns null when no match found', () => {
    const entries = [dance(0, ['Alice'])]
    expect(findNextTarget(entries, 1, new Set(['Alice']), new Set())).toBeNull()
  })
})

describe('countDancesUntil', () => {
  it('counts dances from ci+1 to target inclusive', () => {
    // entries: 0=dance, 1=dance, 2=break, 3=dance, 4=dance
    // from=0, to=4: count entries 1,2,3,4 → 1(dance)+0(break)+1(dance)+1(dance) = 3
    const entries = [dance(0), dance(1), brk(2), dance(3), dance(4)]
    expect(countDancesUntil(entries, 0, 4)).toBe(3)
  })

  it('returns 0 for adjacent indices with break between', () => {
    const entries = [dance(0), brk(1)]
    expect(countDancesUntil(entries, 0, 1)).toBe(0)
  })

  it('counts 1 for adjacent dance entries (includes target)', () => {
    const entries = [dance(0), dance(1)]
    expect(countDancesUntil(entries, 0, 1)).toBe(1)
  })

  it('returns 0 when from === to', () => {
    const entries = [dance(0)]
    expect(countDancesUntil(entries, 0, 0)).toBe(0)
  })
})
