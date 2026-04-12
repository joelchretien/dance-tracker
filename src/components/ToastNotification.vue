<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div style="top: calc(env(safe-area-inset-top, 0px) + 52px)" class="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-surface-overlay text-sm text-gray-100 shadow-lg border border-gray-700 whitespace-nowrap">
    {{ message }}
  </div>
</template>
