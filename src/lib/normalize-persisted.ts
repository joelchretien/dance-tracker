/**
 * Normalizers for values hydrated from localStorage. The store boundary is
 * the right place to clamp/sanitize because:
 *  - The schedule could have been replaced or shrunk since the value was
 *    persisted (markedIndex out of bounds, watched dancers no longer in
 *    the roster).
 *  - The user could have hand-edited localStorage, switched browsers with
 *    incompatible serializations, or hit a migration gap.
 *  - Tests can seed corrupt values and assert safe state, which is the
 *    layer where these normalizers actually run.
 *
 * Pure functions — no Pinia, no DOM. Tested directly.
 */

import type { FontSize } from '@/types/schedule'
import type { ViewMode } from '@/stores/ui'

const FONT_SIZES: readonly FontSize[] = ['default', 'medium', 'large']
const VIEW_MODES: readonly ViewMode[] = ['all', 'studio', 'dancers']

/** Clamp markedIndex to a valid index in the schedule, or 0 if invalid. */
export function normalizeMarkedIndex(value: unknown, entryCount: number): number {
  if (entryCount <= 0) return 0
  if (typeof value !== 'number' || !Number.isInteger(value)) return 0
  return Math.min(Math.max(value, 0), entryCount - 1)
}

export function normalizeFontSize(value: unknown): FontSize {
  return typeof value === 'string' && FONT_SIZES.includes(value as FontSize)
    ? (value as FontSize)
    : 'default'
}

export function normalizeViewMode(value: unknown): ViewMode {
  return typeof value === 'string' && VIEW_MODES.includes(value as ViewMode)
    ? (value as ViewMode)
    : 'all'
}

/** Filter to strings, optionally restricted to a roster of valid dancer names. */
export function normalizeWatchedDancers(value: unknown, roster?: Set<string>): string[] {
  if (!Array.isArray(value)) return []
  const filtered = value.filter((x): x is string => typeof x === 'string' && x.length > 0)
  if (!roster) return filtered
  return filtered.filter(name => roster.has(name))
}

export interface AnchorState {
  anchorWallMinutes: number | null
  anchorTimestamp: number | null
  markedIndex: number
}

/**
 * Anchors are a triple: wall-time minutes, the wall-clock ms when set, and
 * the marked index they refer to. All three must be coherent or none of
 * them is meaningful. Returns true if the persisted anchor passes every
 * sanity check; the caller should call clearAnchor() when this is false.
 */
export function isAnchorCoherent(state: AnchorState, entryCount: number): boolean {
  const { anchorWallMinutes: w, anchorTimestamp: ts, markedIndex } = state
  if (w === null) return ts === null // null anchor is fine
  if (!Number.isFinite(w) || w < 0 || w >= 24 * 60) return false
  // anchorTimestamp may legitimately be null on data persisted before the
  // timestamp guard was added; tolerate that case rather than nuking.
  if (ts !== null && (!Number.isFinite(ts) || ts <= 0)) return false
  if (!Number.isInteger(markedIndex) || markedIndex < 0 || markedIndex >= entryCount) return false
  return true
}

/**
 * When the anchor is null, the only legitimate markedIndex is today's
 * day-start (matching clearAnchor's invariant elsewhere in the navigation
 * store). Any other value looks like a phantom "current" mark — render
 * with the indigo CURRENT highlight but with no auto-advance, and would
 * also trigger the "set as current" onboarding hint at the same time.
 *
 * In practice this happens when storage was partially cleared (browser
 * eviction of just the anchor key, downgrade across app versions, or
 * hand-edited localStorage) — the four mutation sites in the store all
 * write markedIndex and anchor together, so a coherent app session
 * cannot produce this divergence on its own.
 *
 * Returns the markedIndex the caller should use. Pass -1 for
 * firstOfTodayIndex if the schedule has no day matching today (e.g.,
 * a user opening the app a week before the event); in that case we
 * leave markedIndex alone since there's nothing to canonicalize to.
 */
export function reconcileMarkedIndexWithAnchor(
  markedIndex: number,
  anchorWallMinutes: number | null,
  firstOfTodayIndex: number,
): number {
  if (anchorWallMinutes !== null) return markedIndex
  if (firstOfTodayIndex < 0) return markedIndex
  return firstOfTodayIndex
}

/**
 * Serializer for `useLocalStorage<number | null>(key, null, ...)`.
 *
 * VueUse's `guessSerializerType(rawInit)` returns `'any'` when the
 * default value is null, and the `any` serializer's read function is
 * `(v) => v` — it returns the raw localStorage string verbatim, not a
 * parsed number. So writing a number stores `"695.5"` (correct), but
 * reading it back yields the string `"695.5"`, not the number 695.5.
 * `Number.isFinite("695.5")` is false (no auto-coerce), so anywhere
 * downstream that uses Number.isFinite as a sanity check rejects the
 * value as corrupt and clears it.
 *
 * In dance-tracker this manifested as the anchor being silently
 * discarded on every PWA reopen — isAnchorCoherent in this same file
 * uses Number.isFinite to validate the persisted anchor minutes.
 *
 * The fix is an explicit serializer that parses on read. Empty string
 * and the literal "null" both round-trip to null so a deliberately
 * cleared anchor stays cleared; anything else gets parseFloat'd, with
 * non-finite results coerced back to null defensively.
 *
 * Exported so it can be passed to multiple useLocalStorage calls
 * (anchor + anchorTimestamp) and tested in isolation.
 */
export const numberOrNullSerializer = {
  read: (raw: string): number | null => {
    if (raw === '' || raw === 'null') return null
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : null
  },
  write: (v: number | null): string => v === null ? '' : String(v),
}
