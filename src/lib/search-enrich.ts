import type { IndexedEntry } from '@/types/schedule'
import { fuzzyScore } from './fuzzy-search'
import { extractSubtitle } from './category'
import { predictedTime } from './predicted-time'

export interface EnrichedSearchResult {
  globalIndex: number
  title: string
  time: string
  num?: number
  subtitle: string
  score: number
  /** First three chars of the day label, e.g. "FRI" */
  dayShort: string
  /** True if this entry is the currently active one */
  isMarked: boolean
  /** Whether the active entry was auto-advanced (~) vs manually marked (▶) */
  isLikely: boolean
  /** True if any of the entry's dancers (or awards-block dancers) are watched */
  isWatched: boolean
  /** Watched dancers found in this entry (deduped, in encounter order) */
  watchedDancers: string[]
  /** True if the entry's studio is watched */
  sameStudio: boolean
  /** True if a meaningful schedule offset is in effect */
  hasOffset: boolean
  /** Time to display: predicted (with ~) when offset, scheduled otherwise */
  displayTime: string
}

export interface SearchEnrichOptions {
  flatEntries: IndexedEntry[]
  /** Day labels indexed by dayIndex; only label.substring(0,3) is read */
  dayLabels: string[]
  watchedDancerSet: Set<string>
  watchedAwardsSet: Set<number>
  watchedStudios: Set<string>
  /** Map of awards-block global index → unique watched dancers found inside */
  watchedDancersByAwardsIndex: Map<number, string[]>
  /** Index that should render with the "current" indicator */
  activeIndex: number
  /** Whether the active entry was auto-advanced (~) or manually anchored (▶) */
  activeIsLikely: boolean
  /** Anchor offset in minutes; null when no anchor */
  scheduleOffsetMinutes: number | null
  /** Cap on returned results (default 20) */
  maxResults?: number
}

/** Threshold above which the offset is considered meaningful enough to swap times. */
const OFFSET_DISPLAY_THRESHOLD = 5

/**
 * Enrich search results with the visual context the JumpToPanel needs to render
 * each row in parity with the main schedule view. Pure: takes a snapshot of
 * store state and returns an array, no reactive side-effects.
 */
export function enrichSearchResults(
  query: string,
  opts: SearchEnrichOptions,
): EnrichedSearchResult[] {
  const q = query.trim()
  if (!q) return []

  const offset = opts.scheduleOffsetMinutes
  const hasOffset = offset !== null && Math.abs(offset) > OFFSET_DISPLAY_THRESHOLD

  const scored: EnrichedSearchResult[] = []

  for (const item of opts.flatEntries) {
    const entry = item.entry
    if (entry.type !== 'dance' && entry.type !== 'awards') continue

    const titleScore = fuzzyScore(q, entry.title)
    const numStr = entry.type === 'dance' && entry.num ? String(entry.num) : ''
    const numScore = numStr && q === numStr ? 50 : 0
    const best = Math.max(titleScore, numScore)
    if (best <= 0) continue

    let watchedDancers: string[] = []
    let isWatched = false
    let sameStudio = false

    if (entry.type === 'dance') {
      watchedDancers = entry.dancers?.filter(d => opts.watchedDancerSet.has(d)) ?? []
      isWatched = watchedDancers.length > 0
      sameStudio = !!(entry.studio && opts.watchedStudios.has(entry.studio))
    } else {
      // awards
      watchedDancers = opts.watchedDancersByAwardsIndex.get(item.globalIndex) ?? []
      isWatched = opts.watchedAwardsSet.has(item.globalIndex)
    }

    const dayLabel = opts.dayLabels[item.dayIndex] ?? ''
    const dayShort = dayLabel.substring(0, 3)

    scored.push({
      globalIndex: item.globalIndex,
      title: entry.title,
      time: entry.time,
      num: entry.type === 'dance' ? entry.num : undefined,
      subtitle: entry.type === 'dance' ? extractSubtitle(entry.category) : 'Awards',
      score: best,
      dayShort,
      isMarked: item.globalIndex === opts.activeIndex,
      isLikely: opts.activeIsLikely,
      isWatched,
      watchedDancers,
      sameStudio,
      hasOffset,
      displayTime: hasOffset ? '~' + predictedTime(entry.time, offset!) : entry.time,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  const cap = opts.maxResults ?? 20
  return scored.slice(0, cap)
}
