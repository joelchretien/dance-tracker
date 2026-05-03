<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Share, Plus, X } from 'lucide-vue-next'
import { useFocusTrap } from '@/composables/useFocusTrap'

const emit = defineEmits<{ close: [] }>()

const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLElement | null>(null)
useFocusTrap(dialogRef)

onMounted(() => {
  // Land focus on the close button so Escape works without a click first.
  nextTick(() => closeBtnRef.value?.focus())
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-2"
       @click="emit('close')">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-label="Install Dance Tracker on your home screen"
      class="bg-surface-raised border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm focus:outline-none"
      tabindex="-1"
      @click.stop
      @keydown.esc="emit('close')"
    >
      <div class="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 class="text-lg font-bold">Install Dance Tracker</h2>
        <button
          ref="closeBtnRef"
          class="p-1.5 rounded-lg hover:bg-surface-overlay active:bg-surface text-gray-400"
          aria-label="Close"
          @click="emit('close')"
        >
          <X :size="20" />
        </button>
      </div>

      <p class="px-4 text-sm text-gray-300">
        Add Dance Tracker to your Home Screen so it opens like an app — full screen, no browser bar, just one tap to launch during a competition.
      </p>

      <ol class="px-4 py-4 space-y-3">
        <li class="flex items-start gap-3">
          <div class="shrink-0 w-7 h-7 rounded-full bg-indigo-500/25 text-indigo-200 text-sm font-bold flex items-center justify-center">1</div>
          <div class="text-sm text-gray-200 pt-0.5 flex items-center gap-1.5 flex-wrap">
            Tap the
            <Share :size="16" class="inline text-indigo-300" aria-label="Share" />
            <span class="font-semibold">Share</span>
            button at the bottom of Safari
          </div>
        </li>
        <li class="flex items-start gap-3">
          <div class="shrink-0 w-7 h-7 rounded-full bg-indigo-500/25 text-indigo-200 text-sm font-bold flex items-center justify-center">2</div>
          <div class="text-sm text-gray-200 pt-0.5 flex items-center gap-1.5 flex-wrap">
            Scroll down and tap
            <Plus :size="16" class="inline text-indigo-300" aria-label="Add" />
            <span class="font-semibold">Add to Home Screen</span>
          </div>
        </li>
        <li class="flex items-start gap-3">
          <div class="shrink-0 w-7 h-7 rounded-full bg-indigo-500/25 text-indigo-200 text-sm font-bold flex items-center justify-center">3</div>
          <div class="text-sm text-gray-200 pt-0.5">
            Tap <span class="font-semibold">Add</span> in the top right
          </div>
        </li>
      </ol>

      <div class="px-4 pb-4 pt-1 border-t border-gray-700/60">
        <button
          class="w-full py-2.5 rounded-lg bg-indigo-500 active:bg-indigo-600 text-white text-sm font-semibold transition-colors"
          @click="emit('close')"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
</template>
