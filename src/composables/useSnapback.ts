import { watch, onBeforeUnmount, type Ref } from 'vue'
import { useNavigationStore } from '@/stores/navigation'
import { useUiStore } from '@/stores/ui'

/**
 * Watches whether the currently-selected entry is visible in the scroll container.
 * When it scrolls out of view, sets snapbackVisible + direction in the UI store.
 * The arrow points toward the selected entry (up if it's above viewport, down if below).
 */
export function useSnapback(scrollContainer: Ref<HTMLElement | null>) {
  const navigation = useNavigationStore()
  const ui = useUiStore()

  let observer: IntersectionObserver | null = null
  let currentEl: HTMLElement | null = null

  function cleanup() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    currentEl = null
  }

  function getDirection(): 'up' | 'down' {
    if (!currentEl) return 'up'
    const rect = currentEl.getBoundingClientRect()
    // If the entry's top is above the viewport midpoint, it's above → arrow up
    const viewportMid = window.innerHeight / 2
    return rect.top < viewportMid ? 'up' : 'down'
  }

  function observe() {
    cleanup()
    const el = document.getElementById(`entry-${navigation.currentIndex}`)
    if (!el) return
    currentEl = el

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ui.setSnapback(false)
        } else {
          ui.setSnapback(true, getDirection())
        }
      },
      { root: scrollContainer.value, threshold: 0.1 },
    )
    observer.observe(el)
  }

  // Re-attach whenever the selected entry changes
  watch(() => navigation.currentIndex, () => {
    requestAnimationFrame(observe)
  }, { immediate: true })

  // Update direction on scroll (entry might go from below to above as user scrolls)
  function onScroll() {
    if (!ui.snapbackVisible || !currentEl) return
    ui.setSnapback(true, getDirection())
  }

  watch(scrollContainer, (container, _, onCleanup) => {
    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true })
      onCleanup(() => container.removeEventListener('scroll', onScroll))
    }
  }, { immediate: true })

  onBeforeUnmount(cleanup)
}
