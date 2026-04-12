<script setup lang="ts">
import { computed } from 'vue'
import type { DanceEntry as DanceEntryType } from '@/types/schedule'
import DancerBadge from './DancerBadge.vue'
import DanceDetails from './DanceDetails.vue'

const props = defineProps<{
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

// Left border color: marked takes priority, then watched, then studio, then none
const borderClass = computed(() => {
  if (props.isMarked) return 'border-l-indigo-500'
  if (props.isWatched) return 'border-l-gold-400'
  if (props.sameStudio) return 'border-l-cyan-400/40'
  return 'border-l-transparent'
})

// Background: marked tint, or watched tint, or default raised
const bgClass = computed(() => {
  if (props.isMarked) return 'bg-indigo-500/20'
  if (props.isSelected) return 'bg-surface-overlay'
  if (props.isWatched) return 'bg-gold-400/10'
  return 'bg-surface-raised'
})

// Ring: selected gets a visible outline (independent of marked/watched)
const ringClass = computed(() => {
  if (props.isSelected) return 'ring-1 ring-white/20'
  return ''
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer transition-colors border-l-[3px]"
    :class="[borderClass, bgClass, ringClass]"
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
