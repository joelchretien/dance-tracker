import { watch, onBeforeUnmount, type Ref } from 'vue'
import { useNavigationStore } from '@/stores/navigation'
import { useUiStore } from '@/stores/ui'

/**
 * Shows a "Jump to now" pill when the user scrolls away from the
 * currently-marked entry. The pill triggers a scroll to the entry
 * closest to the current wall-clock time.
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
    const el = document.getElementById(`entry-${navigation.markedIndex}`)
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

  // Re-attach whenever the marked entry changes or the view mode changes
  watch([() => navigation.markedIndex, () => ui.myDancesMode], () => {
    requestAnimationFrame(observe)
  }, { immediate: true })

  watch(scrollContainer, (container, _, onCleanup) => {
    if (container) {
      onCleanup(() => {})
    }
  }, { immediate: true })

  onBeforeUnmount(cleanup)
}
