import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ScheduleFile, ScheduleManifest, IndexedEntry } from '@/types/schedule'

export const useScheduleStore = defineStore('schedule', () => {
  const scheduleFile = ref<ScheduleFile | null>(null)
  const manifest = ref<ScheduleManifest | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoaded = computed(() => scheduleFile.value !== null)
  const meta = computed(() => scheduleFile.value?.meta ?? null)
  const days = computed(() => scheduleFile.value?.days ?? [])

  const flatEntries = computed<IndexedEntry[]>(() => {
    if (!scheduleFile.value) return []
    const result: IndexedEntry[] = []
    let globalIndex = 0
    for (let dayIndex = 0; dayIndex < scheduleFile.value.days.length; dayIndex++) {
      for (const entry of scheduleFile.value.days[dayIndex].entries) {
        result.push({ entry, dayIndex, globalIndex })
        globalIndex++
      }
    }
    return result
  })

  const allDancers = computed<string[]>(() => {
    const set = new Set<string>()
    for (const item of flatEntries.value) {
      if (item.entry.type === 'dance' && item.entry.dancers) {
        for (const d of item.entry.dancers) set.add(d)
      }
    }
    return [...set].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  })

  const danceIndices = computed<number[]>(() =>
    flatEntries.value
      .filter(e => e.entry.type === 'dance')
      .map(e => e.globalIndex)
  )

  const totalDances = computed(() => danceIndices.value.length)

  const awardsIndices = computed<number[]>(() =>
    flatEntries.value
      .filter(e => e.entry.type === 'awards')
      .map(e => e.globalIndex)
  )

  const dayDates = computed(() => days.value.map(d => d.date))

  async function loadManifest() {
    try {
      const base = import.meta.env.BASE_URL
      const res = await fetch(`${base}schedules/index.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data?.schedules || !Array.isArray(data.schedules)) {
        throw new Error('Invalid manifest: missing schedules array')
      }
      manifest.value = data
    } catch (e) {
      console.error('Failed to load schedule list:', e)
      error.value = 'Failed to load schedule list'
    }
  }

  async function loadSchedule(id: string) {
    loading.value = true
    error.value = null
    try {
      const base = import.meta.env.BASE_URL
      const res = await fetch(`${base}schedules/${id}.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data?.meta || !Array.isArray(data?.days)) {
        throw new Error('Invalid schedule: missing meta or days')
      }
      scheduleFile.value = data
    } catch (e) {
      console.error('Failed to load schedule:', id, e)
      error.value = `Failed to load schedule: ${id}`
    } finally {
      loading.value = false
    }
  }

  return {
    scheduleFile, manifest, loading, error,
    isLoaded, meta, days, flatEntries, allDancers,
    danceIndices, totalDances, awardsIndices, dayDates,
    loadManifest, loadSchedule,
  }
})
