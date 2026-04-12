<script setup lang="ts">
import { computed } from 'vue'
import type { BreakEntry as BreakEntryType, AwardsEntry } from '@/types/schedule'

const props = defineProps<{
  entry: BreakEntryType | AwardsEntry
  globalIndex: number
  isMarked: boolean
  isSelected: boolean
  isWatchedAwards: boolean
}>()

const emit = defineEmits<{
  select: []
  'mark-current': []
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
  if (props.isSelected && !props.isMarked) return 'outline: 1.5px dashed rgba(255,255,255,0.25); outline-offset: -1.5px'
  if (props.isSelected && props.isMarked) return 'outline: 1.5px dashed rgba(129,140,248,0.4); outline-offset: -1.5px'
  return ''
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer text-center transition-colors border relative"
    :class="[borderClass, bgClass]"
    :style="outlineStyle"
    @click="emit('select')"
  >
    <span
      v-if="isMarked"
      class="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider text-indigo-400/70 uppercase"
    >▶ current</span>

    <div class="flex items-center justify-center gap-2">
      <span class="fs-time text-gray-400">{{ entry.time }}</span>
      <span
        class="fs-title font-medium"
        :class="isWatchedAwards ? 'text-gold-400' : 'text-gray-400'"
      >
        {{ entry.title }}
      </span>
    </div>
    <div v-if="isWatchedAwards" class="text-xs text-gold-400/70 mt-0.5">
      Watched dancers in this block
    </div>

    <template v-if="isSelected">
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
