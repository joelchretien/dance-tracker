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

  function observe() {
    cleanup()

    let el: HTMLElement | null = null
    if (ui.watchedDancesMode) {
      const nearest = watchStore.nearestWatchedToNow()
      if (nearest !== null) {
        el = document.getElementById(`entry-${nearest}`)
      }
    } else {
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
    [() => navigation.nowIndex, () => navigation.markedIndex, () => ui.watchedDancesMode],
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
