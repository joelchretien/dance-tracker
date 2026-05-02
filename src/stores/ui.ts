import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useScheduleStore } from './schedule'
import { useNavigationStore } from './navigation'
import { classifyScheduleStatus } from '@/lib/schedule-status'
import { currentTimeMinutes, localDateString } from '@/lib/time'
import type { ScheduleStatus } from '@/types/schedule'

export const useUiStore = defineStore('ui', () => {
  // Panels
  const jumpToPanelOpen = ref(false)
  const jumpToQuery = ref('')
  const watchPanelOpen = ref(false)
  const watchSearchQuery = ref('')
  const settingsDropdownOpen = ref(false)

  // View mode
  const watchedDancesMode = ref(false)

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

  // First-time educational modal after marking a dance as current

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
  }

  function closeSettingsDropdown() {
    settingsDropdownOpen.value = false
  }

  function toggleMyDancesMode(): string {
    watchedDancesMode.value = !watchedDancesMode.value
    return watchedDancesMode.value ? '★ Watched Dances' : '☰ All Dances'
  }

  function setSnapback(visible: boolean) {
    snapbackVisible.value = visible
  }

  function updateScheduleStatus() {
    const schedule = useScheduleStore()
    const nav = useNavigationStore()

    // When the user has anchored a current dance, the schedule status reflects
    // the OFFSET they established (and that scrubbing changes). When no anchor
    // is set, fall back to comparing the active entry's scheduled time to wall
    // clock now.
    let entryTime: number
    let now: number
    let entryDayIndex: number

    if (nav.hasAnchor && nav.anchorWallMinutes !== null) {
      entryTime = nav.markedTimeOfEntry
      now = nav.anchorWallMinutes
      entryDayIndex = schedule.flatEntries[nav.markedIndex]?.dayIndex ?? 0
    } else {
      entryTime = nav.activeTimeOfEntry
      now = currentTimeMinutes()
      entryDayIndex = nav.activeDayIndex
    }

    const entryDate = schedule.days[entryDayIndex]?.date
    const today = localDateString()
    const sameDay = entryDate === today
    const dayLabel = schedule.days[entryDayIndex]?.label ?? ''

    scheduleStatus.value = classifyScheduleStatus(entryTime, now, sameDay, dayLabel + ' schedule')
  }

  return {
    jumpToPanelOpen, jumpToQuery,
    watchPanelOpen, watchSearchQuery,
    settingsDropdownOpen,
    watchedDancesMode,
    toastMessage, toastTimerId,
    snapbackVisible,
    scheduleStatus,
    watchedDancersTipOpen,
    currentDanceTipOpen,
    showToast,
    openJumpToPanel, closeJumpToPanel,
    openWatchPanel, closeWatchPanel,
    toggleSettingsDropdown, closeSettingsDropdown,
    toggleMyDancesMode,
    setSnapback, updateScheduleStatus,
  }
})
