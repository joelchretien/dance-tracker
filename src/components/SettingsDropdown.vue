<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'

const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const gitHash = __GIT_HASH__

const FS_LABELS: Record<string, string> = {
  default: 'Default',
  medium: 'Medium',
  large: 'Large',
}

function handleDecrease() {
  navigation.decreaseFontSize()
  ui.showToast(`Text: ${FS_LABELS[navigation.fontSize]}`)
}

function handleIncrease() {
  navigation.increaseFontSize()
  ui.showToast(`Text: ${FS_LABELS[navigation.fontSize]}`)
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-30 bg-black/30" @click="ui.closeSettingsDropdown()"></div>

  <!-- Dropdown -->
  <div class="absolute right-2 z-40 w-56 bg-surface-raised border border-gray-700 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden" style="top: calc(env(safe-area-inset-top, 0px) + 48px)">
    <!-- Font size -->
    <div class="px-3 py-2.5 flex items-center justify-between">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-[13px] font-bold"
        :class="navigation.canDecreaseFontSize
          ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
          : 'bg-surface text-gray-600 cursor-not-allowed'"
        :disabled="!navigation.canDecreaseFontSize"
        @click="handleDecrease"
      >A</button>
      <span class="text-xs text-gray-400">Font Size</span>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-[17px] font-bold"
        :class="navigation.canIncreaseFontSize
          ? 'bg-surface-overlay text-gray-200 active:bg-indigo-600'
          : 'bg-surface text-gray-600 cursor-not-allowed'"
        :disabled="!navigation.canIncreaseFontSize"
        @click="handleIncrease"
      >A</button>
    </div>

    <div class="border-t border-gray-700"></div>

    <!-- Watch dancers -->
    <button
      class="w-full px-3 py-2.5 flex items-center gap-2.5 text-left active:bg-surface-overlay transition-colors"
      @click="ui.openWatchPanel()"
    >
      <Star :size="16" :class="watchStore.watchedDancers.length > 0 ? 'text-gold-400 fill-gold-400' : 'text-gray-400'" />
      <span class="text-sm text-gray-200">Watch Dancers</span>
      <span v-if="watchStore.watchedDancers.length > 0" class="text-xs text-gray-500 ml-auto">
        {{ watchStore.watchedDancers.length }}
      </span>
    </button>

    <div class="border-t border-gray-700"></div>
    <div class="px-3 py-1.5 text-[10px] text-gray-600 text-right">{{ gitHash }}</div>
  </div>
</template>
