<script setup lang="ts">
import type { DanceEntry as DanceEntryType } from '@/types/schedule'
import DancerBadge from './DancerBadge.vue'
import DanceDetails from './DanceDetails.vue'

defineProps<{
  entry: DanceEntryType
  globalIndex: number
  isMarked: boolean
  isSelected: boolean
  isWatched: boolean
  watchedDancers: string[]
  sameStudio: boolean
}>()

const emit = defineEmits<{
  select: []
  'mark-current': []
}>()
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer transition-colors border-l-2"
    :class="[
      isMarked
        ? 'bg-indigo-500/20 border-l-indigo-500'
        : isSelected
          ? 'bg-surface-highlight border-l-indigo-500/50'
          : isWatched
            ? 'bg-gold-400/10 border-l-gold-400'
            : sameStudio
              ? 'bg-surface-raised border-l-cyan-400/40'
              : 'bg-surface-raised border-l-transparent',
    ]"
    @click="emit('select')"
  >
    <div class="flex items-baseline gap-2">
      <span class="fs-time text-gray-400 shrink-0 w-16">{{ entry.time }}</span>
      <span class="fs-title font-medium flex-1 truncate" :class="isWatched ? 'text-gold-400' : ''">
        {{ entry.title }}
      </span>
      <span v-if="entry.num" class="fs-time text-gray-500 shrink-0">#{{ entry.num }}</span>
    </div>

    <div v-if="watchedDancers.length > 0" class="flex flex-wrap gap-1 mt-1">
      <DancerBadge v-for="name in watchedDancers" :key="name" :name="name" />
    </div>

    <!-- Details shown when this specific entry is selected -->
    <template v-if="isSelected">
      <DanceDetails :entry="entry" />
      <button
        v-if="!isMarked"
        class="mt-2 w-full py-1.5 rounded-md text-xs font-semibold bg-indigo-500/30 text-indigo-300 active:bg-indigo-500/50 transition-colors"
        @click.stop="emit('mark-current')"
      >
        Mark as current dance
      </button>
      <div v-else class="mt-1.5 text-[11px] text-indigo-400/60 text-center">
        ✓ Current dance
      </div>
    </template>
  </div>
</template>
