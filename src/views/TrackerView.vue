<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
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
import MyDancesList from '@/components/MyDancesList.vue'
import SnapbackPill from '@/components/SnapbackPill.vue'
import BottomBar from '@/components/BottomBar.vue'
import JumpToPanel from '@/components/JumpToPanel.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
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
  scrollToEntry(navigation.markedIndex, false)
})

const { pause } = useIntervalFn(() => {
  ui.updateScheduleStatus()
}, 30000)

onUnmounted(() => {
  pause()
})

watch(() => navigation.markedIndex, () => {
  ui.updateScheduleStatus()
  nextTick(() => scrollToEntry(navigation.markedIndex, true))
})

function scrollToEntry(index: number, smooth: boolean) {
  const el = document.getElementById(`entry-${index}`)
  if (el) {
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'center' })
  }
}

function handleJumpToNow() {
  const result = navigation.jumpToNow()
  if (result !== null) {
    nextTick(() => scrollToEntry(result.index, true))
  }
}

function handleJumpToNext() {
  if (watchStore.nextTargetIndex !== null) {
    scrollToEntry(watchStore.nextTargetIndex, true)
  }
}

function handleToggleMyDances() {
  const msg = ui.toggleMyDancesMode()
  ui.showToast(msg)
}

function handlePanelJump(index: number) {
  nextTick(() => scrollToEntry(index, true))
}
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
      @toggle-my-dances="handleToggleMyDances"
    />
    <ProgressBar :percent="navigation.progressPercent" />
    <ScheduleStatus :status="ui.scheduleStatus" />

    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-40">
      <MyDancesList v-if="ui.myDancesMode" />
      <ScheduleList v-else />
    </div>

    <SnapbackPill
      v-if="ui.snapbackVisible"
      @click="handleJumpToNow"
    />

    <BottomBar @jump-to-next="handleJumpToNext" />
    <JumpToPanel v-if="ui.jumpToPanelOpen" @jump-to="handlePanelJump" />
    <SettingsPanel v-if="ui.settingsPanelOpen" />
    <ToastNotification v-if="ui.toastMessage" :message="ui.toastMessage" />
  </div>
</template>
