<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DanceEntry } from '@/types/schedule'
import { useWatchStore } from '@/stores/watch'

const props = defineProps<{ entry: DanceEntry }>()
const watchStore = useWatchStore()

const expanded = ref(false)
const SHOW_LIMIT = 6

const visibleDancers = computed(() => {
  if (!props.entry.dancers) return []
  if (expanded.value || props.entry.dancers.length <= SHOW_LIMIT) return props.entry.dancers
  return props.entry.dancers.slice(0, SHOW_LIMIT)
})

const hasMore = computed(() => (props.entry.dancers?.length ?? 0) > SHOW_LIMIT && !expanded.value)
const remainingCount = computed(() => (props.entry.dancers?.length ?? 0) - SHOW_LIMIT)
</script>

<template>
  <div class="mt-1.5 space-y-1">
    <div class="flex gap-3 text-xs text-gray-500">
      <span v-if="entry.studio">Studio {{ entry.studio }}</span>
      <span v-if="entry.age">Age {{ entry.age }}</span>
    </div>
    <div v-if="entry.dancers && entry.dancers.length > 0" class="text-xs">
      <span
        v-for="(d, i) in visibleDancers"
        :key="d"
        :class="watchStore.watchedDancerSet.has(d) ? 'text-gold-400' : 'text-gray-400'"
      >{{ d }}<span v-if="i < visibleDancers.length - 1" class="text-gray-400">, </span></span>
      <button
        v-if="hasMore"
        class="text-indigo-400 ml-1"
        @click.stop="expanded = true"
      >
        +{{ remainingCount }} more
      </button>
      <button
        v-if="expanded && (entry.dancers?.length ?? 0) > SHOW_LIMIT"
        class="text-indigo-400 ml-1"
        @click.stop="expanded = false"
      >
        show less
      </button>
    </div>
  </div>
</template>
