<script setup lang="ts">
defineProps<{ category: string }>()
</script>

<template>
  <div class="px-4 pt-3 pb-1">
    <div class="fs-category font-medium text-indigo-500 tracking-wide uppercase">{{ category }}</div>
  </div>
</template>
