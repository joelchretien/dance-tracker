/**
 * Recent search history, persisted per schedule.
 *
 * Search results are per-competition (titles, dancer names, studio names
 * are all competition-specific), so recents are scoped to the schedule
 * id rather than global. Storage key: `dt:${id}:recentSearches`. Bound
 * to the same `dt:` namespace as everything else, so 'Reset all data'
 * clears it.
 *
 * Capped at 8 entries to keep the empty state legible without scrolling.
 * Most recent first; tapping an existing query bumps it to the top
 * rather than duplicating.
 *
 * Pure-ish: takes the schedule id at composable construction so callers
 * don't have to plumb it; returns a reactive ref + helpers. Idempotent
 * across remounts because useLocalStorage is the single source of truth
 * (the in-memory ref is just a reactive view of localStorage).
 */
import { computed, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const MAX_RECENTS = 8
const MIN_LENGTH = 2 // Ignore stray single-character searches the user didn't intend.

export function useRecentSearches(scheduleId: Ref<string | null>) {
  // Storage ref is computed from the schedule id, so swapping schedules
  // surfaces the right history without any imperative reload step.
  const storageKey = computed(() => `dt:${scheduleId.value ?? ''}:recentSearches`)

  // useLocalStorage returns a single ref that proxies to localStorage.
  // We re-derive when storageKey changes by re-running the call inside
  // a computed — a small wrapper since useLocalStorage doesn't take a
  // reactive key directly.
  function getStorage() {
    return useLocalStorage<string[]>(storageKey.value, [], {
      // Sync writes so a search-and-immediately-force-close persists.
      // The latency of localStorage.setItem is negligible (microseconds);
      // the previous default of 'pre' deferred to nextTick which is the
      // wrong default for state we want durable on demand.
      flush: 'sync',
      // Tolerate corrupt JSON without throwing — return [] in that case.
      // Without this, a hand-edit or partial write blocks the entire
      // search panel from rendering its empty state.
      serializer: {
        read: (raw) => {
          try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
          } catch {
            return []
          }
        },
        write: (value) => JSON.stringify(value),
      },
    })
  }

  const recents = computed<string[]>(() => {
    if (!scheduleId.value) return []
    return getStorage().value
  })

  function record(query: string) {
    if (!scheduleId.value) return
    const trimmed = query.trim()
    if (trimmed.length < MIN_LENGTH) return
    const storage = getStorage()
    // Case-insensitive dedup so 'Emma' and 'emma' don't both stick around;
    // keep the most-recently-typed casing.
    const lowerTrim = trimmed.toLowerCase()
    const filtered = storage.value.filter(q => q.toLowerCase() !== lowerTrim)
    storage.value = [trimmed, ...filtered].slice(0, MAX_RECENTS)
  }

  function remove(query: string) {
    if (!scheduleId.value) return
    const storage = getStorage()
    storage.value = storage.value.filter(q => q !== query)
  }

  function clear() {
    if (!scheduleId.value) return
    getStorage().value = []
  }

  return { recents, record, remove, clear }
}
