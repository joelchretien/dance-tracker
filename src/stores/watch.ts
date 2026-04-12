import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScheduleStore } from './schedule'
import { useNavigationStore } from './navigation'
import { computeAwardsBlocks } from '@/lib/awards'
import { findNextTarget, countDancesUntil } from '@/lib/countdown'
import { extractSubtitle } from '@/lib/category'
import { parseTime, formatTimeDiff } from '@/lib/time'
import type { AwardsBlock } from '@/types/schedule'

export const useWatchStore = defineStore('watch', () => {
  const schedule = useScheduleStore()
  const navigation = useNavigationStore()

  const watchedDancers = ref<string[]>([])
  let storage: ReturnType<typeof useLocalStorage<string[]>> | null = null

  function initForSchedule(id: string) {
    storage = useLocalStorage<string[]>(`dt:${id}:watch`, [])

    // Migrate legacy "dw" key
    try {
      const legacy = localStorage.getItem('dw')
      if (legacy && !localStorage.getItem(`dt:${id}:watch`)) {
        storage.value = JSON.parse(legacy)
      }
    } catch { /* ignore */ }

    watchedDancers.value = storage.value
  }

  watch(watchedDancers, (val) => { if (storage) storage.value = val }, { deep: true })

  const watchedDancerSet = computed(() => new Set(watchedDancers.value))

  const watchedStudios = computed<Set<string>>(() => {
    const studios = new Set<string>()
    for (const item of schedule.flatEntries) {
      if (item.entry.type === 'dance' && item.entry.studio && item.entry.dancers) {
        if (item.entry.dancers.some(d => watchedDancerSet.value.has(d))) {
          studios.add(item.entry.studio)
        }
      }
    }
    return studios
  })

  const awardsBlocks = computed<AwardsBlock[]>(() =>
    computeAwardsBlocks(schedule.flatEntries, schedule.awardsIndices, watchedDancerSet.value)
  )

  const watchedAwardsSet = computed<Set<number>>(() => {
    const set = new Set<number>()
    for (const block of awardsBlocks.value) {
      if (block.hasWatchedDancer) set.add(block.awardsGlobalIndex)
    }
    return set
  })

  const nextTargetIndex = computed<number | null>(() =>
    findNextTarget(
      schedule.flatEntries,
      navigation.currentIndex,
      watchedDancerSet.value,
      watchedAwardsSet.value,
    )
  )

  const dancesUntilTarget = computed<number | null>(() => {
    if (nextTargetIndex.value === null) return null
    if (nextTargetIndex.value === navigation.currentIndex) return 0
    return countDancesUntil(schedule.flatEntries, navigation.currentIndex, nextTargetIndex.value)
  })

  const nextTargetEntry = computed(() => {
    if (nextTargetIndex.value === null) return null
    return schedule.flatEntries[nextTargetIndex.value]?.entry ?? null
  })

  const nextTargetWatchedDancers = computed<string[]>(() => {
    const entry = nextTargetEntry.value
    if (!entry || entry.type !== 'dance' || !entry.dancers) return []
    return entry.dancers.filter(d => watchedDancerSet.value.has(d))
  })

  const nextTargetIsAwards = computed(() =>
    nextTargetEntry.value?.type === 'awards'
  )

  const nextTargetIsWatchedAwards = computed(() => {
    if (nextTargetIndex.value === null) return false
    return watchedAwardsSet.value.has(nextTargetIndex.value)
  })

  const nextTargetStyleType = computed<string>(() => {
    if (nextTargetIndex.value === null) return ''
    if (nextTargetIndex.value === navigation.currentIndex) return 'on-now'
    if (dancesUntilTarget.value === 0) return 'up-next'
    return 'countdown'
  })

  const nextTargetSubtitle = computed<string>(() => {
    const entry = nextTargetEntry.value
    if (!entry) return ''
    if (entry.type === 'awards') return entry.title
    if (entry.type === 'dance') return extractSubtitle(entry.category)
    return ''
  })

  const nextTargetTime = computed<string>(() => nextTargetEntry.value?.time ?? '')

  /** Time difference string between current entry and next target (e.g., "~15min") */
  const nextTargetTimeDiff = computed<string>(() => {
    const curEntry = navigation.currentEntry?.entry
    const nxtEntry = nextTargetEntry.value
    if (!curEntry || !nxtEntry) return ''
    const from = parseTime(curEntry.time)
    const to = parseTime(nxtEntry.time)
    return formatTimeDiff(from, to)
  })

  function toggleDancer(name: string) {
    const idx = watchedDancers.value.indexOf(name)
    if (idx >= 0) {
      watchedDancers.value.splice(idx, 1)
      return false // removed
    } else {
      watchedDancers.value.push(name)
      return true // added
    }
  }

  function isWatchedEntry(globalIndex: number): boolean {
    const item = schedule.flatEntries[globalIndex]
    if (!item) return false
    const entry = item.entry
    if (entry.type === 'dance' && entry.dancers) {
      return entry.dancers.some(d => watchedDancerSet.value.has(d))
    }
    if (entry.type === 'awards') {
      return watchedAwardsSet.value.has(globalIndex)
    }
    return false
  }

  function getWatchedDancersForEntry(globalIndex: number): string[] {
    const item = schedule.flatEntries[globalIndex]
    if (!item || item.entry.type !== 'dance' || !item.entry.dancers) return []
    return item.entry.dancers.filter(d => watchedDancerSet.value.has(d))
  }

  /** Sorted global indices of all watched dances + watched awards */
  const watchedEntryIndices = computed<number[]>(() => {
    const indices: number[] = []
    for (const item of schedule.flatEntries) {
      const e = item.entry
      if (e.type === 'dance' && e.dancers?.some(d => watchedDancerSet.value.has(d))) {
        indices.push(item.globalIndex)
      } else if (e.type === 'awards' && watchedAwardsSet.value.has(item.globalIndex)) {
        indices.push(item.globalIndex)
      }
    }
    return indices
  })

  return {
    watchedDancers, watchedDancerSet, watchedStudios,
    awardsBlocks, watchedAwardsSet,
    nextTargetIndex, dancesUntilTarget, nextTargetEntry,
    nextTargetWatchedDancers, nextTargetIsAwards, nextTargetIsWatchedAwards,
    nextTargetStyleType, nextTargetSubtitle, nextTargetTime, nextTargetTimeDiff,
    initForSchedule, toggleDancer, isWatchedEntry, getWatchedDancersForEntry,
    watchedEntryIndices,
  }
})
