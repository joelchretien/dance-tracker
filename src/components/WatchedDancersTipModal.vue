<script setup lang="ts">
import { Settings, Star } from 'lucide-vue-next'

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
        <Star :size="22" class="text-gold-400 fill-gold-400 shrink-0" />
        <h2 class="text-base font-semibold text-gray-100">You're set</h2>
      </div>

      <p class="text-sm text-gray-300 leading-relaxed">
        Your watched dancers will be highlighted throughout the schedule, and you'll see a countdown to their next dance at the bottom of the screen.
      </p>

      <p class="text-sm text-gray-300 leading-relaxed mt-3">
        You can update them anytime via
        <Settings :size="14" class="inline -mt-0.5 text-gray-400" />
        <span class="font-medium text-gray-200">Settings → Watched Dancers</span>.
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
