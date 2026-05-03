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
import InstallInstructionsModal from '@/components/InstallInstructionsModal.vue'

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

/** True if the given global index is rendered in the current view's filtered list. */
function isVisibleInCurrentMode(idx: number): boolean {
  if (ui.viewMode === 'all') return true
  const indices =
    ui.viewMode === 'dancers' ? watchStore.watchedEntryIndices : watchStore.studioEntryIndices
  return indices.includes(idx)
}

// Unified 1-second tick: auto-advance, progress bar, now-index. Started
// only after onMounted finishes initializing the stores — VueUse's
// default `immediate: true` would otherwise fire tick() against
// uninitialized schedule state on a slow first load (the stores have
// defensive fallbacks, but starting the loop before its inputs exist
// is an avoidable race in the most-trafficked route).
const { pause, resume } = useIntervalFn(() => {
  navigation.tick()
  ui.updateScheduleStatus()
}, 1000, { immediate: false })

onUnmounted(() => {
  pause()
})

onMounted(async () => {
  // Reject IDs that would produce ambiguous localStorage keys when
  // interpolated into `dt:${id}:nav` etc. Safe charset is alphanumeric
  // + dash + underscore; manifest IDs are author-controlled today but
  // a stray colon would silently shadow keys from another schedule.
  if (!/^[a-zA-Z0-9_-]+$/.test(props.scheduleId)) {
    router.replace('/')
    return
  }

  await Promise.all([
    schedule.loadSchedule(props.scheduleId),
    schedule.manifest ? Promise.resolve() : schedule.loadManifest(),
  ])

  if (!schedule.isLoaded) {
    // Don't suppress schedule.error — let HomeView surface it. Without
    // this, validation/network failures produce a silent redirect loop
    // (HomeView auto-redirects to the only schedule, which fails again).
    router.replace('/')
    return
  }

  navigation.initForSchedule(props.scheduleId)
  watchStore.initForSchedule(props.scheduleId)
  ui.initForSchedule(props.scheduleId)

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
  // land on their last marked/active entry. Both targets are mode-aware
  // because filtered lists only render their subset of entries — using a
  // global index that isn't in the filtered set would silently no-op.
  if (!navigation.hasAnchor) {
    const idx = nowIndexForCurrentMode()
    scrollToEntry(idx ?? navigation.activeIndex, false)
  } else {
    // Try the active (anchored) entry first; if it isn't visible in the
    // current filter, fall back to the mode-aware now index.
    const target = isVisibleInCurrentMode(navigation.activeIndex)
      ? navigation.activeIndex
      : nowIndexForCurrentMode() ?? navigation.activeIndex
    scrollToEntry(target, false)
  }

  initComplete.value = true
  // Now safe to start the 1-second tick loop; all stores are initialized
  // and the schedule is loaded.
  resume()
})

const CURRENT_DANCE_ONBOARDED_KEY = 'dt:onboardedCurrentDance'

// Watchers below need to distinguish "user marked something" from "init loaded
// persisted state into the ref". Vue watchers fire on any value change after
// registration, including the one that init triggers. initComplete flips true
// once onMounted finishes, which gates the user-action-only side effects.
const initComplete = ref(false)

// Scroll only on manual marks — not timer-driven changes, which would
// yank the user away from wherever they're browsing. The initComplete gate
// prevents the deferred smooth-scroll from firing during init and overriding
// onMounted's explicit scroll-to-now.
watch(() => navigation.markedIndex, () => {
  if (!initComplete.value) return
  ui.updateScheduleStatus()
  nextTick(() => scrollToEntry(navigation.activeIndex, true))
})

// First-time educational modal: fires when the anchor goes from "not set"
// to "set" — the moment the user has marked any dance. Watching markedIndex
// alone misses the case where the user marks entry 0 (no index change).
// Gated by initComplete so a returning user with a persisted anchor doesn't
// see the modal on every app open.
watch(() => navigation.hasAnchor, (newVal, oldVal) => {
  if (!initComplete.value) return
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
// we look up its DOM elements. Search-driven mode changes set
// ui.skipNextViewModeJump so the search-jump scroll isn't immediately
// overridden by a scroll-to-now from this watcher.
watch(() => ui.viewMode, () => {
  if (ui.skipNextViewModeJump) {
    ui.skipNextViewModeJump = false
    return
  }
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
         only one CTA competes for attention at a time. Suppressed
         off-hours (post-show, between days, before the first day) where
         "set as current" is meaningless. -->
    <div
      v-if="!navigation.hasAnchor && watchStore.watchedDancers.length > 0 && navigation.isWithinActiveHours"
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
    <InstallInstructionsModal v-if="ui.installInstructionsOpen" @close="ui.installInstructionsOpen = false" />
  </div>
</template>
