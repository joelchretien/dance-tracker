import { watch, onBeforeUnmount, type Ref } from 'vue'
import { useNavigationStore } from '@/stores/navigation'
import { useWatchStore } from '@/stores/watch'
import { useUiStore } from '@/stores/ui'

/**
 * Shows a "Jump to now" pill when the entry closest to the current
 * wall-clock time is not visible on screen.
 */
export function useSnapback(scrollContainer: Ref<HTMLElement | null>) {
  const navigation = useNavigationStore()
  const watchStore = useWatchStore()
  const ui = useUiStore()

  let observer: IntersectionObserver | null = null

  function cleanup() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  /** Find the watched entry closest to nowIndex */
  function nearestWatchedToNow(): number | null {
    const now = navigation.nowIndex
    if (now === null) return null
    const indices = watchStore.watchedEntryIndices
    if (indices.length === 0) return null

    let best = indices[0]
    let bestDist = Math.abs(best - now)
    for (const gi of indices) {
      const dist = Math.abs(gi - now)
      if (dist < bestDist) {
        best = gi
        bestDist = dist
      }
    }
    return best
  }

  function observe() {
    cleanup()

    let el: HTMLElement | null = null
    if (ui.myDancesMode) {
      // In Watched Dances mode, observe the watched entry nearest to current time
      const nearest = nearestWatchedToNow()
      if (nearest !== null) {
        el = document.getElementById(`entry-${nearest}`)
      }
    } else {
      // In full view, observe the entry closest to current wall-clock time
      if (navigation.nowIndex !== null) {
        el = document.getElementById(`entry-${navigation.nowIndex}`)
      }
    }

    if (!el) {
      ui.setSnapback(false)
      return
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ui.setSnapback(false)
        } else {
          ui.setSnapback(true)
        }
      },
      { root: scrollContainer.value, threshold: 0.1 },
    )
    observer.observe(el)
  }

  watch(
    [() => navigation.nowIndex, () => navigation.markedIndex, () => ui.myDancesMode],
    () => { requestAnimationFrame(observe) },
    { immediate: true },
  )

  watch(scrollContainer, (container, _, onCleanup) => {
    if (container) {
      onCleanup(() => {})
    }
  }, { immediate: true })

  onBeforeUnmount(cleanup)
}
