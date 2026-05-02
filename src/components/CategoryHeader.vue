<script setup lang="ts">
import { computed } from 'vue'
import { formatCategoryHeader } from '@/lib/category'

const props = defineProps<{ category: string }>()
const formatted = computed(() => formatCategoryHeader(props.category))
</script>

<template>
  <div class="px-4 pt-3 pb-1">
    <div class="fs-category font-medium text-indigo-500 tracking-wide uppercase truncate">{{ formatted }}</div>
  </div>
</template>
