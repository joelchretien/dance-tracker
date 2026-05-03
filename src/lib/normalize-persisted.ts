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
