<script setup lang="ts">
import type { BreakEntry as BreakEntryType, AwardsEntry } from '@/types/schedule'

defineProps<{
  entry: BreakEntryType | AwardsEntry
  globalIndex: number
  isCurrent: boolean
  isWatchedAwards: boolean
}>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <div
    :id="`entry-${globalIndex}`"
    class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer text-center transition-colors border"
    :class="[
      isCurrent
        ? 'bg-indigo-500/20 border-indigo-500'
        : isWatchedAwards
          ? 'bg-gold-400/10 border-gold-400/50'
          : 'bg-surface-raised border-gray-800 border-dashed',
    ]"
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
  </div>
</template>
