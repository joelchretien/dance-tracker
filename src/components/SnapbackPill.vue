<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Clock } from 'lucide-vue-next'

const emit = defineEmits<{ click: [] }>()

const bottomPx = ref(24)

onMounted(() => {
  const bar = document.getElementById('bottom-bar')
  if (bar) {
    bottomPx.value = bar.offsetHeight + 12
  }
})
</script>

<template>
  <button
    class="fixed right-3 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-500/90 text-white text-xs font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:opacity-70"
    :style="{ bottom: bottomPx + 'px' }"
    @click="emit('click')"
  >
    <Clock :size="14" />
    Jump to now
  </button>
</template>
