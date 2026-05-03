import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { findNowIndex, todayDayIndex } from '@/lib/navigation'
import { findLikelyCurrentIndex } from '@/lib/auto-advance'
import { parseTime, currentTimeMinutes, currentTimeFractionalMinutes, localDateString } from '@/lib/time'
import { getEntryDurationMinutes } from '@/lib/entry-duration'
import { isWithinActiveHours as computeIsWithinActiveHours } from '@/lib/active-hours'
import { titleCaseDanceTitle } from '@/lib/title-case'
import {
  normalizeMarkedIndex,
  normalizeFontSize,
  isAnchorCoherent,
  reconcileMarkedIndexWithAnchor,
} from '@/lib/normalize-persisted'
import type { FontSize } from '@/types/schedule'

export const useNavigationStore = defineStore('navigation', () => {
  const schedule = useScheduleStore()

  // "Current dance" — the dance the user last manually set as current.
  // Persisted across sessions.
  const markedIndex = ref(0)

  // Wall-clock minutes when the user last manually set the current dance.
  // Used to compute the offset between wall clock and schedule time.
  // null = no anchor yet (auto-advance disabled).
  const anchorWallMinutes = ref<number | null>(null)

  // Auto-advance: the index the timer thinks we're on, based on offset.
  // null = no anchor set yet, so no auto-advance.
  const likelyIndex = ref<number | null>(null)

  // The effective "current" index — what everything should reference.
  const activeIndex = computed(() => likelyIndex.value ?? markedIndex.value)

  // Is the active entry auto-estimated (vs manually confirmed)?
  const activeIsLikely = computed(() =>
    likelyIndex.value !== null && likelyIndex.value !== markedIndex.value
  )

  // "Selected dance" — the dance the user tapped to inspect.
  // Shows details inline. Transient (not persisted). null = nothing selected.
  const selectedIndex = ref<number | null>(null)

  const fontSize = ref<FontSize>('default')

  let navStorage: ReturnType<typeof useLocalStorage<number>> | null = null
  let anchorStorage: ReturnType<typeof useLocalStorage<number | null>> | null = null
  let anchorTimestampStorage: ReturnType<typeof useLocalStorage<number | null>> | null = null
  let fsStorage: ReturnType<typeof useLocalStorage<FontSize>> | null = null
  let selectTimer: ReturnType<typeof setTimeout> | null = null

  /** Wall-clock ms when the current anchor was set. Used for time-based staleness. */
  const anchorTimestamp = ref<number | null>(null)

  function initForSchedule(id: string) {
    navStorage = useLocalStorage(`dt:${id}:nav`, 0)
    anchorStorage = useLocalStorage<number | null>(`dt:${id}:anchor`, null)
    anchorTimestampStorage = useLocalStorage<number | null>(`dt:${id}:anchorTs`, null)
    fsStorage = useLocalStorage<FontSize>(`dt:${id}:fontSize`, 'default')

    // Normalize hydrated values: corrupt or out-of-bounds persisted state
    // (markedIndex past end of a shrunk schedule, fontSize from a future
    // version, hand-edited localStorage) shouldn't enter the runtime model.
    // Each value reads and rewrites — the rewrite is harmless when the
    // value was already valid.
    const entryCount = schedule.flatEntries.length
    const safeMarked = normalizeMarkedIndex(navStorage.value, entryCount)
    const safeFontSize = normalizeFontSize(fsStorage.value)
    markedIndex.value = safeMarked
    navStorage.value = safeMarked
    fontSize.value = safeFontSize
    fsStorage.value = safeFontSize

    anchorWallMinutes.value = anchorStorage.value
    anchorTimestamp.value = anchorTimestampStorage.value
    // Anchors are a triple (wall-minutes, timestamp, markedIndex) — clear
    // them all if the persisted triple is incoherent (e.g. a markedIndex
    // that's out of bounds in the loaded schedule).
    if (!isAnchorCoherent(
      {
        anchorWallMinutes: anchorWallMinutes.value,
        anchorTimestamp: anchorTimestamp.value,
        markedIndex: markedIndex.value,
      },
      entryCount,
    )) {
      anchorWallMinutes.value = null
      anchorTimestamp.value = null
    }

    // When anchor is null, markedIndex must point at today's day-start;
    // any other value paints a phantom "current" highlight without the
    // auto-advance machinery behind it. Reconcile here, before the UI
    // reads any of these values.
    const todayIdxAtInit = todayDayIndex(schedule.dayDates)
    const firstOfTodayAtInit = schedule.flatEntries.findIndex(e => e.dayIndex === todayIdxAtInit)
    markedIndex.value = reconcileMarkedIndexWithAnchor(
      markedIndex.value,
      anchorWallMinutes.value,
      firstOfTodayAtInit,
    )

    selectedIndex.value = null
    // A select timer from a previous schedule could otherwise fire later and
    // clobber a fresh selection on the new schedule with null.
    if (selectTimer) {
      clearTimeout(selectTimer)
      selectTimer = null
    }
    applyFontSize()

    // Clear stale anchor from a previous day
    if (anchorWallMinutes.value !== null && isAnchorStale()) {
      clearAnchor()
    } else if (anchorWallMinutes.value !== null) {
      updateLikelyCurrent(currentTimeFractionalMinutes())
    }
  }

  watch(markedIndex, (val) => { if (navStorage) navStorage.value = val })
  watch(anchorWallMinutes, (val) => { if (anchorStorage) anchorStorage.value = val })
  watch(anchorTimestamp, (val) => { if (anchorTimestampStorage) anchorTimestampStorage.value = val })
  watch(fontSize, (val) => { if (fsStorage) fsStorage.value = val })

  /** Twelve hours in ms. Anchors older than this are stale regardless of date. */
  const ANCHOR_MAX_AGE_MS = 12 * 60 * 60 * 1000

  /**
   * An anchor is stale when either:
   *  - the marked entry's competition day isn't today (handles the common case
   *    of "set anchor on Friday, open app Saturday"), OR
   *  - more than 12 hours have elapsed since the anchor was set (defense in
   *    depth — covers any code path that could leave markedIndex pointing
   *    at a future day, plus the edge case of leaving the app open across
   *    midnight without a reload).
   */
  function isAnchorStale(): boolean {
    const entry = schedule.flatEntries[markedIndex.value]
    if (!entry) return true
    const anchorDate = schedule.days[entry.dayIndex]?.date
    if (!anchorDate) return true
    if (anchorDate !== localDateString()) return true
    if (anchorTimestamp.value !== null && Date.now() - anchorTimestamp.value > ANCHOR_MAX_AGE_MS) {
      return true
    }
    return false
  }

  /** Clear the anchor, stopping auto-advance. Resets to first entry of today. */
  function clearAnchor() {
    anchorWallMinutes.value = null
    anchorTimestamp.value = null
    likelyIndex.value = null

    // Move markedIndex to the first entry of today's day
    const todayIdx = todayDayIndex(schedule.dayDates)
    const firstOfDay = schedule.flatEntries.findIndex(e => e.dayIndex === todayIdx)
    if (firstOfDay >= 0) {
      markedIndex.value = firstOfDay
    }
  }

  // Active entry and derived values (used by other stores and components)
  const activeEntry = computed(() => schedule.flatEntries[activeIndex.value] ?? null)
  const activeDayIndex = computed(() => activeEntry.value?.dayIndex ?? 0)
  const activeTimeOfEntry = computed(() => {
    const entry = activeEntry.value?.entry
    if (!entry) return -1
    return parseTime(entry.time)
  })

  // Marked entry — the one the user actually anchored. Stays put even while
  // auto-advance moves the active index forward. Used by schedule status to
  // compute "how off-schedule is the competition".
  const markedTimeOfEntry = computed(() => {
    const entry = schedule.flatEntries[markedIndex.value]?.entry
    if (!entry) return -1
    return parseTime(entry.time)
  })

  /** Select (tap to inspect) a dance. Toggles off if tapping the same one. Auto-deselects after 30s. */
  function select(i: number) {
    if (selectTimer) clearTimeout(selectTimer)
    selectedIndex.value = selectedIndex.value === i ? null : i
    if (selectedIndex.value !== null) {
      selectTimer = setTimeout(() => { selectedIndex.value = null }, 30_000)
    }
  }

  /** Manually mark a dance as current. Records anchor for auto-advance. */
  function markAsCurrent(i?: number) {
    const target = i ?? selectedIndex.value
    if (target !== null && target !== undefined && target >= 0 && target < schedule.flatEntries.length) {
      markedIndex.value = target
      anchorWallMinutes.value = currentTimeFractionalMinutes()
      anchorTimestamp.value = Date.now()
      likelyIndex.value = target // immediately matches manual
      activeProgress.value = 0
    }
  }

  /** Seek to a specific progress within the active entry. Re-anchors as "current". */
  function seekProgress(progress: number) {
    const idx = activeIndex.value
    const entry = schedule.flatEntries[idx]
    if (!entry) return

    const entryScheduleMinutes = parseTime(entry.entry.time)
    if (entryScheduleMinutes < 0) return

    const duration = getEntryDurationMinutes(schedule.flatEntries, idx)
    const now = currentTimeFractionalMinutes()

    // Clamp the input before using it to derive the anchor — otherwise
    // an out-of-range progress (e.g. from a future keyboard shortcut or
    // test caller) would compute an anchor inconsistent with the clamped
    // activeProgress stored afterward. The visible seek bar already
    // clamps, but store-level APIs should be defensive at the boundary.
    const clamped = Math.max(0, Math.min(1, progress))

    // Back-compute anchor: what anchorWallMinutes makes progress = clamped?
    // progress = (now - startWall) / duration, startWall = anchorWall when marked = active
    // → anchorWall = now - progress * duration
    markedIndex.value = idx
    anchorWallMinutes.value = now - clamped * duration
    anchorTimestamp.value = Date.now()
    likelyIndex.value = idx
    activeProgress.value = clamped
  }

  // Progress through the active entry (0 to 1), updated every second.
  const activeProgress = ref(0)

  /** Recompute the likely-current index from the time offset. */
  function updateLikelyCurrent(now: number) {
    if (anchorWallMinutes.value === null) return

    // Day changed since anchor was set — reset for the new day
    if (isAnchorStale()) {
      clearAnchor()
      return
    }

    likelyIndex.value = findLikelyCurrentIndex(
      schedule.flatEntries,
      markedIndex.value,
      anchorWallMinutes.value,
      now,
    )
  }

  /** Update progress through the active entry. */
  function updateProgress(now: number) {
    if (anchorWallMinutes.value === null) {
      activeProgress.value = 0
      return
    }

    const entry = schedule.flatEntries[activeIndex.value]
    if (!entry) { activeProgress.value = 0; return }

    const entryScheduleMinutes = parseTime(entry.entry.time)
    if (entryScheduleMinutes < 0) { activeProgress.value = 0; return }

    // offset = how far ahead wall clock is vs schedule
    const anchorScheduleMinutes = parseTime(schedule.flatEntries[markedIndex.value]?.entry.time ?? '')
    if (anchorScheduleMinutes < 0) { activeProgress.value = 0; return }
    const offset = anchorWallMinutes.value - anchorScheduleMinutes

    // Wall-clock time this entry started
    const startWall = entryScheduleMinutes + offset
    const duration = getEntryDurationMinutes(schedule.flatEntries, activeIndex.value)
    const elapsed = now - startWall

    activeProgress.value = Math.max(0, Math.min(1, elapsed / duration))
  }

  /** Unified 1-second tick: updates auto-advance, progress, and now-index. */
  function tick() {
    const now = currentTimeFractionalMinutes()
    nowMinutes.value = now
    updateLikelyCurrent(now)
    updateProgress(now)
    updateNowIndex()
  }

  // Has the user set a current dance yet? (used by onboarding hint)
  const hasAnchor = computed(() => anchorWallMinutes.value !== null)

  // Offset between wall clock and schedule time, in minutes, when an anchor
  // is set. Positive = competition is running behind schedule. null = no
  // anchor, no inferred offset.
  const scheduleOffsetMinutes = computed<number | null>(() => {
    if (anchorWallMinutes.value === null) return null
    const sched = markedTimeOfEntry.value
    if (sched < 0) return null
    return anchorWallMinutes.value - sched
  })

  const FS_ORDER: FontSize[] = ['default', 'medium', 'large']

  const canIncreaseFontSize = computed(() => {
    const idx = FS_ORDER.indexOf(fontSize.value)
    return idx < FS_ORDER.length - 1
  })

  const canDecreaseFontSize = computed(() => {
    const idx = FS_ORDER.indexOf(fontSize.value)
    return idx > 0
  })

  function increaseFontSize() {
    const idx = FS_ORDER.indexOf(fontSize.value)
    if (idx < FS_ORDER.length - 1) {
      fontSize.value = FS_ORDER[idx + 1]
      applyFontSize()
    }
  }

  function decreaseFontSize() {
    const idx = FS_ORDER.indexOf(fontSize.value)
    if (idx > 0) {
      fontSize.value = FS_ORDER[idx - 1]
      applyFontSize()
    }
  }

  function applyFontSize() {
    const html = document.documentElement
    html.classList.remove('fs-medium', 'fs-large')
    if (fontSize.value === 'medium') html.classList.add('fs-medium')
    if (fontSize.value === 'large') html.classList.add('fs-large')
  }

  function jumpToNow(): { index: number; toast: string } | null {
    const dayIdx = todayDayIndex(schedule.dayDates)
    const now = currentTimeMinutes()
    const idx = findNowIndex(schedule.flatEntries, now, dayIdx)
    if (idx === null) return null
    const entry = schedule.flatEntries[idx]?.entry
    const toast = `Scrolled to now · ${entry?.time ?? ''} · ${titleCaseDanceTitle(entry?.title ?? '')}`
    return { index: idx, toast }
  }

  // The entry closest to current wall clock time (updated periodically)
  const nowIndex = ref<number | null>(null)

  /** Wall-clock minutes at the latest tick. Drives time-dependent computeds. */
  const nowMinutes = ref<number>(currentTimeMinutes())

  /**
   * Whether wall-clock now is inside today's competition day window. False
   * before the first entry, after the estimated end of the last entry, or
   * on any non-schedule day. The "current" highlight, schedule-status pill,
   * and "set as current" onboarding hint all key off this so users opening
   * the app at midnight or a week before the event don't see misleading
   * "current dance" UI.
   *
   * Offset-aware: when an anchor is set and the competition is running
   * ±N minutes off schedule, the window shifts by that offset. A delayed
   * competition won't flip to off-hours just because the scheduled end
   * time has passed.
   */
  const isWithinActiveHours = computed<boolean>(() =>
    computeIsWithinActiveHours(
      schedule.flatEntries,
      schedule.dayDates,
      localDateString(),
      nowMinutes.value,
      scheduleOffsetMinutes.value ?? 0,
    ),
  )

  /**
   * Should the "current dance" highlight (▶ CURRENT badge, indigo border,
   * progress bar) render at all? Two conditions must hold:
   *   - We're inside today's active hours (else everything is stale).
   *   - The user has an actual anchor set. Without an anchor, `activeIndex`
   *     falls back to a persisted markedIndex, which can legitimately be
   *     zero or stale from before the anchor model existed — highlighting
   *     a random entry just because something's stored there is misleading,
   *     and it's exactly what made the onboarding hint and the highlight
   *     contradict each other in the off-hours screenshot.
   */
  const currentIsVisible = computed<boolean>(
    () => hasAnchor.value && isWithinActiveHours.value,
  )

  function updateNowIndex() {
    const dayIdx = todayDayIndex(schedule.dayDates)
    const now = currentTimeMinutes()
    nowIndex.value = findNowIndex(schedule.flatEntries, now, dayIdx)
  }

  return {
    markedIndex, activeIndex, activeIsLikely, activeProgress, hasAnchor,
    scheduleOffsetMinutes,
    anchorWallMinutes,
    selectedIndex, fontSize,
    activeEntry, activeDayIndex, activeTimeOfEntry, markedTimeOfEntry,
    isWithinActiveHours,
    currentIsVisible,
    initForSchedule, select, markAsCurrent, seekProgress, tick,
    canIncreaseFontSize, canDecreaseFontSize,
    increaseFontSize, decreaseFontSize, jumpToNow,
    nowIndex, updateNowIndex,
  }
})
