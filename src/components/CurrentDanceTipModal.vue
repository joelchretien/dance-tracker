<script setup lang="ts">
import { Play } from 'lucide-vue-next'

defineEmits<{ close: [] }>()
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" @click="$emit('close')">
    <!-- Modal card -->
    <div
      class="w-full max-w-sm bg-surface-raised border border-gray-700 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-5"
      @click.stop
    >
      <div class="flex items-center gap-2 mb-3">
        <Play :size="22" class="text-indigo-300 fill-indigo-300 shrink-0" />
        <h2 class="text-base font-semibold text-gray-100">Tracking now</h2>
      </div>

      <p class="text-sm text-gray-300 leading-relaxed">
        The app will auto-advance to the next dance based on the schedule.
      </p>

      <p class="text-sm text-gray-300 leading-relaxed mt-3">
        If you fall out of sync, tap any other dance to update what's current — or drag the progress bar on the active dance to fine-tune the timing.
      </p>

      <button
        class="w-full mt-5 py-2.5 rounded-lg bg-indigo-500 active:bg-indigo-600 text-white font-semibold text-sm transition-colors"
        @click="$emit('close')"
      >
        Got it
      </button>
    </div>
  </div>
</template>
