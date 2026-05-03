<script setup lang="ts">
import { LayoutList, Building2, Star, Check } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useWatchStore } from '@/stores/watch'
import type { ViewMode } from '@/stores/ui'

const ui = useUiStore()
const watchStore = useWatchStore()

interface Option {
  mode: ViewMode
  label: string
  icon: typeof LayoutList
  iconClass: string
  iconFill: string
}

const options: Option[] = [
  { mode: 'all', label: 'All Dances', icon: LayoutList, iconClass: 'text-gray-300', iconFill: 'none' },
  { mode: 'studio', label: 'Watched Studios', icon: Building2, iconClass: 'text-cyan-400', iconFill: 'none' },
  { mode: 'dancers', label: 'Watched Dancers', icon: Star, iconClass: 'text-gold-400', iconFill: 'currentColor' },
]
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-30 bg-black/30" @click="ui.closeViewModeDropdown()"></div>

  <!-- Dropdown -->
  <div
    class="absolute right-12 z-40 w-52 bg-surface-raised border border-gray-700 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden"
    style="top: calc(env(safe-area-inset-top, 0px) + 48px)"
  >
    <button
      v-for="(opt, i) in options"
      :key="opt.mode"
      class="w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors"
      :class="[
        i > 0 ? 'border-t border-gray-700' : '',
        opt.mode !== 'all' && watchStore.watchedDancers.length === 0
          ? 'opacity-40 cursor-not-allowed'
          : 'active:bg-surface-overlay',
      ]"
      :disabled="opt.mode !== 'all' && watchStore.watchedDancers.length === 0"
      @click="ui.setViewMode(opt.mode)"
    >
      <component :is="opt.icon" :size="16" :class="opt.iconClass" :fill="opt.iconFill" />
      <span class="text-sm flex-1 text-gray-200">{{ opt.label }}</span>
      <Check v-if="ui.viewMode === opt.mode" :size="16" class="text-indigo-300 shrink-0" />
    </button>
  </div>
</template>
