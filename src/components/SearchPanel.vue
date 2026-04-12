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

const results = computed<SearchResult[]>(() => {
  const q = ui.searchQuery.trim()
  if (!q) {
    // Show no results when empty — avoids overwhelming list of 350+ entries
    return []
  }

  const scored: SearchResult[] = []
  for (const item of schedule.flatEntries) {
    if (item.entry.type !== 'dance') continue
    const entry = item.entry
    const titleScore = fuzzyScore(q, entry.title)

    // Also try matching the entry number
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

function selectResult(globalIndex: number) {
  navigation.select(globalIndex)
  ui.closeSearchPanel()
  emit('jump-to', globalIndex)
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-surface flex flex-col">
    <div class="flex items-center gap-2 px-3 py-3 border-b border-gray-800">
      <Search :size="18" class="text-gray-500 shrink-0" />
      <input
        ref="inputRef"
        v-model="ui.searchQuery"
        type="text"
        placeholder="Search dances..."
        class="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
      />
      <button
        class="p-1.5 rounded-lg hover:bg-surface-raised transition-colors shrink-0"
        @click="ui.closeSearchPanel()"
      >
        <X :size="18" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Empty state: prompt to type -->
      <div v-if="!ui.searchQuery.trim()" class="text-center text-gray-500 text-sm py-12">
        Type a dance title or entry number
      </div>

      <!-- No results -->
      <div v-else-if="results.length === 0" class="text-center text-gray-500 text-sm py-12">
        No dances match "{{ ui.searchQuery }}"
      </div>

      <!-- Results list -->
      <button
        v-for="r in results"
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
    </div>
  </div>
</template>
