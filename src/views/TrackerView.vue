<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { useSnapback } from '@/composables/useSnapback'
import TopBar from '@/components/TopBar.vue'
import ScheduleStatus from '@/components/ScheduleStatus.vue'
import ScheduleList from '@/components/ScheduleList.vue'
import MyDancesList from '@/components/MyDancesList.vue'
import SnapbackPill from '@/components/SnapbackPill.vue'
import BottomBar from '@/components/BottomBar.vue'
import SettingsDropdown from '@/components/SettingsDropdown.vue'
import WatchPanel from '@/components/WatchPanel.vue'
import JumpToPanel from '@/components/JumpToPanel.vue'
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
  navigation.updateNowIndex()

  await nextTick()
  scrollToEntry(navigation.markedIndex, false)
})

const { pause } = useIntervalFn(() => {
  ui.updateScheduleStatus()
  navigation.updateNowIndex()
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
  if (ui.myDancesMode) {
    // Find the watched entry nearest to current time and scroll to it
    const now = navigation.nowIndex
    if (now === null) return
    const indices = watchStore.watchedEntryIndices
    if (indices.length === 0) return
    let best = indices[0]
    let bestDist = Math.abs(best - now)
    for (const gi of indices) {
      const dist = Math.abs(gi - now)
      if (dist < bestDist) { best = gi; bestDist = dist }
    }
    nextTick(() => scrollToEntry(best, true))
  } else {
    const result = navigation.jumpToNow()
    if (result !== null) {
      nextTick(() => scrollToEntry(result.index, true))
    }
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
    <SettingsDropdown v-if="ui.settingsDropdownOpen" />
    <WatchPanel v-if="ui.watchPanelOpen" />
    <JumpToPanel v-if="ui.jumpToPanelOpen" @jump-to="handlePanelJump" />
    <ToastNotification v-if="ui.toastMessage" :message="ui.toastMessage" />
  </div>
</template>
