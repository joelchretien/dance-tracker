<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue'
import { X, Search } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'
import { fuzzyScore, type SearchResult } from '@/lib/fuzzy-search'
import { extractSubtitle } from '@/lib/category'

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

// Fuzzy search results (same as old SearchPanel)
const searchResults = computed<SearchResult[]>(() => {
  const q = ui.jumpToQuery.trim()
  if (!q) return []

  const scored: SearchResult[] = []
  for (const item of schedule.flatEntries) {
    if (item.entry.type !== 'dance') continue
    const entry = item.entry
    const titleScore = fuzzyScore(q, entry.title)
    const numStr = entry.num ? String(entry.num) : ''
    const numScore = numStr && q === numStr ? 50 : 0
    const best = Math.max(titleScore, numScore)
    if (best > 0) {
      scored.push({
        globalIndex: item.globalIndex,
        title: entry.title,
        time: entry.time,
        num: entry.num,
        subtitle: extractSubtitle(entry.category),
        score: best,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 20)
})

// Awards list
const awardsList = computed(() =>
  schedule.awardsIndices.map(gi => {
    const item = schedule.flatEntries[gi]
    return {
      globalIndex: gi,
      title: item.entry.title,
      time: item.entry.time,
      isWatched: watchStore.watchedAwardsSet.has(gi),
    }
  })
)

function selectResult(globalIndex: number) {
  navigation.select(globalIndex)
  ui.closeJumpToPanel()
  emit('jump-to', globalIndex)
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-surface flex flex-col" style="padding-top: env(safe-area-inset-top, 0px)">
    <div class="flex items-center gap-2 px-3 py-3 border-b border-gray-800">
      <Search :size="18" class="text-gray-500 shrink-0" />
      <input
        ref="inputRef"
        v-model="ui.jumpToQuery"
        type="text"
        placeholder="Search dances..."
        class="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
      />
      <button
        class="p-1.5 rounded-lg hover:bg-surface-raised transition-colors shrink-0"
        @click="ui.closeJumpToPanel()"
      >
        <X :size="18" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Search results when typing -->
      <template v-if="hasQuery">
        <div v-if="searchResults.length === 0" class="text-center text-gray-500 text-sm py-12">
          No dances match "{{ ui.jumpToQuery }}"
        </div>
        <button
          v-for="r in searchResults"
          :key="r.globalIndex"
          class="flex items-baseline gap-2 w-full px-4 py-2.5 text-left hover:bg-surface-raised active:bg-surface-overlay transition-colors border-b border-gray-800/50"
          @click="selectResult(r.globalIndex)"
        >
          <span class="text-xs text-gray-500 shrink-0 w-14">{{ r.time }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate" :class="watchStore.isWatchedEntry(r.globalIndex) ? 'text-gold-400' : 'text-gray-200'">
              {{ r.title }}
            </div>
            <div v-if="r.subtitle" class="text-[11px] text-gray-500 truncate">{{ r.subtitle }}</div>
          </div>
          <span v-if="r.num" class="text-xs text-gray-600 shrink-0">#{{ r.num }}</span>
        </button>
      </template>

      <!-- Awards list when not searching -->
      <template v-else>
        <div class="px-4 pt-3 pb-2">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Awards</div>
        </div>
        <button
          v-for="a in awardsList"
          :key="a.globalIndex"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-surface-raised active:bg-surface-overlay transition-colors border-b border-gray-800/50"
          @click="selectResult(a.globalIndex)"
        >
          <span class="text-xs text-gray-500 shrink-0 w-14">{{ a.time }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate" :class="a.isWatched ? 'text-gold-400' : 'text-gray-300'">
              {{ a.title }}
            </div>
            <div v-if="a.isWatched" class="text-[10px] text-gold-400/60">Your dancers in this block</div>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>
