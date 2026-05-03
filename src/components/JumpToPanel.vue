<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue'
import { X, Search } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { fuzzyScore, type SearchResult } from '@/lib/fuzzy-search'
import { extractSubtitle } from '@/lib/category'
import { titleCaseDanceTitle } from '@/lib/title-case'
import { predictedTime } from '@/lib/predicted-time'
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

interface EnrichedResult extends SearchResult {
  dayShort: string
  isMarked: boolean
  isLikely: boolean
  isWatched: boolean
  watchedDancers: string[]
  sameStudio: boolean
  hasOffset: boolean
  displayTime: string
}

const searchResults = computed<EnrichedResult[]>(() => {
  const q = ui.jumpToQuery.trim()
  if (!q) return []

  const offset = navigation.scheduleOffsetMinutes
  const hasOffset = offset !== null && Math.abs(offset) > 5

  const scored: EnrichedResult[] = []
  for (const item of schedule.flatEntries) {
    const entry = item.entry
    if (entry.type !== 'dance' && entry.type !== 'awards') continue
    const titleScore = fuzzyScore(q, entry.title)
    const numStr = entry.type === 'dance' && entry.num ? String(entry.num) : ''
    const numScore = numStr && q === numStr ? 50 : 0
    const best = Math.max(titleScore, numScore)
    if (best > 0) {
      const isWatched = watchStore.isWatchedEntry(item.globalIndex)
      const watchedDancers =
        entry.type === 'awards'
          ? watchStore.getWatchedDancersForAwards(item.globalIndex)
          : watchStore.getWatchedDancersForEntry(item.globalIndex)
      const studio = entry.type === 'dance' ? entry.studio : undefined
      const sameStudio = !!(studio && watchStore.watchedStudios.has(studio))
      const dayLabel = schedule.days[item.dayIndex]?.label ?? ''
      const dayShort = dayLabel.substring(0, 3)

      scored.push({
        globalIndex: item.globalIndex,
        title: entry.title,
        time: entry.time,
        num: entry.type === 'dance' ? entry.num : undefined,
        subtitle: entry.type === 'dance' ? extractSubtitle(entry.category) : 'Awards',
        score: best,
        dayShort,
        isMarked: item.globalIndex === navigation.activeIndex,
        isLikely: navigation.activeIsLikely,
        isWatched,
        watchedDancers,
        sameStudio,
        hasOffset,
        displayTime: hasOffset ? '~' + predictedTime(entry.time, offset!) : entry.time,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 20)
})

function borderClass(r: EnrichedResult): string {
  if (r.isMarked) return 'border-l-indigo-400'
  if (r.isWatched) return 'border-l-gold-400'
  if (r.sameStudio) return 'border-l-cyan-400/40'
  return 'border-l-gray-800'
}

function bgClass(r: EnrichedResult): string {
  if (r.isMarked) return 'bg-indigo-500/5'
  if (r.isWatched) return 'bg-gold-400/10'
  return 'bg-surface-raised/40'
}

function selectResult(globalIndex: number) {
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
          class="relative block w-full my-0.5 px-3 py-2 rounded-lg border text-left active:bg-surface-overlay transition-colors"
          :class="[borderClass(r), bgClass(r), 'border-gray-800']"
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
              <div v-if="r.watchedDancers.length" class="flex flex-wrap gap-1 mt-1">
                <DancerBadge v-for="name in r.watchedDancers" :key="name" :name="name" />
              </div>
            </div>
            <span v-if="r.num" class="fs-time text-gray-500 shrink-0">#{{ r.num }}</span>
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
