<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{ message: string }>()

const bottomPx = ref(24)

onMounted(() => {
  const bar = document.getElementById('bottom-bar')
  if (bar) {
    bottomPx.value = bar.offsetHeight + 12
  }
})
</script>

<template>
  <div
    class="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-surface-overlay text-sm text-gray-100 shadow-lg border border-gray-700 whitespace-nowrap"
    :style="{ bottom: bottomPx + 'px' }"
  >
    {{ message }}
  </div>
</template>
