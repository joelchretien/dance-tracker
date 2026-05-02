<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BreakEntry as BreakEntryType, AwardsEntry } from '@/types/schedule'
import { titleCaseDanceTitle } from '@/lib/title-case'
import { predictedTime } from '@/lib/predicted-time'
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
  return offset !== null && offset !== undefined && Math.abs(offset) > 5
})

const displayTime = computed(() => {
  if (!hasOffset.value) return props.entry.time
  return '~' + predictedTime(props.entry.time, props.offsetMinutes!)
})

// Drag state
const barRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragProgress = ref(0)

const displayProgress = computed(() =>
  isDragging.value ? dragProgress.value : props.progress
)

function progressFromEvent(e: TouchEvent | MouseEvent): number {
  if (!barRef.value) return 0
  const rect = barRef.value.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (x - rect.left) / rect.width))
}

function onDragStart(e: TouchEvent | MouseEvent) {
  if (!seekable.value) return
  e.stopPropagation()
  isDragging.value = true
  dragProgress.value = progressFromEvent(e)
}

function onDragMove(e: TouchEvent | MouseEvent) {
  if (!isDragging.value) return
  e.stopPropagation()
  dragProgress.value = progressFromEvent(e)
}

function onDragEnd(e: TouchEvent | MouseEvent) {
  if (!isDragging.value) return
  e.stopPropagation()
  isDragging.value = false
  const final = 'changedTouches' in e
    ? Math.max(0, Math.min(1, (() => {
        if (!barRef.value) return dragProgress.value
        const rect = barRef.value.getBoundingClientRect()
        return (e.changedTouches[0].clientX - rect.left) / rect.width
      })()))
    : progressFromEvent(e)
  emit('seek', Math.max(0, Math.min(1, final)))
}

function onBarClick(e: MouseEvent) {
  if (!seekable.value) return
  e.stopPropagation()
  const p = progressFromEvent(e)
  emit('seek', p)
}
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 rounded-lg cursor-pointer transition-colors border relative"
    :class="[borderClass, bgClass, isMarked ? 'px-3 pt-5 pb-2' : 'px-3 py-2']"
    :style="outlineStyle"
    @click="emit('select')"
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
      class="relative h-1.5 mt-3 mb-1 ml-[5.5rem] rounded-full bg-white/15"
      :class="seekable ? 'cursor-grab' : ''"
      @click.stop="onBarClick"
      @touchstart.prevent="onDragStart"
      @touchmove.prevent="onDragMove"
      @touchend.prevent="onDragEnd"
      @mousedown.prevent="onDragStart"
      @mousemove="onDragMove"
      @mouseup="onDragEnd"
      @mouseleave="isDragging && onDragEnd($event)"
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
