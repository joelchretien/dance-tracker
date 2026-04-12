<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{ message: string }>()

const bottomPx = ref(160)

onMounted(() => {
  const bot = document.getElementById('bottom-bar')
  if (bot) {
    bottomPx.value = bot.offsetHeight + 12
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
