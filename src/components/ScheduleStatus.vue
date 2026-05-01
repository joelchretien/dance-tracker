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

const colorClass = computed(() => {
  switch (props.status.kind) {
    case 'on-schedule': return 'text-green-400'
    case 'behind': return props.status.minutes > 15 ? 'text-orange-400' : 'text-gray-400'
    case 'ahead': return props.status.minutes > 15 ? 'text-sky-400' : 'text-gray-400'
    case 'way-behind': return 'text-gray-500'
    case 'wrong-day': return 'text-gray-500'
    default: return 'text-gray-500'
  }
})
</script>

<template>
  <div v-if="text" class="text-center py-0.5 fs-title" :class="colorClass">
    {{ text }}
  </div>
</template>
