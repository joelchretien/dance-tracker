<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleStatus } from '@/types/schedule'

const props = defineProps<{ status: ScheduleStatus }>()

const text = computed(() => {
  switch (props.status.kind) {
    case 'on-schedule': return '✓ On schedule'
    case 'behind':
      return props.status.minutes > 15
        ? `~${props.status.minutes} min behind schedule`
        : `~${props.status.minutes} min behind`
    case 'ahead':
      return props.status.minutes > 15
        ? `~${props.status.minutes} min ahead of schedule`
        : `~${props.status.minutes} min ahead`
    case 'way-behind': return `Current is ~${props.status.minutes} min ago`
    case 'wrong-day': return props.status.dayLabel
    case 'not-started': return ''
  }
})

// Visual treatment escalates with how off-schedule we are.
// 'pill' renders an amber/red rounded background; 'plain' is muted text.
const treatment = computed<'plain' | 'pill-amber' | 'pill-red'>(() => {
  switch (props.status.kind) {
    case 'behind':
    case 'ahead':
      return props.status.minutes > 15 ? 'pill-red' : 'pill-amber'
    case 'way-behind':
      return 'pill-red'
    default:
      return 'plain'
  }
})

const containerClass = computed(() => {
  switch (treatment.value) {
    case 'pill-amber': return 'bg-amber-500/15 text-amber-300 border border-amber-400/30 rounded-full px-3 py-0.5'
    case 'pill-red':   return 'bg-red-500/15 text-red-300 border border-red-400/30 rounded-full px-3 py-0.5'
    default:           return 'text-gray-400'
  }
})

const textColorClass = computed(() => {
  if (props.status.kind === 'on-schedule') return 'text-green-400'
  return ''
})
</script>

<template>
  <div v-if="text" class="flex justify-center py-1">
    <span class="fs-title font-medium" :class="[containerClass, textColorClass]">{{ text }}</span>
  </div>
</template>
