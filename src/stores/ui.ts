import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useScheduleStore } from './schedule'
import { useNavigationStore } from './navigation'
import { classifyScheduleStatus } from '@/lib/schedule-status'
import { currentTimeMinutes } from '@/lib/time'
import type { ScheduleStatus } from '@/types/schedule'

export const useUiStore = defineStore('ui', () => {
  const watchPanelOpen = ref(false)
  const watchSearchQuery = ref('')
  const toastMessage = ref('')
  const toastTimerId = ref<ReturnType<typeof setTimeout> | null>(null)
  const snapbackVisible = ref(false)
  const snapbackDirection = ref<'up' | 'down'>('down')
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

  function openWatchPanel() {
    watchPanelOpen.value = true
    watchSearchQuery.value = ''
  }

  function closeWatchPanel() {
    watchPanelOpen.value = false
    watchSearchQuery.value = ''
  }

  function setSnapback(visible: boolean, direction: 'up' | 'down' = 'down') {
    snapbackVisible.value = visible
    snapbackDirection.value = direction
  }

  function updateScheduleStatus() {
    const schedule = useScheduleStore()
    const nav = useNavigationStore()
    const entryTime = nav.currentTimeOfEntry
    const now = currentTimeMinutes()

    // Determine if the selected entry's day matches today
    const entryDayIndex = nav.currentDayIndex
    const entryDate = schedule.days[entryDayIndex]?.date
    const today = new Date().toISOString().slice(0, 10)
    const sameDay = entryDate === today
    const dayLabel = schedule.days[entryDayIndex]?.label ?? ''

    scheduleStatus.value = classifyScheduleStatus(entryTime, now, sameDay, dayLabel + ' schedule')
  }

  return {
    watchPanelOpen, watchSearchQuery,
    toastMessage, toastTimerId,
    snapbackVisible, snapbackDirection,
    scheduleStatus,
    showToast, clearToast,
    openWatchPanel, closeWatchPanel,
    setSnapback, updateScheduleStatus,
  }
})
