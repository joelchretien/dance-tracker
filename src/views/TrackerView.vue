<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useIntervalFn } from '@vueuse/core'
import { Star, Play } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { useSnapback } from '@/composables/useSnapback'
import TopBar from '@/components/TopBar.vue'
import ScheduleList from '@/components/ScheduleList.vue'
import WatchedDancesList from '@/components/WatchedDancesList.vue'
import SnapbackPill from '@/components/SnapbackPill.vue'
import SettingsDropdown from '@/components/SettingsDropdown.vue'
import ViewModeDropdown from '@/components/ViewModeDropdown.vue'
import WatchPanel from '@/components/WatchPanel.vue'
import JumpToPanel from '@/components/JumpToPanel.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import CountdownBanner from '@/components/CountdownBanner.vue'
import WatchedDancersTipModal from '@/components/WatchedDancersTipModal.vue'
import CurrentDanceTipModal from '@/components/CurrentDanceTipModal.vue'

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

function scrollToEntry(index: number, smooth: boolean) {
  const el = document.getElementById(`entry-${index}`)
  if (el) {
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'center' })
  }
}

/** The index closest to wall-clock-now within the currently rendered list. */
function nowIndexForCurrentMode(): number | null {
  if (ui.viewMode === 'dancers') return watchStore.nearestWatchedToNow()
  if (ui.viewMode === 'studio') return watchStore.nearestStudioToNow()
  return navigation.jumpToNow()?.index ?? null
}

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

  // Stored viewMode could be 'studio' or 'dancers' from a previous session
  // while the watched-dancers list is empty — for example after the user
  // cleared dancers in another tab, or after a localStorage migration. The
  // length-watcher only fires on the 1→0 transition, so we also check once
  // explicitly after init.
  if (ui.viewMode !== 'all' && watchStore.watchedDancers.length === 0) {
    ui.setViewMode('all')
  }

  ui.updateScheduleStatus()
  navigation.updateNowIndex()

  await nextTick()
  // First-time users (no anchor) land near wall-clock-now. Returning users
  // land on their last marked/active entry. The "now" target is mode-aware
  // because filtered lists only render their subset of entries — using
  // navigation.nowIndex in studio/dancers mode would target an element
  // that isn't on the page.
  if (!navigation.hasAnchor) {
    const idx = nowIndexForCurrentMode()
    scrollToEntry(idx ?? navigation.activeIndex, false)
  } else {
    scrollToEntry(navigation.activeIndex, false)
  }
})

// Unified 1-second tick: auto-advance, progress bar, now-index
const { pause } = useIntervalFn(() => {
  navigation.tick()
  ui.updateScheduleStatus()
}, 1000)

onUnmounted(() => {
  pause()
})

const CURRENT_DANCE_ONBOARDED_KEY = 'dt:onboardedCurrentDance'

// Scroll only on manual marks — not timer-driven changes, which would
// yank the user away from wherever they're browsing.
watch(() => navigation.markedIndex, () => {
  ui.updateScheduleStatus()
  nextTick(() => scrollToEntry(navigation.activeIndex, true))
})

// First-time educational modal: fires when the anchor goes from "not set"
// to "set" — the moment the user has marked any dance. Watching markedIndex
// alone misses the case where the user marks entry 0 (no index change).
watch(() => navigation.hasAnchor, (newVal, oldVal) => {
  if (!newVal || oldVal) return
  if (localStorage.getItem(CURRENT_DANCE_ONBOARDED_KEY) === '1') return
  localStorage.setItem(CURRENT_DANCE_ONBOARDED_KEY, '1')
  ui.currentDanceTipOpen = true
})

// Update schedule status whenever the anchor offset changes (e.g. via scrub).
// markedIndex often stays the same when scrubbing, so the watcher above misses it.
watch(() => navigation.anchorWallMinutes, () => {
  ui.updateScheduleStatus()
})

// Filter modes other than 'all' show nothing useful when there are no watched
// dancers. If the user removes their last one while in studio/dancers view,
// fall back to 'all' so they aren't stuck looking at an empty list.
watch(() => watchStore.watchedDancers.length, (count) => {
  if (count === 0 && ui.viewMode !== 'all') {
    ui.setViewMode('all')
  }
})

function handleJumpToNow() {
  const idx = nowIndexForCurrentMode()
  if (idx !== null) {
    nextTick(() => scrollToEntry(idx, true))
  }
}

// When the user picks a different filter, jump to the wall-clock-now entry
// in the new view. nextTick gives the new list a frame to render before
// we look up its DOM elements.
watch(() => ui.viewMode, () => {
  nextTick(() => {
    const idx = nowIndexForCurrentMode()
    if (idx !== null) scrollToEntry(idx, true)
  })
})

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
    />

    <!-- Onboarding hint: shown after the user has watched dancers but
         before they've set a current dance. Sequences the onboarding so
         only one CTA competes for attention at a time. -->
    <div
      v-if="!navigation.hasAnchor && watchStore.watchedDancers.length > 0"
      class="mx-2 mt-2 px-4 py-3 rounded-lg border border-indigo-400/40 bg-indigo-500/15 flex items-center gap-2.5"
    >
      <Play :size="18" class="text-indigo-300 fill-indigo-300 shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-indigo-200">Tap any dance to set as current</div>
        <div class="text-xs text-indigo-300/70 mt-0.5">The app will auto-advance from there</div>
      </div>
    </div>

    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-20">
      <WatchedDancesList v-if="ui.viewMode !== 'all'" />
      <ScheduleList v-else />
    </div>

    <div v-if="watchStore.watchedDancers.length === 0 || watchStore.nextTargetEntry" id="bottom-bar" class="fixed bottom-0 left-0 right-0 z-20 px-2 pt-2 pb-2 bg-surface border-t border-gray-700 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      <button
        v-if="watchStore.watchedDancers.length === 0"
        class="w-full px-4 py-3 rounded-lg border border-gold-400/30 bg-gold-400/10 active:bg-gold-400/15 transition-colors text-left"
        @click="ui.openWatchPanel()"
      >
        <div class="flex items-center gap-2.5">
          <Star :size="18" class="text-gold-400 fill-gold-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gold-400">Add Watched Dancers</div>
            <div class="text-xs text-gold-400/60 mt-0.5">Tap to highlight specific dancers and get a countdown to their next dance</div>
          </div>
        </div>
      </button>
      <div v-else @click="handleJumpToNext">
        <CountdownBanner />
      </div>
      <div style="height: env(safe-area-inset-bottom, 0px)" class="bg-surface"></div>
    </div>

    <SnapbackPill
      v-if="ui.snapbackVisible"
      @click="handleJumpToNow"
    />

    <SettingsDropdown v-if="ui.settingsDropdownOpen" />
    <ViewModeDropdown v-if="ui.viewModeDropdownOpen" />
    <WatchPanel v-if="ui.watchPanelOpen" />
    <JumpToPanel v-if="ui.jumpToPanelOpen" @jump-to="handlePanelJump" />
    <ToastNotification v-if="ui.toastMessage" :message="ui.toastMessage" />
    <WatchedDancersTipModal v-if="ui.watchedDancersTipOpen" @close="ui.watchedDancersTipOpen = false" />
    <CurrentDanceTipModal v-if="ui.currentDanceTipOpen" @close="ui.currentDanceTipOpen = false" />
  </div>
</template>
