/**
 * Suggested searches for the JumpToPanel.
 *
 * These are entry-points, not search queries. Each has a label, an
 * optional helper line, and a target globalIndex. Tapping jumps
 * directly without further typing.
 *
 * Suggestions appear in two places:
 *
 *   1. The empty state (no query typed) — always show every suggestion
 *      that's actionable for the current state.
 *   2. Above text-match results when the typed query semantically
 *      matches one of the suggestion's keywords (e.g. typing "next" or
 *      "awards" surfaces the awards chips above the literal results).
 *      The matchesQuery helper exposes that check so the panel can
 *      filter the list per-query without rebuilding it.
 *
 * Notable omissions:
 *   - "Jump to current dance" was dropped — the dedicated "Jump to now"
 *     button on the topbar already serves that purpose, and listing it
 *     here was redundant.
 *
 * Pure: takes everything it needs as arguments so it's testable without
 * the navigation/watch/ui stores.
 */
import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'

export type SuggestionKey = 'next-watched' | 'previous-awards' | 'next-awards'

export interface Suggestion {
  key: SuggestionKey
  /** Primary label, shown in the chip. */
  label: string
  /** Optional secondary line — context like "Sun May 3 · 11:51 AM". */
  detail?: string
  /** Global index to jump to when tapped. */
  globalIndex: number
  /** Lowercase keywords this suggestion responds to in typed search. */
  keywords: readonly string[]
}

interface BuildOpts {
  flatEntries: IndexedEntry[]
  dayLabels: readonly string[]
  /** Wall-clock minutes for "today". */
  nowMinutes: number
  /** Today's date in YYYY-MM-DD, used to scope "today's awards". */
  todayDate: string
  /** Per-day dates from the schedule, parallel to dayLabels. */
  dayDates: readonly string[]
  /** Next watched dancer's entry, if any are upcoming. */
  nextWatchedIndex: number | null
}

export function buildSearchSuggestions(opts: BuildOpts): Suggestion[] {
  const out: Suggestion[] = []

  // Next watched dancer — primary entry-point during a comp. Day + time
  // detail line so users coming from elsewhere in the schedule can tell
  // whether the next watched dance is imminent or hours away.
  if (opts.nextWatchedIndex !== null) {
    const e = opts.flatEntries[opts.nextWatchedIndex]
    if (e) {
      out.push({
        key: 'next-watched',
        label: 'Next watched dance',
        detail: dayAndTime(e, opts.dayLabels),
        globalIndex: opts.nextWatchedIndex,
        keywords: ['next', 'watched', 'dance'],
      })
    }
  }

  const todayDayIdx = opts.dayDates.indexOf(opts.todayDate)

  // Previous awards — most-recent awards entry whose scheduled time has
  // already passed today, OR (when nothing has happened yet today) the
  // last awards entry from a prior day. Useful for parents catching up
  // late, e.g. "did Emma's category get scored yet?"
  const previousAwards = findPreviousAwards(opts, todayDayIdx)
  if (previousAwards) {
    out.push({
      key: 'previous-awards',
      label: 'Previous awards',
      detail: dayAndTime(previousAwards, opts.dayLabels),
      globalIndex: previousAwards.globalIndex,
      keywords: ['previous', 'prev', 'last', 'awards'],
    })
  }

  // Next awards — first upcoming awards entry, today or any later day.
  // Distinct from "today's awards" — if today's are done but tomorrow
  // has more, surfacing tomorrow's is still useful.
  const nextAwards = findNextAwards(opts, todayDayIdx)
  if (nextAwards) {
    out.push({
      key: 'next-awards',
      label: 'Next awards',
      detail: dayAndTime(nextAwards, opts.dayLabels),
      globalIndex: nextAwards.globalIndex,
      keywords: ['next', 'awards', 'upcoming'],
    })
  }

  return out
}

/**
 * True if the typed query (any case) is a prefix of any of the
 * suggestion's keywords. "next" matches all chips with "next" in their
 * keyword list; "aw" matches "awards"; "previo" matches "previous".
 *
 * Prefix matching (rather than substring) keeps the behavior obvious:
 * partial-word completion as the user types, no surprise hits from
 * mid-word fragments. Substring matching would surface "next awards"
 * when typing "ward" which is more confusing than helpful.
 */
export function matchesQuery(suggestion: Suggestion, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return false
  return suggestion.keywords.some(kw => kw.startsWith(q))
}

function findPreviousAwards(opts: BuildOpts, todayDayIdx: number): IndexedEntry | null {
  // Walk backwards from end. First awards we find with (day < today) OR
  // (day === today AND time <= now) is the most recent.
  for (let i = opts.flatEntries.length - 1; i >= 0; i--) {
    const e = opts.flatEntries[i]
    if (e.entry.type !== 'awards') continue
    if (todayDayIdx < 0) {
      // Off-schedule date: any prior awards entry is "previous".
      return e
    }
    if (e.dayIndex < todayDayIdx) return e
    if (e.dayIndex === todayDayIdx) {
      const t = parseTime(e.entry.time)
      if (t >= 0 && t <= opts.nowMinutes) return e
    }
  }
  return null
}

function findNextAwards(opts: BuildOpts, todayDayIdx: number): IndexedEntry | null {
  for (let i = 0; i < opts.flatEntries.length; i++) {
    const e = opts.flatEntries[i]
    if (e.entry.type !== 'awards') continue
    if (todayDayIdx < 0) {
      // Off-schedule date: forward-walk picks the first awards entry,
      // which is the next thing happening regardless of when.
      return e
    }
    if (e.dayIndex > todayDayIdx) return e
    if (e.dayIndex === todayDayIdx) {
      const t = parseTime(e.entry.time)
      if (t >= 0 && t > opts.nowMinutes) return e
    }
  }
  return null
}

function dayAndTime(e: IndexedEntry, dayLabels: readonly string[]): string {
  const day = dayLabels[e.dayIndex] ?? ''
  // "FRIDAY MAY 1" → "Fri May 1" for compactness in the chip.
  const compact = day
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/(\w+)day/, (_, prefix) => prefix.slice(0, 3))
  return compact ? `${compact} · ${e.entry.time}` : e.entry.time
}
