<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div
    class="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-surface-overlay text-sm text-gray-100 shadow-lg border border-gray-700 whitespace-nowrap"
    style="bottom: calc(env(safe-area-inset-bottom, 0px) + 24px)"
  >
    {{ message }}
  </div>
</template>
