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
  if (props.isMarked) return 'bg-indigo-500/20'
  if (props.isSelected) return 'bg-white/[0.08]'
  if (props.isWatchedAwards) return 'bg-gold-400/10'
  return 'bg-surface-raised'
})

const outlineStyle = computed(() => {
  if (props.isSelected) return 'outline: 2px dashed rgba(255,255,255,0.35); outline-offset: -2px'
  return ''
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer text-center transition-colors border"
    :class="[borderClass, bgClass]"
    :style="outlineStyle"
    @click="emit('select')"
  >
    <div class="flex items-center justify-center gap-2">
      <span v-if="isMarked" class="text-indigo-400 text-[10px]">▶</span>
      <span class="fs-time text-gray-400">{{ entry.time }}</span>
      <span
        class="fs-title font-medium"
        :class="isWatchedAwards ? 'text-gold-400' : 'text-gray-400'"
      >
        {{ entry.title }}
      </span>
    </div>
    <div v-if="isWatchedAwards" class="text-xs text-gold-400/70 mt-0.5">
      Your dancers are in this block
    </div>

    <template v-if="isSelected">
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
