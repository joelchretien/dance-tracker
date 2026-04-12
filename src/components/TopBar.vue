<script setup lang="ts">
import { computed } from 'vue'
import { ALargeSmall, Clock, Star, Info } from 'lucide-vue-next'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'

defineProps<{ title: string }>()
const emit = defineEmits<{
  'jump-to-now': []
  'cycle-font-size': []
  'toggle-details': []
}>()

const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const hasWatched = computed(() => watchStore.watchedDancers.length > 0)
</script>

<template>
  <div class="sticky top-0 z-30 bg-surface border-b border-gray-800">
    <div class="flex items-center justify-between px-3 py-2">
      <div class="text-sm font-semibold truncate flex-1 mr-2">{{ title }}</div>
      <div class="flex items-center gap-1">
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Font size"
          @click="emit('cycle-font-size')"
        >
          <ALargeSmall :size="20" class="text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Jump to now"
          @click="emit('jump-to-now')"
        >
          <Clock :size="20" class="text-gray-300" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Watch dancers"
          @click="ui.openWatchPanel()"
        >
          <Star :size="20" :class="hasWatched ? 'text-gold-400 fill-gold-400' : 'text-gray-300'" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-surface-raised active:bg-surface-overlay transition-colors"
          title="Toggle details"
          @click="emit('toggle-details')"
        >
          <Info :size="20" :class="navigation.showDetails ? 'text-indigo-500' : 'text-gray-300'" />
        </button>
      </div>
    </div>
  </div>
</template>
