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
    const watchedDancersInBlock: string[] = []
    const seen = new Set<string>()

    for (let j = blockStart; j < blockEnd; j++) {
      const entry = flatEntries[j]?.entry
      if (entry?.type === 'dance' && entry.dancers) {
        for (const d of entry.dancers) {
          if (watchedSet.has(d) && !seen.has(d)) {
            seen.add(d)
            watchedDancersInBlock.push(d)
          }
        }
      }
    }

    blocks.push({
      awardsGlobalIndex: awardsIndices[a],
      blockStartIndex: blockStart,
      hasWatchedDancer: watchedDancersInBlock.length > 0,
      watchedDancersInBlock,
    })
  }

  return blocks
}
