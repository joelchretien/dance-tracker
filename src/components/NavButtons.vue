<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation'

const navigation = useNavigationStore()
</script>

<template>
  <div class="flex gap-2">
    <button
      class="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      :class="navigation.canGoPrev
        ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
        : 'bg-surface-raised text-gray-600 cursor-not-allowed'"
      :disabled="!navigation.canGoPrev"
      @click="navigation.goPrev()"
    >
      ‹ PREV
    </button>
    <button
      class="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      :class="navigation.canGoNext
        ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
        : 'bg-surface-raised text-gray-600 cursor-not-allowed'"
      :disabled="!navigation.canGoNext"
      @click="navigation.goNext()"
    >
      NEXT ›
    </button>
  </div>
</template>
