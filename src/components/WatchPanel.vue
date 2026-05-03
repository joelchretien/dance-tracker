<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'

const schedule = useScheduleStore()
const watchStore = useWatchStore()
const ui = useUiStore()

const dialogRef = ref<HTMLElement | null>(null)
onMounted(() => {
  // Focus the dialog itself so Escape (bound at the dialog element) works
  // without the user clicking inside first. tabindex="-1" makes the div
  // programmatically focusable without inserting it into tab order.
  nextTick(() => dialogRef.value?.focus())
})

const ONBOARDED_KEY = 'dt:onboardedWatchedDancers'

const filteredDancers = computed(() => {
  const q = ui.watchSearchQuery.toLowerCase().trim()
  if (!q) return schedule.allDancers
  return schedule.allDancers.filter(d => d.toLowerCase().includes(q))
})

const watchedFiltered = computed(() =>
  filteredDancers.value.filter(d => watchStore.watchedDancerSet.has(d))
)

const unwatchedFiltered = computed(() =>
  filteredDancers.value.filter(d => !watchStore.watchedDancerSet.has(d))
)

function toggle(name: string) {
  const added = watchStore.toggleDancer(name)
  ui.showToast(added ? `★ Watching ${name}` : `☆ Removed ${name}`)
}

function close() {
  // First-time educational modal: if the user is closing with watched
  // dancers set and we haven't shown them this yet, open the tip modal.
  const hasOnboarded = localStorage.getItem(ONBOARDED_KEY) === '1'
  if (!hasOnboarded && watchStore.watchedDancers.length > 0) {
    localStorage.setItem(ONBOARDED_KEY, '1')
    ui.watchedDancersTipOpen = true
  }
  ui.closeWatchPanel()
}
</script>

<template>
  <div
    ref="dialogRef"
    role="dialog"
    aria-modal="true"
    aria-labelledby="watch-panel-title"
    class="fixed inset-0 z-40 bg-surface flex flex-col focus:outline-none"
    style="padding-top: env(safe-area-inset-top, 0px)"
    tabindex="-1"
    @keydown.esc="close"
  >
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <h2 id="watch-panel-title" class="text-lg font-semibold">Watched Dancers</h2>
      <button
        class="p-2 rounded-lg hover:bg-surface-raised transition-colors"
        aria-label="Close watched dancers panel"
        @click="close"
      >
        <X :size="20" />
      </button>
    </div>

    <div class="px-4 py-2">
      <input
        v-model="ui.watchSearchQuery"
        type="text"
        placeholder="Search dancers..."
        class="w-full px-3 py-2 bg-surface-raised border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
    </div>

    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <div v-if="watchedFiltered.length > 0" class="mb-4">
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Watching ({{ watchStore.watchedDancers.length }})
        </div>
        <button
          v-for="name in watchedFiltered"
          :key="name"
          class="flex items-center gap-2 w-full py-2 px-2 rounded-lg hover:bg-surface-raised transition-colors text-left"
          @click="toggle(name)"
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
          @click="toggle(name)"
        >
          <span class="text-gray-500">☆</span>
          <span class="text-sm text-gray-300">{{ name }}</span>
        </button>
      </div>

      <div v-if="filteredDancers.length === 0" class="text-center text-gray-500 py-8">
        No dancers match "{{ ui.watchSearchQuery }}"
      </div>
    </div>
  </div>
</template>
