import { describe, it, expect } from 'vitest'
import { computeAwardsBlocks } from '@/lib/awards'
import type { IndexedEntry } from '@/types/schedule'

function dance(i: number, dancers: string[] = []): IndexedEntry {
  return { entry: { type: 'dance', time: '8:00 AM', title: `Dance ${i}`, dancers }, dayIndex: 0, globalIndex: i }
}
function awards(i: number): IndexedEntry {
  return { entry: { type: 'awards', time: '9:00 AM', title: `AWARDS` }, dayIndex: 0, globalIndex: i }
}

describe('computeAwardsBlocks', () => {
  it('marks block with watched dancer', () => {
    const entries = [dance(0, ['Alice']), dance(1, ['Bob']), awards(2)]
    const blocks = computeAwardsBlocks(entries, [2], new Set(['Alice']))
    expect(blocks).toEqual([
      { awardsGlobalIndex: 2, blockStartIndex: 0, hasWatchedDancer: true, watchedDancersInBlock: ['Alice'] },
    ])
  })

  it('marks block without watched dancer', () => {
    const entries = [dance(0, ['Alice']), dance(1, ['Bob']), awards(2)]
    const blocks = computeAwardsBlocks(entries, [2], new Set(['Charlie']))
    expect(blocks[0].hasWatchedDancer).toBe(false)
    expect(blocks[0].watchedDancersInBlock).toEqual([])
  })

  it('handles multiple awards blocks', () => {
    const entries = [
      dance(0, ['Alice']), awards(1),
      dance(2, ['Bob']), awards(3),
    ]
    const blocks = computeAwardsBlocks(entries, [1, 3], new Set(['Bob']))
    expect(blocks[0].hasWatchedDancer).toBe(false)
    expect(blocks[1].hasWatchedDancer).toBe(true)
    expect(blocks[1].blockStartIndex).toBe(2)
    expect(blocks[1].watchedDancersInBlock).toEqual(['Bob'])
  })

  it('returns empty for no awards', () => {
    expect(computeAwardsBlocks([], [], new Set())).toEqual([])
  })

  it('collects multiple unique watched dancers in a block', () => {
    const entries = [
      dance(0, ['Alice', 'Bob']),
      dance(1, ['Bob', 'Charlie']),
      dance(2, ['Alice']),
      awards(3),
    ]
    const blocks = computeAwardsBlocks(entries, [3], new Set(['Alice', 'Bob', 'Charlie']))
    // Encounter order: Alice (0,0), Bob (0,1), Charlie (1,1)
    expect(blocks[0].watchedDancersInBlock).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('only includes dancers in the watched set', () => {
    const entries = [
      dance(0, ['Alice', 'Bob']),
      dance(1, ['Charlie']),
      awards(2),
    ]
    const blocks = computeAwardsBlocks(entries, [2], new Set(['Alice', 'Charlie']))
    expect(blocks[0].watchedDancersInBlock).toEqual(['Alice', 'Charlie'])
  })

  // Day-boundary behavior. computeAwardsBlocks operates over global indices,
  // not per-day, so blocks legitimately span day boundaries. The current
  // contract: a block runs from the entry after the previous awards (or 0
  // for the first awards) to the current awards. Day boundaries don't
  // split blocks. These tests pin that contract.

  function danceOnDay(i: number, dayIndex: number, dancers: string[] = []): IndexedEntry {
    return { entry: { type: 'dance', time: '8:00 AM', title: `Dance ${i}`, dancers }, dayIndex, globalIndex: i }
  }
  function awardsOnDay(i: number, dayIndex: number): IndexedEntry {
    return { entry: { type: 'awards', time: '9:00 AM', title: 'AWARDS' }, dayIndex, globalIndex: i }
  }

  it('first awards block on day 2 includes day 1 entries (no awards on day 1)', () => {
    // Day 1 has no awards entry; day 2's first awards covers everything from
    // global index 0 onward.
    const entries = [
      danceOnDay(0, 0, ['Alice']),
      danceOnDay(1, 0, ['Bob']),
      danceOnDay(2, 1, ['Charlie']),
      awardsOnDay(3, 1),
    ]
    const blocks = computeAwardsBlocks(entries, [3], new Set(['Alice', 'Charlie']))
    expect(blocks[0].blockStartIndex).toBe(0)
    expect(blocks[0].watchedDancersInBlock).toEqual(['Alice', 'Charlie'])
  })

  it('awards at the start of a day starts a tiny block', () => {
    // If a day starts with awards (no preceding dances on that day),
    // the block is just the slice from the previous awards to it.
    const entries = [
      danceOnDay(0, 0, ['Alice']),
      awardsOnDay(1, 0),
      awardsOnDay(2, 1), // start of day 2
      danceOnDay(3, 1, ['Bob']),
    ]
    const blocks = computeAwardsBlocks(entries, [1, 2], new Set(['Alice', 'Bob']))
    expect(blocks[0].blockStartIndex).toBe(0)
    expect(blocks[0].watchedDancersInBlock).toEqual(['Alice'])
    expect(blocks[1].blockStartIndex).toBe(2)
    expect(blocks[1].watchedDancersInBlock).toEqual([]) // no dances between
  })

  it('multiple awards blocks in one day each cover their preceding range', () => {
    const entries = [
      danceOnDay(0, 0, ['Alice']),
      awardsOnDay(1, 0),
      danceOnDay(2, 0, ['Bob']),
      awardsOnDay(3, 0),
    ]
    const blocks = computeAwardsBlocks(entries, [1, 3], new Set(['Alice', 'Bob']))
    expect(blocks[0].watchedDancersInBlock).toEqual(['Alice'])
    expect(blocks[1].watchedDancersInBlock).toEqual(['Bob'])
  })

  it('watched dancer split across day boundary is collected in the next awards block', () => {
    // Alice dances on day 1 and day 2; the day-2 awards collect both
    // appearances because the block walks across the day boundary.
    const entries = [
      danceOnDay(0, 0, ['Alice']),
      danceOnDay(1, 1, ['Alice']),
      awardsOnDay(2, 1),
    ]
    const blocks = computeAwardsBlocks(entries, [2], new Set(['Alice']))
    expect(blocks[0].watchedDancersInBlock).toEqual(['Alice']) // deduped
  })
})
