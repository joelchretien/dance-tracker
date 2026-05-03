/**
 * Suggested searches for the JumpToPanel empty state — the chips that
 * appear when the user opens search but hasn't typed anything yet.
 *
 * These are entry-points, not search queries. Each has a label, an
 * optional helper line, and a target globalIndex. Tapping a suggestion
 * jumps directly without typing.
 *
 * Suggestion order is intentional: the most useful action is usually
 * the watched dancers' next appearance, then the current/likely entry
 * if running, then today's awards if any are still ahead. The list is
 * trimmed to whatever is genuinely actionable for the current state.
 *
 * Pure: takes everything it needs as arguments so it's testable.
 */
import type { IndexedEntry } from '@/types/schedule'
import { parseTime } from './time'

export interface Suggestion {
  /** Stable key for v-for. */
  key: string
  /** Primary label, shown in the chip. */
  label: string
  /** Optional secondary line — context like "9:22 AM Sunday". */
  detail?: string
  /** Global index to jump to when tapped. */
  globalIndex: number
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
  /** Active competition entry index (likely or marked). null when no anchor. */
  activeIndex: number | null
  /** Whether the active highlight is currently visible — drives "Currently dancing". */
  showCurrent: boolean
  /** Next watched dancer's entry, if any are upcoming. */
  nextWatchedIndex: number | null
}

export function buildSearchSuggestions(opts: BuildOpts): Suggestion[] {
  const out: Suggestion[] = []

  // Currently dancing — only useful when an anchor is set AND we're in
  // active hours (the showCurrent gate already encodes both).
  if (opts.showCurrent && opts.activeIndex !== null) {
    const e = opts.flatEntries[opts.activeIndex]
    if (e) {
      out.push({
        key: 'current',
        label: 'Jump to current dance',
        detail: titleOrType(e),
        globalIndex: opts.activeIndex,
      })
    }
  }

  // Next watched dancer — biggest day-2/3 win for users who came back to
  // see their kid. Skipped when nothing is watched or the next is the
  // active entry (would duplicate the chip above).
  if (opts.nextWatchedIndex !== null && opts.nextWatchedIndex !== opts.activeIndex) {
    const e = opts.flatEntries[opts.nextWatchedIndex]
    if (e) {
      out.push({
        key: 'next-watched',
        label: 'Next watched dance',
        detail: dayAndTime(e, opts.dayLabels),
        globalIndex: opts.nextWatchedIndex,
      })
    }
  }

  // Today's next awards block — useful for parents who are tracking
  // when scoring announcements happen, even without a watched dancer.
  const todayDayIdx = opts.dayDates.indexOf(opts.todayDate)
  if (todayDayIdx >= 0) {
    const nextAwards = opts.flatEntries.find(e => {
      if (e.dayIndex !== todayDayIdx) return false
      if (e.entry.type !== 'awards') return false
      const t = parseTime(e.entry.time)
      return t >= 0 && t >= opts.nowMinutes
    })
    if (nextAwards && nextAwards.globalIndex !== opts.activeIndex) {
      out.push({
        key: 'next-awards',
        label: "Today's next awards",
        detail: timeOnly(nextAwards),
        globalIndex: nextAwards.globalIndex,
      })
    }
  }

  return out
}

function titleOrType(e: IndexedEntry): string {
  if (e.entry.type === 'dance') return e.entry.title
  if (e.entry.type === 'awards') return 'Awards'
  if (e.entry.type === 'break') return 'Break'
  return ''
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

function timeOnly(e: IndexedEntry): string {
  return e.entry.time
}
