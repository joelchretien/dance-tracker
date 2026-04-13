import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { findNowIndex, todayDayIndex } from '@/lib/navigation'
import { parseTime, currentTimeMinutes } from '@/lib/time'
import type { FontSize } from '@/types/schedule'

export const useNavigationStore = defineStore('navigation', () => {
  const schedule = useScheduleStore()

  // "Current dance" — the dance the competition is currently on.
  // Advance/Back operate on this. Persisted across sessions.
  const markedIndex = ref(0)

  // "Selected dance" — the dance the user tapped to inspect.
  // Shows details inline. Transient (not persisted). null = nothing selected.
  const selectedIndex = ref<number | null>(null)

  const fontSize = ref<FontSize>('default')

  let navStorage: ReturnType<typeof useLocalStorage<number>> | null = null
  let fsStorage: ReturnType<typeof useLocalStorage<FontSize>> | null = null

  function initForSchedule(id: string) {
    navStorage = useLocalStorage(`dt:${id}:nav`, 0)
    fsStorage = useLocalStorage<FontSize>(`dt:${id}:fontSize`, 'default')
    markedIndex.value = navStorage.value
    fontSize.value = fsStorage.value
    selectedIndex.value = null
    applyFontSize()
  }

  watch(markedIndex, (val) => { if (navStorage) navStorage.value = val })
  watch(fontSize, (val) => { if (fsStorage) fsStorage.value = val })

  const markedEntry = computed(() => schedule.flatEntries[markedIndex.value] ?? null)
  const markedDayIndex = computed(() => markedEntry.value?.dayIndex ?? 0)

  const canGoBack = computed(() => markedIndex.value > 0)
  const canAdvance = computed(() => markedIndex.value < schedule.flatEntries.length - 1)

  /** Select (tap to inspect) a dance. Toggles off if tapping the same one. */
  function select(i: number) {
    selectedIndex.value = selectedIndex.value === i ? null : i
  }

  /** Mark a dance as the current dance (what Advance/Back operate on). */
  function markAsCurrent(i?: number) {
    const target = i ?? selectedIndex.value
    if (target !== null && target !== undefined && target >= 0 && target < schedule.flatEntries.length) {
      markedIndex.value = target
    }
  }

  function advance() {
    if (canAdvance.value) markedIndex.value++
  }

  function retreat() {
    if (canGoBack.value) markedIndex.value--
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

  const markedTimeOfEntry = computed(() => {
    const entry = markedEntry.value?.entry
    if (!entry) return -1
    return parseTime(entry.time)
  })

  return {
    markedIndex, selectedIndex, fontSize,
    markedEntry, markedDayIndex, canGoBack, canAdvance, markedTimeOfEntry,
    initForSchedule, select, markAsCurrent, advance, retreat,
    canIncreaseFontSize, canDecreaseFontSize,
    increaseFontSize, decreaseFontSize, jumpToNow,
    nowIndex, updateNowIndex,
  }
})
