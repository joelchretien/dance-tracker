<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'

const schedule = useScheduleStore()
const navigation = useNavigationStore()
const watchStore = useWatchStore()

const emit = defineEmits<{ 'jump-to': [index: number] }>()

// Current position in the awards list
const awardsPos = ref(0)

// Initialize to nearest award when opened
watch(() => schedule.awardsIndices, () => {
  syncToNearest()
}, { immediate: true })

function syncToNearest() {
  const indices = schedule.awardsIndices
  if (indices.length === 0) return
  const marked = navigation.markedIndex
  // Find the closest award at or after the marked index
  let best = 0
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] >= marked) { best = i; break }
    best = i
  }
  awardsPos.value = best
}

const currentAwardsIndex = computed(() => {
  const indices = schedule.awardsIndices
  if (indices.length === 0 || awardsPos.value >= indices.length) return null
  return indices[awardsPos.value]
})

const currentAwardsEntry = computed(() => {
  if (currentAwardsIndex.value === null) return null
  return schedule.flatEntries[currentAwardsIndex.value]?.entry ?? null
})

const isWatchedAward = computed(() => {
  if (currentAwardsIndex.value === null) return false
  return watchStore.watchedAwardsSet.has(currentAwardsIndex.value)
})

const canPrev = computed(() => awardsPos.value > 0)
const canNext = computed(() => awardsPos.value < schedule.awardsIndices.length - 1)

const posLabel = computed(() =>
  `${awardsPos.value + 1}/${schedule.awardsIndices.length}`
)

function goPrev() {
  if (canPrev.value) {
    awardsPos.value--
    jumpToCurrent()
  }
}

function goNext() {
  if (canNext.value) {
    awardsPos.value++
    jumpToCurrent()
  }
}

function jumpToCurrent() {
  if (currentAwardsIndex.value !== null) {
    navigation.select(currentAwardsIndex.value)
    emit('jump-to', currentAwardsIndex.value)
  }
}
</script>

<template>
  <div v-if="schedule.awardsIndices.length > 0" class="bg-surface-raised border-b border-gray-800 px-2 py-1.5">
    <div class="flex items-center gap-1">
      <button
        class="p-1.5 rounded-lg transition-colors shrink-0"
        :class="canPrev ? 'text-gray-300 active:bg-surface-overlay' : 'text-gray-700 cursor-not-allowed'"
        :disabled="!canPrev"
        @click="goPrev"
      >
        <ChevronLeft :size="18" />
      </button>

      <button
        class="flex-1 min-w-0 text-center py-1 rounded-lg active:bg-surface-overlay transition-colors"
        @click="jumpToCurrent"
      >
        <div class="text-xs font-semibold truncate" :class="isWatchedAward ? 'text-gold-400' : 'text-gray-300'">
          {{ currentAwardsEntry?.title ?? 'Awards' }}
        </div>
        <div class="text-[10px] text-gray-500">
          {{ currentAwardsEntry?.time }}<span class="ml-1.5">{{ posLabel }}</span>
        </div>
      </button>

      <button
        class="p-1.5 rounded-lg transition-colors shrink-0"
        :class="canNext ? 'text-gray-300 active:bg-surface-overlay' : 'text-gray-700 cursor-not-allowed'"
        :disabled="!canNext"
        @click="goNext"
      >
        <ChevronRight :size="18" />
      </button>
    </div>
  </div>
</template>
