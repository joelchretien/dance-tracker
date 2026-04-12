<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Search, ListFilter, Settings, ChevronLeft } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

defineProps<{ title: string }>()
const emit = defineEmits<{
  'toggle-watched-dances': []
}>()

const router = useRouter()
const ui = useUiStore()
</script>

<template>
  <div class="sticky top-0 z-30 bg-surface border-b border-gray-800 relative" style="padding-top: env(safe-area-inset-top, 0px)">
    <div class="flex items-center justify-between px-1 py-2">
      <button
        class="p-1.5 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors shrink-0"
        title="Back to schedule list"
        @click="router.push('/')"
      >
        <ChevronLeft :size="22" class="text-gray-400" />
      </button>
      <div class="text-lg font-bold truncate flex-1 mr-2">{{ title }}</div>
      <div class="flex items-center gap-1">
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Jump to"
          @click="ui.openJumpToPanel()"
        >
          <Search :size="20" class="text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Watched dances"
          @click="emit('toggle-watched-dances')"
        >
          <ListFilter :size="20" :class="ui.watchedDancesMode ? 'text-gold-400' : 'text-gray-300'" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Settings"
          @click="ui.toggleSettingsDropdown()"
        >
          <Settings :size="20" :class="ui.settingsDropdownOpen ? 'text-gray-100' : 'text-gray-300'" />
        </button>
      </div>
    </div>
  </div>
</template>
