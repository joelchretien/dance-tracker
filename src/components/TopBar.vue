<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ListFilter, Settings, ChevronLeft } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useNavigationStore } from '@/stores/navigation'
import ScheduleStatus from './ScheduleStatus.vue'

defineProps<{ title: string; showBack: boolean }>()

const router = useRouter()
const ui = useUiStore()
const navigation = useNavigationStore()

const filterButtonClass = computed(() => {
  if (ui.viewMode === 'dancers') return 'bg-gold-400/15 active:bg-gold-400/25'
  if (ui.viewMode === 'studio') return 'bg-cyan-400/15 active:bg-cyan-400/25'
  return 'hover:bg-surface-raised active:bg-surface-overlay'
})

const filterIconClass = computed(() => {
  if (ui.viewMode === 'dancers') return 'text-gold-400'
  if (ui.viewMode === 'studio') return 'text-cyan-400'
  return 'text-gray-300'
})

const filterIconFill = computed(() =>
  ui.viewMode === 'dancers' ? 'currentColor' : 'none'
)
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
        <ScheduleStatus v-if="navigation.isWithinActiveHours" :status="ui.scheduleStatus" />
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
          :class="filterButtonClass"
          title="View mode" aria-label="View mode"
          aria-haspopup="menu"
          :aria-expanded="ui.viewModeDropdownOpen"
          @click="ui.toggleViewModeDropdown()"
        >
          <ListFilter :size="20" :class="filterIconClass" :fill="filterIconFill" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors relative"
          title="Settings" aria-label="Settings"
          aria-haspopup="menu"
          :aria-expanded="ui.settingsDropdownOpen"
          @click="ui.toggleSettingsDropdown()"
        >
          <Settings :size="20" :class="ui.settingsDropdownOpen ? 'text-gray-100' : 'text-gray-300'" />
          <span
            v-if="ui.updateAvailable"
            class="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-surface"
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>
  </div>
</template>
