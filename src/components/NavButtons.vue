<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation'

const navigation = useNavigationStore()
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <button
      class="px-5 py-2 rounded-full font-semibold text-sm transition-colors"
      :class="navigation.canGoBack
        ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
        : 'bg-surface-raised text-gray-600 cursor-not-allowed'"
      :disabled="!navigation.canGoBack"
      @click="navigation.retreat()"
    >
      ‹ BACK
    </button>
    <span class="text-[10px] text-gray-500 uppercase tracking-wider">Current</span>
    <button
      class="px-5 py-2 rounded-full font-semibold text-sm transition-colors"
      :class="navigation.canAdvance
        ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
        : 'bg-surface-raised text-gray-600 cursor-not-allowed'"
      :disabled="!navigation.canAdvance"
      @click="navigation.advance()"
    >
      ADVANCE ›
    </button>
  </div>
</template>
