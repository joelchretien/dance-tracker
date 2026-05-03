import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { useNavigationStore } from './navigation'
import { classifyScheduleStatus } from '@/lib/schedule-status'
import { currentTimeMinutes, localDateString, parseTime } from '@/lib/time'
import { normalizeViewMode } from '@/lib/normalize-persisted'
import type { ScheduleStatus } from '@/types/schedule'

export type ViewMode = 'all' | 'studio' | 'dancers'

export const useUiStore = defineStore('ui', () => {
  // Panels
  const jumpToPanelOpen = ref(false)
  const jumpToQuery = ref('')
  const watchPanelOpen = ref(false)
  const watchSearchQuery = ref('')
  const settingsDropdownOpen = ref(false)
  const viewModeDropdownOpen = ref(false)

  // View mode — All Dances, Watched Studio, Watched Dancers.
  // Per-schedule: two competitions can have completely different watched
  // dancer sets, so the filter that makes sense for one (e.g. "studio")
  // doesn't necessarily make sense for the other.
  const viewMode = ref<ViewMode>('all')
  let viewModeStorage: ReturnType<typeof useLocalStorage<ViewMode>> | null = null

  function initForSchedule(id: string) {
    viewModeStorage = useLocalStorage<ViewMode>(`dt:${id}:viewMode`, 'all')
    const safe = normalizeViewMode(viewModeStorage.value)
    viewMode.value = safe
    viewModeStorage.value = safe
  }

  // Toast
  const toastMessage = ref('')
  const toastTimerId = ref<ReturnType<typeof setTimeout> | null>(null)

  // Snapback pill
  const snapbackVisible = ref(false)

  // Schedule status
  const scheduleStatus = ref<ScheduleStatus>({ kind: 'not-started' })

  // First-time educational modal after closing the WatchPanel
  const watchedDancersTipOpen = ref(false)

  // First-time educational modal after marking a dance as current
  const currentDanceTipOpen = ref(false)

  // Install instructions modal (iOS) — hoisted to view level so it
  // outlives the SettingsDropdown unmount or the banner re-render that
  // would otherwise kill it.
  const installInstructionsOpen = ref(false)

  // SW update available. Set by main.ts when a new SW reaches the
  // 'waiting' state. The banner is the user's opt-in to apply the
  // update — without this, a controllerchange auto-reload during a
  // live competition would interrupt the user mid-tracking. Stored as
  // a function so main.ts can attach the actual SW transition logic
  // without the UI store importing service-worker code.
  const updateAvailable = ref(false)
  const applyUpdate = ref<(() => void) | null>(null)

  function showToast(msg: string, durationMs = 1800) {
    toastMessage.value = msg
    if (toastTimerId.value) clearTimeout(toastTimerId.value)
    toastTimerId.value = setTimeout(() => {
      toastMessage.value = ''
      toastTimerId.value = null
    }, durationMs)
  }


  function openJumpToPanel() {
    jumpToPanelOpen.value = true
    jumpToQuery.value = ''
  }

  function closeJumpToPanel() {
    jumpToPanelOpen.value = false
    jumpToQuery.value = ''
  }

  function openWatchPanel() {
    settingsDropdownOpen.value = false
    watchPanelOpen.value = true
    watchSearchQuery.value = ''
  }

  function closeWatchPanel() {
    watchPanelOpen.value = false
    watchSearchQuery.value = ''
  }

  function toggleSettingsDropdown() {
    settingsDropdownOpen.value = !settingsDropdownOpen.value
    if (settingsDropdownOpen.value) viewModeDropdownOpen.value = false
  }

  function closeSettingsDropdown() {
    settingsDropdownOpen.value = false
  }

  function toggleViewModeDropdown() {
    viewModeDropdownOpen.value = !viewModeDropdownOpen.value
    if (viewModeDropdownOpen.value) settingsDropdownOpen.value = false
  }

  function closeViewModeDropdown() {
    viewModeDropdownOpen.value = false
  }

  function setViewMode(mode: ViewMode, opts: { skipAutoJump?: boolean } = {}) {
    if (opts.skipAutoJump) skipNextViewModeJump.value = true
    viewMode.value = mode
    if (viewModeStorage) viewModeStorage.value = mode
    viewModeDropdownOpen.value = false
  }

  /**
   * One-shot signal used by JumpToPanel to tell TrackerView's viewMode watcher
   * "I just changed the mode but I have my own scroll target — don't auto-jump
   * to now." TrackerView reads + clears it inside the watcher.
   */
  const skipNextViewModeJump = ref(false)

  function setSnapback(visible: boolean) {
    snapbackVisible.value = visible
  }

  function updateScheduleStatus() {
    const schedule = useScheduleStore()
    const nav = useNavigationStore()

    // When the user has anchored a current dance, the schedule status reflects
    // the OFFSET they established (and that scrubbing changes). When no anchor
    // is set, fall back to comparing today's near-now entry to wall clock —
    // not the marked default (entry 0), which would be on the wrong day.
    let entryTime: number
    let now: number
    let entryDayIndex: number

    if (nav.hasAnchor && nav.anchorWallMinutes !== null) {
      entryTime = nav.markedTimeOfEntry
      now = nav.anchorWallMinutes
      entryDayIndex = schedule.flatEntries[nav.markedIndex]?.dayIndex ?? 0
    } else {
      const refIdx = nav.nowIndex ?? nav.activeIndex
      const refEntry = schedule.flatEntries[refIdx]
      entryTime = refEntry ? parseTime(refEntry.entry.time) : -1
      entryDayIndex = refEntry?.dayIndex ?? 0
      now = currentTimeMinutes()
    }

    const entryDate = schedule.days[entryDayIndex]?.date
    const today = localDateString()
    const sameDay = entryDate === today
    const dayLabel = schedule.days[entryDayIndex]?.label ?? ''

    // With an anchor, the offset is something the user has explicitly set
    // (mark or scrub) and they want to see every minute of it. Without an
    // anchor, diff naturally drifts as wall clock crosses entries — keep the
    // 5-min tolerance to avoid flickering "1 min ahead" → "1 min behind".
    const threshold = nav.hasAnchor ? 0 : 5

    scheduleStatus.value = classifyScheduleStatus(entryTime, now, sameDay, dayLabel + ' schedule', threshold)
  }

  return {
    jumpToPanelOpen, jumpToQuery,
    watchPanelOpen, watchSearchQuery,
    settingsDropdownOpen,
    viewModeDropdownOpen,
    viewMode,
    skipNextViewModeJump,
    toastMessage, toastTimerId,
    snapbackVisible,
    scheduleStatus,
    watchedDancersTipOpen,
    currentDanceTipOpen,
    installInstructionsOpen,
    updateAvailable,
    applyUpdate,
    showToast,
    openJumpToPanel, closeJumpToPanel,
    openWatchPanel, closeWatchPanel,
    toggleSettingsDropdown, closeSettingsDropdown,
    toggleViewModeDropdown, closeViewModeDropdown, setViewMode,
    setSnapback, updateScheduleStatus,
    initForSchedule,
  }
})
