import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { findNowIndex, todayDayIndex } from '@/lib/navigation'
import { findLikelyCurrentIndex } from '@/lib/auto-advance'
import { parseTime, currentTimeMinutes, currentTimeFractionalMinutes, localDateString } from '@/lib/time'
import { getEntryDurationMinutes } from '@/lib/entry-duration'
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
  let fsStorage: ReturnType<typeof useLocalStorage<FontSize>> | null = null

  function initForSchedule(id: string) {
    navStorage = useLocalStorage(`dt:${id}:nav`, 0)
    anchorStorage = useLocalStorage<number | null>(`dt:${id}:anchor`, null)
    fsStorage = useLocalStorage<FontSize>(`dt:${id}:fontSize`, 'default')
    markedIndex.value = navStorage.value
    anchorWallMinutes.value = anchorStorage.value
    fontSize.value = fsStorage.value
    selectedIndex.value = null
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
  watch(fontSize, (val) => { if (fsStorage) fsStorage.value = val })

  /** Check if the anchor belongs to a different competition day than today. */
  function isAnchorStale(): boolean {
    const entry = schedule.flatEntries[markedIndex.value]
    if (!entry) return true
    const anchorDate = schedule.days[entry.dayIndex]?.date
    if (!anchorDate) return true
    return anchorDate !== localDateString()
  }

  /** Clear the anchor, stopping auto-advance. Resets to first entry of today. */
  function clearAnchor() {
    anchorWallMinutes.value = null
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

  let selectTimer: ReturnType<typeof setTimeout> | null = null

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
      likelyIndex.value = target // immediately matches manual
      activeProgress.value = 0
    }
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
    updateLikelyCurrent(now)
    updateProgress(now)
    updateNowIndex()
  }

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
    const toast = `Scrolled to now · ${entry?.time ?? ''} · ${entry?.title ?? ''}`
    return { index: idx, toast }
  }

  // The entry closest to current wall clock time (updated periodically)
  const nowIndex = ref<number | null>(null)

  function updateNowIndex() {
    const dayIdx = todayDayIndex(schedule.dayDates)
    const now = currentTimeMinutes()
    nowIndex.value = findNowIndex(schedule.flatEntries, now, dayIdx)
  }

  return {
    markedIndex, activeIndex, activeIsLikely, activeProgress,
    selectedIndex, fontSize,
    activeEntry, activeDayIndex, activeTimeOfEntry,
    initForSchedule, select, markAsCurrent, tick,
    canIncreaseFontSize, canDecreaseFontSize,
    increaseFontSize, decreaseFontSize, jumpToNow,
    nowIndex, updateNowIndex,
  }
})
