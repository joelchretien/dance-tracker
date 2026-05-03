import { ref, computed, onUnmounted, type Ref } from 'vue'

/**
 * Drag-to-seek + click-to-seek + keyboard-to-seek progress control,
 * extracted from DanceEntry and BreakEntry where it had been duplicated
 * verbatim. Returns handlers + ARIA slider props the component binds to
 * its visual bar element.
 *
 * Mouse drags attach mousemove/mouseup to document during the drag so
 * dragging out of the bar element doesn't drop events. Touch events
 * route to the originating element automatically and don't need this.
 *
 * Keyboard support: Arrow keys nudge by 1% (Shift = 5%), Home/End jump
 * to ends, PageUp/PageDown step by 10%. Combined with role="slider"
 * + aria-valuemin/max/now, this is what a screen-reader user expects
 * from a progress slider.
 */
export interface UseSeekableBarOptions {
  /** The DOM element the user drags/clicks on. */
  barRef: Ref<HTMLElement | null>
  /** Whether seeking is currently allowed. When false, all handlers no-op. */
  seekable: Ref<boolean>
  /** Current authoritative progress (0–1) — the source of truth from the parent. */
  progress: Ref<number>
  /** Called with the new progress in [0, 1] whenever the user finishes a seek action. */
  onSeek: (progress: number) => void
}

const KEY_NUDGE = 0.01
const KEY_NUDGE_LARGE = 0.05
const KEY_PAGE = 0.10

export function useSeekableBar(opts: UseSeekableBarOptions) {
  const isDragging = ref(false)
  const dragProgress = ref(0)

  /** What the bar should visually display: drag preview when dragging, else authoritative. */
  const displayProgress = computed(() =>
    isDragging.value ? dragProgress.value : opts.progress.value,
  )

  function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n))
  }

  function progressFromEvent(e: TouchEvent | MouseEvent): number {
    const bar = opts.barRef.value
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    return clamp01((x - rect.left) / rect.width)
  }

  function onDragStart(e: TouchEvent | MouseEvent) {
    if (!opts.seekable.value) return
    e.stopPropagation()
    isDragging.value = true
    dragProgress.value = progressFromEvent(e)
    if (!('touches' in e)) {
      document.addEventListener('mousemove', onDragMove)
      document.addEventListener('mouseup', onDragEnd)
    }
  }

  /**
   * Symmetric cleanup of document-level mouse listeners. Called both on
   * normal drag-end (mouseup) and on component unmount, so a route change
   * mid-drag doesn't leave stale closures attached to document.
   */
  function removeDocumentListeners() {
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  function onDragMove(e: TouchEvent | MouseEvent) {
    if (!isDragging.value) return
    e.stopPropagation()
    dragProgress.value = progressFromEvent(e)
  }

  function onDragEnd(e: TouchEvent | MouseEvent) {
    if (!isDragging.value) return
    e.stopPropagation()
    isDragging.value = false
    if (!('touches' in e || 'changedTouches' in e)) {
      removeDocumentListeners()
    }
    // For touchend the event has no current touches; reuse last known dragProgress.
    let final: number
    if ('changedTouches' in e) {
      const bar = opts.barRef.value
      if (!bar) {
        final = dragProgress.value
      } else {
        const rect = bar.getBoundingClientRect()
        final = clamp01((e.changedTouches[0].clientX - rect.left) / rect.width)
      }
    } else {
      final = progressFromEvent(e)
    }
    opts.onSeek(clamp01(final))
  }

  // If a component unmounts mid-drag (route change, view-mode flip,
  // entry leaving the watched list), the mouseup handler on document
  // would otherwise hang around with a stale closure until the user
  // happened to mouseup somewhere.
  onUnmounted(removeDocumentListeners)

  function onBarClick(e: MouseEvent) {
    if (!opts.seekable.value) return
    e.stopPropagation()
    opts.onSeek(progressFromEvent(e))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!opts.seekable.value) return
    let delta = 0
    let absolute: number | null = null
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        delta = e.shiftKey ? KEY_NUDGE_LARGE : KEY_NUDGE
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = e.shiftKey ? -KEY_NUDGE_LARGE : -KEY_NUDGE
        break
      case 'PageUp':
        delta = KEY_PAGE
        break
      case 'PageDown':
        delta = -KEY_PAGE
        break
      case 'Home':
        absolute = 0
        break
      case 'End':
        absolute = 1
        break
      default:
        return
    }
    e.preventDefault()
    e.stopPropagation()
    const next = absolute !== null ? absolute : clamp01(opts.progress.value + delta)
    opts.onSeek(next)
  }

  /** ARIA slider props for the bar element. v-bind these onto the seek bar. */
  const ariaProps = computed(() => {
    if (!opts.seekable.value) {
      // When not seekable (entry not the marked + selected one) the bar is
      // decorative — don't expose it as an interactive slider.
      return { role: 'progressbar' as const, 'aria-valuenow': Math.round(opts.progress.value * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }
    }
    return {
      role: 'slider' as const,
      tabindex: 0,
      'aria-label': 'Dance progress',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': Math.round(displayProgress.value * 100),
      'aria-valuetext': `${Math.round(displayProgress.value * 100)} percent`,
    }
  })

  return {
    isDragging,
    displayProgress,
    onDragStart,
    onDragMove,
    onDragEnd,
    onBarClick,
    onKeyDown,
    ariaProps,
  }
}
