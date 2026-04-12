import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useScheduleStore } from './schedule'
import { useNavigationStore } from './navigation'
import { classifyScheduleStatus } from '@/lib/schedule-status'
import { currentTimeMinutes } from '@/lib/time'
import type { ScheduleStatus } from '@/types/schedule'

export const useUiStore = defineStore('ui', () => {
  // Panels
  const jumpToPanelOpen = ref(false)
  const jumpToQuery = ref('')
  const settingsPanelOpen = ref(false)
  const settingsWatchQuery = ref('')

  // View mode
  const myDancesMode = ref(false)

  // Toast
  const toastMessage = ref('')
  const toastTimerId = ref<ReturnType<typeof setTimeout> | null>(null)

  // Snapback pill
  const snapbackVisible = ref(false)

  // Schedule status
  const scheduleStatus = ref<ScheduleStatus>({ kind: 'not-started' })

  function showToast(msg: string) {
    toastMessage.value = msg
    if (toastTimerId.value) clearTimeout(toastTimerId.value)
    toastTimerId.value = setTimeout(() => {
      toastMessage.value = ''
      toastTimerId.value = null
    }, 1800)
  }

  function clearToast() {
    toastMessage.value = ''
    if (toastTimerId.value) {
      clearTimeout(toastTimerId.value)
      toastTimerId.value = null
    }
  }

  function openJumpToPanel() {
    jumpToPanelOpen.value = true
    jumpToQuery.value = ''
  }

  function closeJumpToPanel() {
    jumpToPanelOpen.value = false
    jumpToQuery.value = ''
  }

  function openSettingsPanel() {
    settingsPanelOpen.value = true
    settingsWatchQuery.value = ''
  }

  function closeSettingsPanel() {
    settingsPanelOpen.value = false
    settingsWatchQuery.value = ''
  }

  function toggleMyDancesMode(): string {
    myDancesMode.value = !myDancesMode.value
    return myDancesMode.value ? '★ My Dances' : '☰ All Dances'
  }

  function setSnapback(visible: boolean) {
    snapbackVisible.value = visible
  }

  function updateScheduleStatus() {
    const schedule = useScheduleStore()
    const nav = useNavigationStore()
    const entryTime = nav.currentTimeOfEntry
    const now = currentTimeMinutes()

    const entryDayIndex = nav.currentDayIndex
    const entryDate = schedule.days[entryDayIndex]?.date
    const today = new Date().toISOString().slice(0, 10)
    const sameDay = entryDate === today
    const dayLabel = schedule.days[entryDayIndex]?.label ?? ''

    scheduleStatus.value = classifyScheduleStatus(entryTime, now, sameDay, dayLabel + ' schedule')
  }

  return {
    jumpToPanelOpen, jumpToQuery,
    settingsPanelOpen, settingsWatchQuery,
    myDancesMode,
    toastMessage, toastTimerId,
    snapbackVisible,
    scheduleStatus,
    showToast, clearToast,
    openJumpToPanel, closeJumpToPanel,
    openSettingsPanel, closeSettingsPanel,
    toggleMyDancesMode,
    setSnapback, updateScheduleStatus,
  }
})
