<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Search, ListFilter, Settings, ChevronLeft } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import ScheduleStatus from './ScheduleStatus.vue'

defineProps<{ title: string; showBack: boolean }>()
const emit = defineEmits<{
  'toggle-watched-dances': []
}>()

const router = useRouter()
const ui = useUiStore()
</script>

<template>
  <div class="sticky top-0 z-30 bg-surface border-b border-gray-800" style="padding-top: env(safe-area-inset-top, 0px)">
    <div class="flex items-center justify-between py-2" :class="showBack ? 'px-1' : 'px-3'">
      <button
        v-if="showBack"
        class="p-1.5 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors shrink-0"
        title="Back to schedule list" aria-label="Back to schedule list"
        @click="router.push('/')"
      >
        <ChevronLeft :size="22" class="text-gray-400" />
      </button>
      <div class="flex items-baseline gap-2 flex-1 mr-2 min-w-0">
        <div class="text-lg font-bold truncate">{{ title }}</div>
        <ScheduleStatus :status="ui.scheduleStatus" />
      </div>
      <div class="flex items-center gap-1">
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Jump to" aria-label="Search"
          @click="ui.openJumpToPanel()"
        >
          <Search :size="20" class="text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg transition-colors"
          :class="ui.watchedDancesMode ? 'bg-gold-400/15 active:bg-gold-400/25' : 'hover:bg-surface-raised active:bg-surface-overlay'"
          title="Watched dances" aria-label="Filter watched dances"
          @click="emit('toggle-watched-dances')"
        >
          <ListFilter :size="20" :class="ui.watchedDancesMode ? 'text-gold-400' : 'text-gray-300'" :fill="ui.watchedDancesMode ? 'currentColor' : 'none'" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Settings" aria-label="Settings"
          @click="ui.toggleSettingsDropdown()"
        >
          <Settings :size="20" :class="ui.settingsDropdownOpen ? 'text-gray-100' : 'text-gray-300'" />
        </button>
      </div>
    </div>
  </div>
</template>
