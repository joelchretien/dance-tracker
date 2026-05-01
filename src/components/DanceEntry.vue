<script setup lang="ts">
import { computed } from 'vue'
import type { DanceEntry as DanceEntryType } from '@/types/schedule'
import DancerBadge from './DancerBadge.vue'
import DanceDetails from './DanceDetails.vue'

const props = defineProps<{
  entry: DanceEntryType
  globalIndex: number
  isMarked: boolean
  isLikely: boolean
  isSelected: boolean
  isWatched: boolean
  watchedDancers: string[]
  sameStudio: boolean
}>()

const emit = defineEmits<{
  select: []
  'mark-current': []
}>()

// Consistent 3px left border for all entries — color changes, width doesn't
const borderClass = computed(() => {
  if (props.isMarked) return 'border-l-indigo-400'
  if (props.isWatched) return 'border-l-gold-400'
  if (props.sameStudio) return 'border-l-cyan-400/40'
  return 'border-l-transparent'
})

const bgClass = computed(() => {
  if (props.isMarked && props.isSelected) return 'bg-indigo-500/25'
  if (props.isMarked) return 'bg-indigo-500/15'
  if (props.isSelected) return 'bg-white/[0.07]'
  if (props.isWatched) return 'bg-gold-400/10'
  return 'bg-surface-raised'
})

// Selected: subtle dashed outline (pattern cue for accessibility)
const outlineStyle = computed(() => {
  if (props.isSelected && !props.isMarked) return 'outline: 1.5px dashed rgba(255,255,255,0.25); outline-offset: -1.5px'
  if (props.isSelected && props.isMarked) return 'outline: 1.5px dashed rgba(129,140,248,0.4); outline-offset: -1.5px'
  return ''
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 rounded-lg cursor-pointer transition-colors border-l-[3px] relative"
    :class="[borderClass, bgClass, isMarked ? 'px-3 pt-5 pb-2' : 'px-3 py-2']"
    :style="outlineStyle"
    @click="emit('select')"
  >
    <!-- "CURRENT" badge — shape/text cue, doesn't disrupt row layout -->
    <span
      v-if="isMarked"
      class="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider text-indigo-400/70 uppercase"
    >▶ {{ isLikely ? 'likely current' : 'current' }}</span>

    <div class="flex items-baseline gap-2">
      <span class="fs-time text-gray-300 shrink-0 w-20">{{ entry.time }}</span>
      <span class="fs-title font-medium flex-1" :class="[isWatched ? 'text-gold-400' : '', isSelected ? '' : 'truncate']">
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
      <div v-if="!isMarked" class="flex justify-end mt-1">
        <button
          class="text-[11px] text-indigo-400/70 active:text-indigo-300 transition-colors"
          @click.stop="emit('mark-current')"
        >
          Set as current ›
        </button>
      </div>
    </template>
  </div>
</template>
