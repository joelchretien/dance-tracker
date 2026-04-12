import { watch, onBeforeUnmount, type Ref } from 'vue'
import { useNavigationStore } from '@/stores/navigation'
import { useUiStore } from '@/stores/ui'

/**
 * Shows a "Jump to now" pill when the entry closest to the current
 * wall-clock time is not visible on screen. In Watched Dances mode,
 * tracks the current-position marker instead.
 */
export function useSnapback(scrollContainer: Ref<HTMLElement | null>) {
  const navigation = useNavigationStore()
  const ui = useUiStore()

  let observer: IntersectionObserver | null = null

  function cleanup() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  function observe() {
    cleanup()

    let el: HTMLElement | null = null
    if (ui.myDancesMode) {
      // In Watched Dances mode, observe the position marker or the marked entry
      el = document.getElementById('current-position-marker')
        ?? document.getElementById(`entry-${navigation.markedIndex}`)
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

  // Re-observe when nowIndex updates, mode changes, or marked entry changes
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
