<script setup lang="ts">
import { computed, ref } from 'vue'
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
  progress: number
}>()

const emit = defineEmits<{
  select: []
  'mark-current': []
  seek: [progress: number]
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

const seekable = computed(() => props.isMarked && props.isSelected)
const barColor = computed(() => props.isLikely ? 'bg-gold-400/50' : 'bg-indigo-400/60')
const thumbColor = computed(() => props.isLikely ? 'bg-gold-400' : 'bg-indigo-400')

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
  // For touchend, use the last known dragProgress (no touches in the event)
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
    class="mx-2 my-0.5 rounded-lg cursor-pointer transition-colors border-l-[3px] relative"
    :class="[borderClass, bgClass, isMarked ? 'px-3 pt-5 pb-2' : 'px-3 py-2']"
    :style="outlineStyle"
    @click="emit('select')"
  >
    <!-- "CURRENT" badge — shape/text cue, doesn't disrupt row layout -->
    <span
      v-if="isMarked"
      class="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider text-indigo-400/70 uppercase"
    >{{ isLikely ? '~ current' : '▶ current' }}</span>

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
      <div v-if="!isMarked || isLikely" class="flex justify-end mt-1">
        <button
          class="text-[11px] text-indigo-400/70 active:text-indigo-300 transition-colors"
          @click.stop="emit('mark-current')"
        >
          Set as current ›
        </button>
      </div>
    </template>

    <!-- Progress bar: dedicated row inside the entry. Seekable when selected. -->
    <div
      v-if="isMarked"
      ref="barRef"
      class="relative h-1.5 mt-3 mb-1 rounded-full bg-white/[0.06]"
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
      <!-- Filled portion -->
      <div
        class="absolute inset-y-0 left-0 rounded-full"
        :class="[barColor, isDragging ? '' : 'transition-[width] duration-1000 ease-linear']"
        :style="{ width: (displayProgress * 100) + '%' }"
      />

      <!-- Thumb (seekable only) -->
      <div
        v-if="seekable"
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-md pointer-events-none"
        :class="[thumbColor, isDragging ? 'scale-125' : '']"
        :style="{ left: (displayProgress * 100) + '%' }"
      />
    </div>
  </div>
</template>
