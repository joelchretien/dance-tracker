<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="py-3 px-4 text-center">
    <div class="text-xs font-bold tracking-widest text-gray-400 uppercase">{{ label }}</div>
  </div>
</template>
