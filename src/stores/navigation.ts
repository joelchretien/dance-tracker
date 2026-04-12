import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { findNowIndex, todayDayIndex } from '@/lib/navigation'
import { parseTime, currentTimeMinutes } from '@/lib/time'
import type { FontSize } from '@/types/schedule'

const FS_LABELS: Record<FontSize, string> = {
  default: 'Default',
  medium: 'Medium',
  large: 'Large',
}

export const useNavigationStore = defineStore('navigation', () => {
  const schedule = useScheduleStore()

  const currentIndex = ref(0)
  const showDetails = ref(false)
  const fontSize = ref<FontSize>('default')

  // Persistent storage refs (set up when schedule loads)
  let navStorage: ReturnType<typeof useLocalStorage<number>> | null = null
  let fsStorage: ReturnType<typeof useLocalStorage<FontSize>> | null = null

  function initForSchedule(id: string) {
    navStorage = useLocalStorage(`dt:${id}:nav`, 0)
    fsStorage = useLocalStorage<FontSize>(`dt:${id}:fontSize`, 'default')

    // Migrate legacy keys
    migrateLegacyKeys(id)

    currentIndex.value = navStorage.value
    fontSize.value = fsStorage.value
    showDetails.value = false

    applyFontSize()
  }

  function migrateLegacyKeys(id: string) {
    try {
      const legacyNav = localStorage.getItem('dst')
      if (legacyNav && !localStorage.getItem(`dt:${id}:nav`)) {
        const parsed = JSON.parse(legacyNav)
        if (parsed?.ci !== undefined) {
          navStorage!.value = parsed.ci
        }
      }
      const legacyFs = localStorage.getItem('dfs')
      if (legacyFs && !localStorage.getItem(`dt:${id}:fontSize`)) {
        const map: Record<string, FontSize> = { '0': 'default', '1': 'medium', '2': 'large' }
        fsStorage!.value = map[legacyFs] ?? 'default'
      }
    } catch {
      // Ignore migration errors
    }
  }

  // Sync to localStorage
  watch(currentIndex, (val) => { if (navStorage) navStorage.value = val })
  watch(fontSize, (val) => { if (fsStorage) fsStorage.value = val })

  const currentEntry = computed(() => schedule.flatEntries[currentIndex.value] ?? null)
  const currentDayIndex = computed(() => currentEntry.value?.dayIndex ?? 0)

  const currentDanceNumber = computed(() => {
    const idx = schedule.danceIndices.indexOf(currentIndex.value)
    return idx >= 0 ? idx + 1 : null
  })

  // Progress: 1-indexed to match original ((di+1)/TOT * 100)
  const progressPercent = computed(() => {
    if (schedule.totalDances === 0) return 0
    const idx = schedule.danceIndices.indexOf(currentIndex.value)
    if (idx >= 0) {
      return ((idx + 1) / schedule.totalDances) * 100
    }
    // For non-dance entries, find the closest dance before
    let closestIdx = 0
    for (let i = 0; i < schedule.danceIndices.length; i++) {
      if (schedule.danceIndices[i] <= currentIndex.value) closestIdx = i + 1
      else break
    }
    return (closestIdx / schedule.totalDances) * 100
  })

  const canGoPrev = computed(() => currentIndex.value > 0)
  const canGoNext = computed(() => currentIndex.value < schedule.flatEntries.length - 1)

  function goTo(i: number) {
    if (i >= 0 && i < schedule.flatEntries.length) {
      currentIndex.value = i
    }
  }

  function goNext() {
    if (canGoNext.value) currentIndex.value++
  }

  function goPrev() {
    if (canGoPrev.value) currentIndex.value--
  }

  /**
   * Toggle details with scroll preservation.
   * Returns toast message string for the caller to display.
   */
  function toggleDetails(): string {
    // Find the first visible entry to anchor to
    let anchor: HTMLElement | null = null
    let anchorY = 0
    const els = document.querySelectorAll<HTMLElement>('[id^="entry-"]')
    for (const el of els) {
      const top = el.getBoundingClientRect().top
      if (top > -50) {
        anchor = el
        anchorY = top
        break
      }
    }

    showDetails.value = !showDetails.value

    // Correct scroll position after DOM updates
    if (anchor) {
      const a = anchor
      const ay = anchorY
      requestAnimationFrame(() => {
        const newY = a.getBoundingClientRect().top
        if (Math.abs(newY - ay) > 2) {
          window.scrollBy(0, newY - ay)
        }
      })
    }

    return showDetails.value ? 'ⓘ Details shown' : 'ⓘ Details hidden'
  }

  /**
   * Cycle font size. Returns toast message string.
   */
  function cycleFontSize(): string {
    const order: FontSize[] = ['default', 'medium', 'large']
    const idx = order.indexOf(fontSize.value)
    fontSize.value = order[(idx + 1) % 3]
    applyFontSize()
    return `Text: ${FS_LABELS[fontSize.value]}`
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

  const currentTimeOfEntry = computed(() => {
    const entry = currentEntry.value?.entry
    if (!entry) return -1
    return parseTime(entry.time)
  })

  return {
    currentIndex, showDetails, fontSize,
    currentEntry, currentDayIndex, currentDanceNumber,
    progressPercent, canGoPrev, canGoNext, currentTimeOfEntry,
    initForSchedule, goTo, goNext, goPrev, toggleDetails, cycleFontSize, jumpToNow,
  }
})
