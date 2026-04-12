<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { useSnapback } from '@/composables/useSnapback'
import TopBar from '@/components/TopBar.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ScheduleStatus from '@/components/ScheduleStatus.vue'
import ScheduleList from '@/components/ScheduleList.vue'
import SnapbackPill from '@/components/SnapbackPill.vue'
import BottomBar from '@/components/BottomBar.vue'
import WatchPanel from '@/components/WatchPanel.vue'
import ToastNotification from '@/components/ToastNotification.vue'

const props = defineProps<{ scheduleId: string }>()

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const scrollContainer = ref<HTMLElement | null>(null)

useSnapback(scrollContainer)

onMounted(async () => {
  await schedule.loadSchedule(props.scheduleId)
  navigation.initForSchedule(props.scheduleId)
  watchStore.initForSchedule(props.scheduleId)
  ui.updateScheduleStatus()

  await nextTick()
  scrollToCurrentEntry(false)
})

// 30-second schedule status refresh
const { pause } = useIntervalFn(() => {
  ui.updateScheduleStatus()
}, 30000)

onUnmounted(() => {
  pause()
})

watch(() => navigation.currentIndex, () => {
  ui.updateScheduleStatus()
  nextTick(() => scrollToCurrentEntry(true))
})

function scrollToCurrentEntry(smooth: boolean) {
  const el = document.getElementById(`entry-${navigation.currentIndex}`)
  if (el) {
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'center' })
  }
}

function snapToCurrent() {
  scrollToCurrentEntry(true)
}

function handleJumpToNow() {
  const result = navigation.jumpToNow()
  if (result !== null) {
    ui.showToast(result.toast)
    nextTick(() => {
      const el = document.getElementById(`entry-${result.index}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
}

// Countdown banner tap: scroll to next watched entry without changing selection
// (matches original jmpNxt behavior)
function handleJumpToNext() {
  if (watchStore.nextTargetIndex !== null) {
    const el = document.getElementById(`entry-${watchStore.nextTargetIndex}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function handleCycleFontSize() {
  const msg = navigation.cycleFontSize()
  ui.showToast(msg)
}

function handleToggleDetails() {
  const msg = navigation.toggleDetails()
  ui.showToast(msg)
}

const currentEntryTitle = computed(() => {
  const entry = navigation.currentEntry?.entry
  if (!entry) return ''
  return entry.title
})

const currentEntryTime = computed(() => {
  const entry = navigation.currentEntry?.entry
  if (!entry) return ''
  return entry.time
})
</script>

<template>
  <div v-if="schedule.loading" class="flex items-center justify-center min-h-screen">
    <div class="text-gray-400">Loading schedule...</div>
  </div>
  <div v-else-if="schedule.error" class="flex items-center justify-center min-h-screen">
    <div class="text-red-400">{{ schedule.error }}</div>
  </div>
  <div v-else-if="schedule.isLoaded" class="flex flex-col h-dvh">
    <TopBar
      :title="schedule.meta?.name ?? ''"
      @jump-to-now="handleJumpToNow"
      @cycle-font-size="handleCycleFontSize"
      @toggle-details="handleToggleDetails"
    />
    <ProgressBar :percent="navigation.progressPercent" />
    <ScheduleStatus :status="ui.scheduleStatus" />

    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-40">
      <ScheduleList />
    </div>

    <SnapbackPill
      v-if="ui.snapbackVisible"
      :direction="ui.snapbackDirection"
      :title="currentEntryTitle"
      :time="currentEntryTime"
      @click="snapToCurrent"
    />

    <BottomBar @jump-to-next="handleJumpToNext" />
    <WatchPanel v-if="ui.watchPanelOpen" />
    <ToastNotification v-if="ui.toastMessage" :message="ui.toastMessage" />
  </div>
</template>
