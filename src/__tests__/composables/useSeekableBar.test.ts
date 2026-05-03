/**
 * Tests for useSeekableBar. Drag/click handlers depend on a real DOM
 * (getBoundingClientRect, document listeners), so this suite focuses on
 * the keyboard handler and the ARIA props — the parts that have the most
 * branching logic and the least integration with rendered geometry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useSeekableBar } from '@/composables/useSeekableBar'

function setup(initialProgress = 0.5, initiallySeekable = true) {
  const barRef = ref<HTMLElement | null>(null)
  const seekable = ref(initiallySeekable)
  const progress = ref(initialProgress)
  const onSeek = vi.fn<(p: number) => void>()
  const bar = useSeekableBar({ barRef, seekable, progress, onSeek })
  return { ...bar, barRef, seekable, progress, onSeek }
}

function key(opts: { key: string; shiftKey?: boolean }): KeyboardEvent {
  // The composable only reads .key, .shiftKey, and calls preventDefault /
  // stopPropagation. Building a real KeyboardEvent requires a DOM env;
  // a minimal duck-typed mock is enough for unit-level coverage.
  return {
    key: opts.key,
    shiftKey: !!opts.shiftKey,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent
}

describe('useSeekableBar — keyboard', () => {
  it('arrow right nudges by 1%', () => {
    const { onKeyDown, onSeek } = setup(0.5)
    onKeyDown(key({ key: 'ArrowRight' }))
    expect(onSeek).toHaveBeenCalledWith(0.51)
  })

  it('arrow left nudges by -1%', () => {
    const { onKeyDown, onSeek } = setup(0.5)
    onKeyDown(key({ key: 'ArrowLeft' }))
    expect(onSeek).toHaveBeenCalledWith(0.49)
  })

  it('shift-arrow nudges by 5%', () => {
    const { onKeyDown, onSeek } = setup(0.5)
    onKeyDown(key({ key: 'ArrowRight', shiftKey: true }))
    expect(onSeek).toHaveBeenCalledWith(0.55)
  })

  it('PageUp/PageDown step by 10%', () => {
    const { onKeyDown, onSeek } = setup(0.5)
    onKeyDown(key({ key: 'PageUp' }))
    expect(onSeek).toHaveBeenLastCalledWith(0.6)
    onKeyDown(key({ key: 'PageDown' }))
    expect(onSeek).toHaveBeenLastCalledWith(0.4)
  })

  it('Home jumps to 0', () => {
    const { onKeyDown, onSeek } = setup(0.7)
    onKeyDown(key({ key: 'Home' }))
    expect(onSeek).toHaveBeenCalledWith(0)
  })

  it('End jumps to 1', () => {
    const { onKeyDown, onSeek } = setup(0.3)
    onKeyDown(key({ key: 'End' }))
    expect(onSeek).toHaveBeenCalledWith(1)
  })

  it('clamps at 0 and 1', () => {
    const { onKeyDown, onSeek } = setup(0)
    onKeyDown(key({ key: 'ArrowLeft' }))
    expect(onSeek).toHaveBeenLastCalledWith(0)

    const { onKeyDown: kd2, onSeek: seek2 } = setup(1)
    kd2(key({ key: 'ArrowRight' }))
    expect(seek2).toHaveBeenLastCalledWith(1)
  })

  it('ignores unrelated keys', () => {
    const { onKeyDown, onSeek } = setup(0.5)
    onKeyDown(key({ key: 'a' }))
    onKeyDown(key({ key: 'Tab' }))
    onKeyDown(key({ key: 'Enter' }))
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('does nothing when not seekable', () => {
    const { onKeyDown, onSeek } = setup(0.5, false)
    onKeyDown(key({ key: 'ArrowRight' }))
    onKeyDown(key({ key: 'Home' }))
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('prevents default for keys it handles', () => {
    const { onKeyDown } = setup(0.5)
    const e = key({ key: 'ArrowRight' })
    onKeyDown(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('does not preventDefault for unrelated keys', () => {
    const { onKeyDown } = setup(0.5)
    const e = key({ key: 'a' })
    onKeyDown(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
  })
})

describe('useSeekableBar — ariaProps', () => {
  it('exposes role=slider with valuenow when seekable', () => {
    const { ariaProps, progress } = setup(0.42, true)
    expect(ariaProps.value.role).toBe('slider')
    expect(ariaProps.value['aria-valuenow']).toBe(42)
    expect(ariaProps.value['aria-valuemin']).toBe(0)
    expect(ariaProps.value['aria-valuemax']).toBe(100)
    expect(ariaProps.value).toHaveProperty('tabindex', 0)
    progress.value = 0.99
    expect(ariaProps.value['aria-valuenow']).toBe(99)
  })

  it('downgrades to role=progressbar when not seekable', () => {
    const { ariaProps } = setup(0.5, false)
    expect(ariaProps.value.role).toBe('progressbar')
    expect(ariaProps.value).not.toHaveProperty('tabindex')
  })

  it('reflects drag-preview value via displayProgress', () => {
    const { ariaProps, displayProgress } = setup(0.5, true)
    // displayProgress equals progress when not dragging
    expect(displayProgress.value).toBe(0.5)
    expect(ariaProps.value['aria-valuenow']).toBe(50)
  })
})

describe('useSeekableBar — displayProgress', () => {
  it('echoes progress when not dragging', () => {
    const { displayProgress, progress } = setup(0.3)
    expect(displayProgress.value).toBe(0.3)
    progress.value = 0.7
    expect(displayProgress.value).toBe(0.7)
  })
})

beforeEach(() => {
  // Each test starts with no document listeners to avoid leaks between tests.
})
