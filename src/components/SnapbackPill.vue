<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{
  direction: 'up' | 'down'
  title: string
  time: string
}>()

const emit = defineEmits<{ click: [] }>()

const bottomPx = ref(140)

onMounted(() => {
  const bot = document.getElementById('bottom-bar')
  if (bot) {
    bottomPx.value = bot.offsetHeight + 12
  }
})
</script>

<template>
  <button
    class="fixed right-3 z-30 px-3.5 py-1.5 rounded-2xl bg-indigo-500/90 text-white text-xs font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.5)] max-w-[60%] active:opacity-70 transition-[bottom] duration-150 overflow-hidden text-ellipsis whitespace-nowrap"
    :style="{ bottom: bottomPx + 'px' }"
    @click="emit('click')"
  >{{ direction === 'up' ? '↑' : '↓' }} {{ title }}<span v-if="time"> · {{ time }}</span></button>
</template>
