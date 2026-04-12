import type { IndexedEntry, AwardsBlock } from '@/types/schedule'

/**
 * Compute awards blocks: for each AWARDS entry, determine the range of entries
 * in the preceding block and whether any contain a watched dancer.
 */
export function computeAwardsBlocks(
  flatEntries: IndexedEntry[],
  awardsIndices: number[],
  watchedSet: Set<string>,
): AwardsBlock[] {
  const blocks: AwardsBlock[] = []

  for (let a = 0; a < awardsIndices.length; a++) {
    const blockStart = a === 0 ? 0 : awardsIndices[a - 1] + 1
    const blockEnd = awardsIndices[a]
    let hasWatchedDancer = false

    for (let j = blockStart; j < blockEnd; j++) {
      const entry = flatEntries[j]?.entry
      if (entry?.type === 'dance' && entry.dancers) {
        if (entry.dancers.some(d => watchedSet.has(d))) {
          hasWatchedDancer = true
          break
        }
      }
    }

    blocks.push({
      awardsGlobalIndex: awardsIndices[a],
      blockStartIndex: blockStart,
      hasWatchedDancer,
    })
  }

  return blocks
}
