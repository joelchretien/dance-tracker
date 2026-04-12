<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation'

const navigation = useNavigationStore()
</script>

<template>
  <div>
    <div class="text-[10px] text-gray-500 uppercase tracking-wider text-center mb-1">Current Dance</div>
    <div class="flex gap-2">
      <button
        class="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        :class="navigation.canGoBack
          ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
          : 'bg-surface-raised text-gray-600 cursor-not-allowed'"
        :disabled="!navigation.canGoBack"
        @click="navigation.retreat()"
      >
        ‹ BACK
      </button>
      <button
        class="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        :class="navigation.canAdvance
          ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
          : 'bg-surface-raised text-gray-600 cursor-not-allowed'"
        :disabled="!navigation.canAdvance"
        @click="navigation.advance()"
      >
        ADVANCE ›
      </button>
    </div>
  </div>
</template>
