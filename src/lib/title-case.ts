/**
 * Convert ALL CAPS dance titles to readable Title Case.
 * Handles apostrophes ("I'LL" → "I'll"), keeps small connectors lowercase
 * except at start/end ("Song for My Father", "End of the Line").
 * Preserves intentional acronyms is out of scope — input data is uniformly
 * ALL CAPS, so we treat everything as words.
 */
const SMALL_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'via',
  'with', 'from', 'into', 'onto', 'over',
])

export function titleCaseDanceTitle(title: string): string {
  if (!title) return ''
  const words = title.toLowerCase().split(/\s+/)
  return words.map((word, i) => {
    const isFirst = i === 0
    const isLast = i === words.length - 1
    if (!isFirst && !isLast && SMALL_WORDS.has(word)) {
      return word
    }
    return capitalizeWord(word)
  }).join(' ')
}

function capitalizeWord(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}
