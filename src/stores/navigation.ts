import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { findNowIndex, todayDayIndex } from '@/lib/navigation'
import { findLikelyCurrentIndex } from '@/lib/auto-advance'
import { parseTime, currentTimeMinutes } from '@/lib/time'
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

    // Restore auto-advance from persisted anchor
    if (anchorWallMinutes.value !== null) {
      updateLikelyCurrent()
    }
  }

  watch(markedIndex, (val) => { if (navStorage) navStorage.value = val })
  watch(anchorWallMinutes, (val) => { if (anchorStorage) anchorStorage.value = val })
  watch(fontSize, (val) => { if (fsStorage) fsStorage.value = val })

  // Active entry and derived values (used by other stores and components)
  const activeEntry = computed(() => schedule.flatEntries[activeIndex.value] ?? null)
  const activeDayIndex = computed(() => activeEntry.value?.dayIndex ?? 0)
  const activeTimeOfEntry = computed(() => {
    const entry = activeEntry.value?.entry
    if (!entry) return -1
    return parseTime(entry.time)
  })

  /** Select (tap to inspect) a dance. Toggles off if tapping the same one. */
  function select(i: number) {
    selectedIndex.value = selectedIndex.value === i ? null : i
  }

  /** Manually mark a dance as current. Records anchor for auto-advance. */
  function markAsCurrent(i?: number) {
    const target = i ?? selectedIndex.value
    if (target !== null && target !== undefined && target >= 0 && target < schedule.flatEntries.length) {
      markedIndex.value = target
      anchorWallMinutes.value = currentTimeMinutes()
      likelyIndex.value = target // immediately matches manual
    }
  }

  /** Recompute the likely-current index from the time offset. Called every 10s. */
  function updateLikelyCurrent() {
    if (anchorWallMinutes.value === null) return
    likelyIndex.value = findLikelyCurrentIndex(
      schedule.flatEntries,
      markedIndex.value,
      anchorWallMinutes.value,
      currentTimeMinutes(),
    )
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
    markedIndex, activeIndex, activeIsLikely,
    selectedIndex, fontSize,
    activeEntry, activeDayIndex, activeTimeOfEntry,
    initForSchedule, select, markAsCurrent,
    updateLikelyCurrent,
    canIncreaseFontSize, canDecreaseFontSize,
    increaseFontSize, decreaseFontSize, jumpToNow,
    nowIndex, updateNowIndex,
  }
})
