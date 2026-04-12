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

// Left border: marked = bright indigo, watched = gold, studio = cyan
const borderClass = computed(() => {
  if (props.isMarked) return 'border-l-indigo-400'
  if (props.isWatched) return 'border-l-gold-400'
  if (props.sameStudio) return 'border-l-cyan-400/40'
  return 'border-l-transparent'
})

// Background: marked = blue tint, selected = bright/light, watched = gold tint
const bgClass = computed(() => {
  if (props.isMarked && props.isSelected) return 'bg-indigo-500/25'
  if (props.isMarked) return 'bg-indigo-500/20'
  if (props.isSelected) return 'bg-white/[0.08]'
  if (props.isWatched) return 'bg-gold-400/10'
  return 'bg-surface-raised'
})

// Selected: dashed outline (pattern cue — visible regardless of color vision)
const outlineStyle = computed(() => {
  if (props.isSelected) return 'outline: 2px dashed rgba(255,255,255,0.35); outline-offset: -2px'
  return ''
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer transition-colors border-l-4"
    :class="[borderClass, bgClass]"
    :style="outlineStyle"
    @click="emit('select')"
  >
    <div class="flex items-baseline gap-2">
      <!-- ▶ indicator for marked/current dance — shape cue -->
      <span v-if="isMarked" class="text-indigo-400 text-[10px] shrink-0 -ml-1 mr--1">▶</span>
      <span class="fs-time text-gray-400 shrink-0 w-16">{{ entry.time }}</span>
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
      <div class="flex justify-end mt-1">
        <button
          v-if="!isMarked"
          class="text-[11px] text-indigo-400/70 active:text-indigo-300 transition-colors"
          @click.stop="emit('mark-current')"
        >
          Set as current ›
        </button>
        <span v-else class="text-[11px] text-indigo-400/50">
          ✓ Current
        </span>
      </div>
    </template>
  </div>
</template>
