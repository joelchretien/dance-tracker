<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue'
import { X, Search } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { enrichSearchResults, type EnrichedSearchResult } from '@/lib/search-enrich'
import { titleCaseDanceTitle } from '@/lib/title-case'
import DancerBadge from './DancerBadge.vue'

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const emit = defineEmits<{ 'jump-to': [index: number] }>()

const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

const hasQuery = computed(() => ui.jumpToQuery.trim().length > 0)

const watchedDancersByAwardsIndex = computed(() => {
  const map = new Map<number, string[]>()
  for (const block of watchStore.awardsBlocks) {
    if (block.hasWatchedDancer) map.set(block.awardsGlobalIndex, block.watchedDancersInBlock)
  }
  return map
})

const searchResults = computed<EnrichedSearchResult[]>(() =>
  enrichSearchResults(ui.jumpToQuery, {
    flatEntries: schedule.flatEntries,
    dayLabels: schedule.days.map(d => d.label),
    watchedDancerSet: watchStore.watchedDancerSet,
    watchedAwardsSet: watchStore.watchedAwardsSet,
    watchedStudios: watchStore.watchedStudios,
    watchedDancersByAwardsIndex: watchedDancersByAwardsIndex.value,
    activeIndex: navigation.activeIndex,
    activeIsLikely: navigation.activeIsLikely,
    scheduleOffsetMinutes: navigation.scheduleOffsetMinutes,
  }),
)

function borderClass(r: EnrichedSearchResult): string {
  if (r.isMarked) return 'border-l-indigo-400'
  if (r.isWatched) return 'border-l-gold-400'
  if (r.sameStudio) return 'border-l-cyan-400/40'
  return 'border-l-transparent'
}

function bgClass(r: EnrichedSearchResult): string {
  if (r.isMarked) return 'bg-indigo-500/5'
  if (r.isWatched) return 'bg-gold-400/10'
  return 'bg-surface-raised/40'
}

function selectResult(globalIndex: number) {
  // If the target isn't rendered in the current filtered list, switch to All
  // first so the scroll target's DOM element actually exists. The user
  // explicitly searched for it — they want to see it regardless of filter.
  // skipAutoJump prevents TrackerView's viewMode watcher from immediately
  // scrolling to "now" and overriding the search-jump scroll.
  if (ui.viewMode !== 'all') {
    const visibleIndices =
      ui.viewMode === 'dancers' ? watchStore.watchedEntryIndices : watchStore.studioEntryIndices
    if (!visibleIndices.includes(globalIndex)) {
      ui.setViewMode('all', { skipAutoJump: true })
    }
  }
  navigation.select(globalIndex)
  ui.closeJumpToPanel()
  emit('jump-to', globalIndex)
}
</script>

<template>
  <div role="dialog" aria-modal="true" class="fixed inset-0 z-40 bg-surface flex flex-col" style="padding-top: env(safe-area-inset-top, 0px)">
    <div class="flex items-center gap-2 px-3 py-3 border-b border-gray-800">
      <Search :size="18" class="text-gray-500 shrink-0" />
      <input
        ref="inputRef"
        v-model="ui.jumpToQuery"
        type="text"
        placeholder="Search dances/awards..."
        class="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
      />
      <button
        class="p-1.5 rounded-lg hover:bg-surface-raised transition-colors shrink-0"
        @click="ui.closeJumpToPanel()"
      >
        <X :size="18" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto py-1 px-2">
      <!-- Search results when typing -->
      <template v-if="hasQuery">
        <div v-if="searchResults.length === 0" class="text-center text-gray-500 text-sm py-12">
          No dances match "{{ ui.jumpToQuery }}"
        </div>
        <button
          v-for="r in searchResults"
          :key="r.globalIndex"
          class="relative block w-full my-0.5 px-3 py-2 rounded-lg border-l-[3px] text-left active:bg-surface-overlay transition-colors"
          :class="[borderClass(r), bgClass(r)]"
          @click="selectResult(r.globalIndex)"
        >
          <span
            v-if="r.isMarked"
            class="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider uppercase text-indigo-400/80"
          >{{ r.isLikely ? '~ current' : '▶ current' }}</span>

          <div class="flex items-baseline gap-2">
            <div class="shrink-0 w-20">
              <div class="fs-time text-gray-300 leading-tight">{{ r.displayTime }}</div>
              <div class="text-[10px] text-gray-500 leading-tight uppercase tracking-wide">
                <span>{{ r.dayShort }}</span><span v-if="r.hasOffset"> · {{ r.time }}</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div
                class="fs-title font-medium truncate"
                :class="r.isWatched ? 'text-gold-400' : 'text-gray-200'"
              >{{ titleCaseDanceTitle(r.title) }}</div>
              <div v-if="r.subtitle" class="text-[11px] text-gray-500 truncate">{{ r.subtitle }}</div>
            </div>
            <span v-if="r.num" class="fs-time text-gray-500 shrink-0">#{{ r.num }}</span>
          </div>

          <div v-if="r.watchedDancers.length" class="flex flex-wrap gap-1 mt-1">
            <DancerBadge v-for="name in r.watchedDancers" :key="name" :name="name" />
          </div>
        </button>
      </template>

      <!-- Empty state -->
      <div v-else class="text-center text-gray-500 text-sm py-12">
        Tap a result to jump to it in the schedule
      </div>
    </div>
  </div>
</template>
