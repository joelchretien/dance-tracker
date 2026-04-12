<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useIntervalFn } from '@vueuse/core'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { useSnapback } from '@/composables/useSnapback'
import TopBar from '@/components/TopBar.vue'
import ScheduleStatus from '@/components/ScheduleStatus.vue'
import ScheduleList from '@/components/ScheduleList.vue'
import WatchedDancesList from '@/components/WatchedDancesList.vue'
import SnapbackPill from '@/components/SnapbackPill.vue'
import BottomBar from '@/components/BottomBar.vue'
import SettingsDropdown from '@/components/SettingsDropdown.vue'
import WatchPanel from '@/components/WatchPanel.vue'
import JumpToPanel from '@/components/JumpToPanel.vue'
import ToastNotification from '@/components/ToastNotification.vue'

const props = defineProps<{ scheduleId: string }>()

const router = useRouter()
const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const scrollContainer = ref<HTMLElement | null>(null)

useSnapback(scrollContainer)

const multipleSchedules = computed(() =>
  (schedule.manifest?.schedules.length ?? 0) > 1
)

onMounted(async () => {
  await Promise.all([
    schedule.loadSchedule(props.scheduleId),
    schedule.manifest ? Promise.resolve() : schedule.loadManifest(),
  ])
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
  if (ui.watchedDancesMode) {
    const nearest = watchStore.nearestWatchedToNow()
    if (nearest !== null) {
      nextTick(() => scrollToEntry(nearest, true))
    }
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

function handleToggleWatchedDances() {
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
  <div v-else-if="schedule.error" class="flex items-center justify-center min-h-screen px-6">
    <div class="text-center">
      <div class="text-lg font-semibold text-gray-300 mb-2">Schedule not found</div>
      <div class="text-sm text-gray-500 mb-6">{{ schedule.error }}</div>
      <button
        class="px-5 py-2.5 bg-indigo-600 rounded-lg text-sm font-medium active:bg-indigo-700"
        @click="router.push('/')"
      >Back to schedule list</button>
    </div>
  </div>
  <div v-else-if="schedule.isLoaded" class="flex flex-col h-dvh">
    <TopBar
      :title="schedule.meta?.name ?? ''"
      :show-back="multipleSchedules"
      @toggle-watched-dances="handleToggleWatchedDances"
    />
    <ScheduleStatus :status="ui.scheduleStatus" />

    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-40">
      <WatchedDancesList v-if="ui.watchedDancesMode" />
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
