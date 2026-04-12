<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const filteredDancers = computed(() => {
  const q = ui.settingsWatchQuery.toLowerCase().trim()
  if (!q) return schedule.allDancers
  return schedule.allDancers.filter(d => d.toLowerCase().includes(q))
})

const watchedFiltered = computed(() =>
  filteredDancers.value.filter(d => watchStore.watchedDancerSet.has(d))
)

const unwatchedFiltered = computed(() =>
  filteredDancers.value.filter(d => !watchStore.watchedDancerSet.has(d))
)

function toggleDancer(name: string) {
  const added = watchStore.toggleDancer(name)
  ui.showToast(added ? `★ Watching ${name}` : `☆ Removed ${name}`)
}

function handleFontSize() {
  const msg = navigation.cycleFontSize()
  ui.showToast(msg)
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-surface flex flex-col" style="padding-top: env(safe-area-inset-top, 0px)">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <h2 class="text-lg font-semibold">Settings</h2>
      <button
        class="p-2 rounded-lg hover:bg-surface-raised transition-colors"
        @click="ui.closeSettingsPanel()"
      >
        <X :size="20" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Font Size -->
      <div class="px-4 pt-4 pb-3 border-b border-gray-800">
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Font Size</div>
        <button
          class="w-full py-2 px-3 rounded-lg bg-surface-raised text-sm text-gray-200 active:bg-surface-overlay transition-colors text-left"
          @click="handleFontSize"
        >
          Tap to cycle: <span class="text-indigo-400 font-semibold">{{ navigation.fontSize }}</span>
        </button>
      </div>

      <!-- Watch Dancers -->
      <div class="px-4 pt-4 pb-2">
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Watch Dancers
        </div>
        <input
          v-model="ui.settingsWatchQuery"
          type="text"
          placeholder="Search dancers..."
          class="w-full px-3 py-2 bg-surface-raised border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div class="px-4 pb-4">
        <div v-if="watchedFiltered.length > 0" class="mb-4">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Watching ({{ watchStore.watchedDancers.length }})
          </div>
          <button
            v-for="name in watchedFiltered"
            :key="name"
            class="flex items-center gap-2 w-full py-2 px-2 rounded-lg hover:bg-surface-raised transition-colors text-left"
            @click="toggleDancer(name)"
          >
            <span class="text-gold-400">★</span>
            <span class="text-sm text-gold-400">{{ name }}</span>
          </button>
        </div>

        <div>
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            All Dancers
          </div>
          <button
            v-for="name in unwatchedFiltered"
            :key="name"
            class="flex items-center gap-2 w-full py-2 px-2 rounded-lg hover:bg-surface-raised transition-colors text-left"
            @click="toggleDancer(name)"
          >
            <span class="text-gray-500">☆</span>
            <span class="text-sm text-gray-300">{{ name }}</span>
          </button>
        </div>

        <div v-if="filteredDancers.length === 0" class="text-center text-gray-500 py-8">
          No dancers match "{{ ui.settingsWatchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>
