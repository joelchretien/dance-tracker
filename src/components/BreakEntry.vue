<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BreakEntry as BreakEntryType, AwardsEntry } from '@/types/schedule'
import { titleCaseDanceTitle } from '@/lib/title-case'
import { predictedTime } from '@/lib/predicted-time'
import { OFFSET_DISPLAY_THRESHOLD_MIN } from '@/lib/offset-threshold'
import { useSeekableBar } from '@/composables/useSeekableBar'
import DancerBadge from './DancerBadge.vue'

const props = defineProps<{
  entry: BreakEntryType | AwardsEntry
  globalIndex: number
  isMarked: boolean
  isLikely: boolean
  isSelected: boolean
  isWatchedAwards: boolean
  watchedDancers?: string[]
  progress: number
  offsetMinutes?: number | null
}>()

const emit = defineEmits<{
  select: []
  'mark-current': []
  seek: [progress: number]
}>()

const borderClass = computed(() => {
  if (props.isMarked) return 'border-indigo-400'
  if (props.isWatchedAwards) return 'border-gold-400/50'
  return 'border-gray-800 border-dashed'
})

const bgClass = computed(() => {
  if (props.isMarked && props.isSelected) return 'bg-indigo-500/25'
  if (props.isMarked) return 'bg-indigo-500/15'
  if (props.isSelected) return 'bg-white/[0.07]'
  if (props.isWatchedAwards) return 'bg-gold-400/10'
  return 'bg-surface-raised'
})

const outlineStyle = computed(() => {
  if (props.isSelected && props.isMarked) return 'outline: 1.5px dashed rgba(129,140,248,0.4); outline-offset: -1.5px'
  if (props.isSelected) return 'outline: 1.5px dashed rgba(255,255,255,0.25); outline-offset: -1.5px'
  return ''
})

const seekable = computed(() => props.isMarked && props.isSelected)
const barColor = 'bg-indigo-400/80'
const thumbColor = 'bg-indigo-400'
const badgeColor = 'text-indigo-400/80'

const hasOffset = computed(() => {
  const offset = props.offsetMinutes
  return offset !== null && offset !== undefined && Math.abs(offset) > OFFSET_DISPLAY_THRESHOLD_MIN
})

const displayTime = computed(() => {
  if (!hasOffset.value) return props.entry.time
  return '~' + predictedTime(props.entry.time, props.offsetMinutes!)
})

// Drag/click/keyboard seek shared with DanceEntry.
const barRef = ref<HTMLElement | null>(null)
const progressRef = computed(() => props.progress)
const {
  isDragging,
  displayProgress,
  onDragStart,
  onDragMove,
  onDragEnd,
  onBarClick,
  onKeyDown,
  ariaProps,
} = useSeekableBar({
  barRef,
  seekable,
  progress: progressRef,
  onSeek: (p) => emit('seek', p),
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 rounded-lg cursor-pointer transition-colors border relative focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
    :class="[borderClass, bgClass, isMarked ? 'px-3 pt-5 pb-2' : 'px-3 py-2']"
    :style="outlineStyle"
    role="button"
    tabindex="0"
    :aria-label="`${entry.time} ${entry.title}`"
    :aria-pressed="isSelected"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <span
      v-if="isMarked"
      class="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider uppercase"
      :class="badgeColor"
    >{{ isLikely ? '~ current' : '▶ current' }}</span>

    <div class="flex items-baseline gap-2">
      <div class="shrink-0 w-20">
        <div class="fs-time text-gray-300">{{ displayTime }}</div>
        <div v-if="hasOffset" class="text-[10px] text-gray-500 leading-tight">{{ entry.time }}</div>
      </div>
      <span
        class="fs-title font-medium"
        :class="isWatchedAwards ? 'text-gold-400' : 'text-gray-400'"
      >
        {{ titleCaseDanceTitle(entry.title) }}
      </span>
    </div>
    <div v-if="isWatchedAwards && watchedDancers && watchedDancers.length" class="flex flex-wrap gap-1 mt-1">
      <DancerBadge v-for="name in watchedDancers" :key="name" :name="name" />
    </div>

    <template v-if="isSelected">
      <div v-if="!isMarked" class="flex justify-end mt-2">
        <button
          class="text-xs font-semibold text-white px-4 py-2 rounded-md bg-indigo-500 active:bg-indigo-600 shadow-sm transition-colors"
          @click.stop="emit('mark-current')"
        >
          Set as current ›
        </button>
      </div>
    </template>

    <!-- Progress bar: aligned with title column. Seekable when selected. -->
    <div
      v-if="isMarked"
      ref="barRef"
      v-bind="ariaProps"
      class="relative h-1.5 mt-3 mb-1 ml-[5.5rem] rounded-full bg-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
      :class="seekable ? 'cursor-grab' : ''"
      @click.stop="onBarClick"
      @touchstart.prevent="onDragStart"
      @touchmove.prevent="onDragMove"
      @touchend.prevent="onDragEnd"
      @mousedown.prevent="onDragStart"
      @keydown="onKeyDown"
    >
      <div
        class="absolute inset-y-0 left-0 rounded-full"
        :class="[barColor, isDragging ? '' : 'transition-[width] duration-1000 ease-linear']"
        :style="{ width: (displayProgress * 100) + '%' }"
      />

      <div
        v-if="seekable"
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-md pointer-events-none"
        :class="[thumbColor, isDragging ? 'scale-125' : '']"
        :style="{ left: (displayProgress * 100) + '%' }"
      />
    </div>
  </div>
</template>
