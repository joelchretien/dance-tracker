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
  if (props.isMarked) return 'border-indigo-500'
  if (props.isSelected) return 'border-transparent'
  if (props.isWatchedAwards) return 'border-gold-400/50'
  return 'border-gray-800 border-dashed'
})

const bgClass = computed(() => {
  if (props.isMarked) return 'bg-indigo-500/20'
  if (props.isSelected) return 'bg-surface-overlay'
  if (props.isWatchedAwards) return 'bg-gold-400/10'
  return 'bg-surface-raised'
})

const ringClass = computed(() => {
  if (props.isSelected) return 'ring-1 ring-white/20'
  return ''
})
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer text-center transition-colors border"
    :class="[borderClass, bgClass, ringClass]"
    @click="emit('select')"
  >
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
      Your dancers are in this block
    </div>

    <template v-if="isSelected">
      <button
        v-if="!isMarked"
        class="mt-2 w-full py-1.5 rounded-md text-xs font-semibold bg-indigo-500/30 text-indigo-300 active:bg-indigo-500/50 transition-colors"
        @click.stop="emit('mark-current')"
      >
        Mark as current dance
      </button>
      <div v-else class="mt-1.5 text-[11px] text-indigo-400/60">
        ✓ Current dance
      </div>
    </template>
  </div>
</template>
