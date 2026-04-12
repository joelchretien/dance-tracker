<script setup lang="ts">
defineProps<{ percent: number }>()
</script>

<template>
  <div class="h-0.5 bg-gray-800">
    <div
      class="h-full bg-indigo-500 transition-all duration-300"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
