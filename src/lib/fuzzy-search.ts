/**
 * Simple fuzzy search scorer.
 * Returns a score > 0 if the query matches the target, 0 if no match.
 * Higher scores = better matches.
 *
 * Bonuses for:
 *  - Consecutive character matches
 *  - Match at start of string or start of a word
 *  - Earlier matches in the string
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  if (q.length === 0) return 1 // empty query matches everything
  if (q.length > t.length) return 0

  let score = 0
  let qi = 0
  let consecutive = 0
  let prevMatchIndex = -2

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Base point for a match
      score += 1

      // Consecutive bonus
      if (ti === prevMatchIndex + 1) {
        consecutive++
        score += consecutive * 2
      } else {
        consecutive = 0
      }

      // Word boundary bonus (start of string or preceded by space/punctuation)
      if (ti === 0 || /[\s\-_/|·]/.test(t[ti - 1])) {
        score += 5
      }

      // Early match bonus (diminishes with position)
      score += Math.max(0, 3 - ti * 0.1)

      prevMatchIndex = ti
      qi++
    }
  }

  // All query characters must be found
  if (qi < q.length) return 0

  // Bonus for shorter targets (tighter match)
  score += Math.max(0, 10 - (t.length - q.length) * 0.5)

  return score
}

export interface SearchResult {
  globalIndex: number
  title: string
  time: string
  num?: number
  subtitle: string
  score: number
}
