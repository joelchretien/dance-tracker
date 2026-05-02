<script setup lang="ts">
import { computed } from 'vue'
import { formatCategoryHeader } from '@/lib/category'

const props = defineProps<{ category: string }>()
const formatted = computed(() => formatCategoryHeader(props.category))
</script>

<template>
  <div class="px-4 pt-4 pb-1 flex items-center gap-2">
    <div class="text-[10px] font-semibold text-indigo-500/70 tracking-[0.08em] uppercase shrink-0">{{ formatted }}</div>
    <div class="flex-1 h-px bg-indigo-500/10"></div>
  </div>
</template>
