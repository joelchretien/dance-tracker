<script setup lang="ts">
import { computed } from 'vue'
import { ALargeSmall, Star, Search, ListFilter, Trophy } from 'lucide-vue-next'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'

defineProps<{ title: string }>()
const emit = defineEmits<{
  'cycle-font-size': []
  'toggle-my-dances': []
}>()

const watchStore = useWatchStore()
const ui = useUiStore()

const hasWatched = computed(() => watchStore.watchedDancers.length > 0)
</script>

<template>
  <div class="sticky top-0 z-30 bg-surface border-b border-gray-800" style="padding-top: env(safe-area-inset-top, 0px)">
    <div class="flex items-center justify-between px-3 py-2">
      <div class="text-sm font-semibold truncate flex-1 mr-2">{{ title }}</div>
      <div class="flex items-center gap-1">
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Search dances"
          @click="ui.openSearchPanel()"
        >
          <Search :size="20" class="text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="My dances"
          @click="emit('toggle-my-dances')"
        >
          <ListFilter :size="20" :class="ui.myDancesMode ? 'text-gold-400' : 'text-gray-300'" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Awards"
          @click="ui.toggleAwardsNav()"
        >
          <Trophy :size="20" :class="ui.awardsNavOpen ? 'text-gold-400' : 'text-gray-300'" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Font size"
          @click="emit('cycle-font-size')"
        >
          <ALargeSmall :size="20" class="text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Watch dancers"
          @click="ui.openWatchPanel()"
        >
          <Star :size="20" :class="hasWatched ? 'text-gold-400 fill-gold-400' : 'text-gray-300'" />
        </button>
      </div>
    </div>
  </div>
</template>
