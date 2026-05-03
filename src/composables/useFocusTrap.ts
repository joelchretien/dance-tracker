import { onMounted, onBeforeUnmount, type Ref } from 'vue'

/**
 * Trap Tab focus within a container element while the dialog is mounted,
 * and restore focus to the previously-focused element on unmount.
 *
 * Captures focusable descendants on every Tab keydown rather than once on
 * mount, because dialog content (e.g. search results in JumpToPanel) can
 * change after open. Treats the container itself as the first focusable
 * element when it has tabindex="-1" — useful for dialogs that don't have
 * a natural first input.
 *
 * Cooperates with @keydown.esc bound on the container; this composable
 * doesn't try to handle Escape, just Tab.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
  let previouslyFocused: HTMLElement | null = null

  function getFocusable(): HTMLElement[] {
    const container = containerRef.value
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(el => el.offsetParent !== null) // skip hidden elements
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    const focusables = getFocusable()
    if (focusables.length === 0) {
      // Nothing to focus inside; keep focus on the container so Escape works.
      e.preventDefault()
      containerRef.value?.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement as HTMLElement | null

    if (e.shiftKey) {
      if (active === first || active === containerRef.value) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  onMounted(() => {
    previouslyFocused = document.activeElement as HTMLElement | null
    const container = containerRef.value
    if (container) container.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    const container = containerRef.value
    if (container) container.removeEventListener('keydown', onKeydown)
    // Restore focus to the trigger element so keyboard users return to
    // wherever they were before opening the dialog.
    previouslyFocused?.focus?.()
  })
}
