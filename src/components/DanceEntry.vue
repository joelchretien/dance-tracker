<script setup lang="ts">
import type { DanceEntry as DanceEntryType } from '@/types/schedule'
import DancerBadge from './DancerBadge.vue'
import DanceDetails from './DanceDetails.vue'

defineProps<{
  entry: DanceEntryType
  globalIndex: number
  isCurrent: boolean
  isWatched: boolean
  watchedDancers: string[]
  sameStudio: boolean
  showDetails: boolean
}>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer transition-colors border-l-2"
    :class="[
      isCurrent
        ? 'bg-indigo-500/20 border-l-indigo-500'
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

    <DanceDetails v-if="showDetails" :entry="entry" />
  </div>
</template>
