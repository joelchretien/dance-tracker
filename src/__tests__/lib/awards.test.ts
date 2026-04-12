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
    expect(blocks).toEqual([{ awardsGlobalIndex: 2, blockStartIndex: 0, hasWatchedDancer: true }])
  })

  it('marks block without watched dancer', () => {
    const entries = [dance(0, ['Alice']), dance(1, ['Bob']), awards(2)]
    const blocks = computeAwardsBlocks(entries, [2], new Set(['Charlie']))
    expect(blocks[0].hasWatchedDancer).toBe(false)
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
  })

  it('returns empty for no awards', () => {
    expect(computeAwardsBlocks([], [], new Set())).toEqual([])
  })
})
