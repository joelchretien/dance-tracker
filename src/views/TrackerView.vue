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
import SettingsDropdown from '@/components/SettingsDropdown.vue'
import WatchPanel from '@/components/WatchPanel.vue'
import JumpToPanel from '@/components/JumpToPanel.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import CountdownBanner from '@/components/CountdownBanner.vue'

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

  if (!schedule.isLoaded) {
    schedule.error = null
    router.replace('/')
    return
  }

  navigation.initForSchedule(props.scheduleId)
  watchStore.initForSchedule(props.scheduleId)
  ui.updateScheduleStatus()
  navigation.updateNowIndex()

  await nextTick()
  scrollToEntry(navigation.activeIndex, false)
})

// Unified 1-second tick: auto-advance, progress bar, now-index
const { pause } = useIntervalFn(() => {
  navigation.tick()
  ui.updateScheduleStatus()
}, 1000)

onUnmounted(() => {
  pause()
})

// Scroll only on manual marks — not timer-driven changes, which would
// yank the user away from wherever they're browsing.
watch(() => navigation.markedIndex, () => {
  ui.updateScheduleStatus()
  nextTick(() => scrollToEntry(navigation.activeIndex, true))
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

function handleToggleWatchedDances() {
  const msg = ui.toggleMyDancesMode()
  ui.showToast(msg)
}

function handlePanelJump(index: number) {
  nextTick(() => scrollToEntry(index, true))
}

function handleJumpToNext() {
  if (watchStore.nextTargetIndex !== null) {
    scrollToEntry(watchStore.nextTargetIndex, true)
  }
}
</script>

<template>
  <div v-if="!schedule.isLoaded" class="flex items-center justify-center min-h-screen">
    <div class="text-gray-400">Loading schedule...</div>
  </div>
  <div v-else class="flex flex-col h-dvh">
    <TopBar
      :title="schedule.meta?.name ?? ''"
      :show-back="multipleSchedules"
      @toggle-watched-dances="handleToggleWatchedDances"
    />
    <ScheduleStatus :status="ui.scheduleStatus" />

    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-20">
      <WatchedDancesList v-if="ui.watchedDancesMode" />
      <ScheduleList v-else />
    </div>

    <div v-if="watchStore.watchedDancers.length > 0 && watchStore.nextTargetEntry" id="bottom-bar" class="fixed bottom-0 left-0 right-0 z-20 px-2 pt-2 pb-2 bg-surface border-t border-gray-700 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]" @click="handleJumpToNext">
      <CountdownBanner />
      <div style="height: env(safe-area-inset-bottom, 0px)" class="bg-surface"></div>
    </div>

    <SnapbackPill
      v-if="ui.snapbackVisible"
      @click="handleJumpToNow"
    />

    <SettingsDropdown v-if="ui.settingsDropdownOpen" />
    <WatchPanel v-if="ui.watchPanelOpen" />
    <JumpToPanel v-if="ui.jumpToPanelOpen" @jump-to="handlePanelJump" />
    <ToastNotification v-if="ui.toastMessage" :message="ui.toastMessage" />
  </div>
</template>
