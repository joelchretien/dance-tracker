<script setup lang="ts">
import { Clock } from 'lucide-vue-next'

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="fixed right-3 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-500/90 text-white text-xs font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:opacity-70"
    style="bottom: calc(env(safe-area-inset-bottom, 0px) + 24px)"
    @click="emit('click')"
  >
    <Clock :size="14" />
    Jump to now
  </button>
</template>
