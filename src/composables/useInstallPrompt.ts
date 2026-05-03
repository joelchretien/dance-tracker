/**
 * Captures the `beforeinstallprompt` event so we can offer a native install
 * button to Android/Chrome/Edge users, and detects iOS Safari (which has
 * no install API — the user has to do Share → Add to Home Screen by hand).
 *
 * Key design decisions:
 *
 * - Module-level capture. The browser fires `beforeinstallprompt` once at
 *   page load, so a listener attached after that point misses it. This
 *   module attaches at import time, before any Vue component mounts.
 *
 * - Reactive refs. The composable hands back refs the way Vue expects;
 *   the module-level state is a plain Vue `ref` so reactivity flows
 *   through to templates.
 *
 * - Standalone detection. `display-mode: standalone` covers Android +
 *   desktop PWAs; `navigator.standalone` is iOS-specific. Both are
 *   probed and the union returned.
 *
 * - Persistent dismissal. The banner respects a localStorage flag
 *   (`dt:installNudgeDismissed`). The Settings entry ignores that flag
 *   so the user can always re-trigger from there.
 */
import { ref, computed, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Module-level state — captured once, shared across all consumers.
const deferredPrompt: Ref<BeforeInstallPromptEvent | null> = ref(null)
const installed = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
  })

  // Fires when the user accepts a native install prompt or installs from
  // the browser's own UI. We hide the nudge in either case.
  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
    installed.value = true
  })
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPad on iOS 13+ reports as Mac; check touch points to disambiguate.
  const ua = navigator.userAgent
  const isIPhone = /iPhone|iPod/.test(ua)
  const isIPadOS = ua.includes('Mac') && navigator.maxTouchPoints > 1
  return isIPhone || isIPadOS
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // matchMedia is the cross-browser path; navigator.standalone is the
  // iOS-only fallback that pre-dates display-mode media queries.
  const mq = window.matchMedia?.('(display-mode: standalone)')
  if (mq?.matches) return true
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return navStandalone === true
}

const isIOS = detectIOS()
const isStandalone = ref(detectStandalone())

// Listen for changes to display-mode (e.g., user installs while the app
// is open). Updates the standalone flag so the banner disappears live.
if (typeof window !== 'undefined') {
  const mq = window.matchMedia?.('(display-mode: standalone)')
  mq?.addEventListener?.('change', (e) => {
    isStandalone.value = e.matches
  })
}

export function useInstallPrompt() {
  const dismissed = useLocalStorage<boolean>('dt:installNudgeDismissed', false)

  /** Native prompt available right now (Android/Chrome/Edge with engagement). */
  const canPromptNatively = computed(() => deferredPrompt.value !== null)

  /** Anything the user could do to install — native button OR iOS instructions. */
  const canInstall = computed(
    () => !isStandalone.value && !installed.value && (canPromptNatively.value || isIOS),
  )

  /** Should the auto-banner be shown? Layered on top of canInstall. */
  const shouldShowBanner = computed(() => canInstall.value && !dismissed.value)

  /**
   * Trigger the native install prompt. No-op on iOS (the caller should
   * surface instructions instead). Returns the user's choice when known.
   */
  async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const ev = deferredPrompt.value
    if (!ev) return 'unavailable'
    deferredPrompt.value = null // Chrome only allows one prompt() per event
    await ev.prompt()
    const { outcome } = await ev.userChoice
    return outcome
  }

  function dismissBanner() {
    dismissed.value = true
  }

  /** Settings entry uses this to re-show the banner after dismissal. */
  function resetDismissal() {
    dismissed.value = false
  }

  return {
    canInstall,
    canPromptNatively,
    shouldShowBanner,
    isIOS,
    isStandalone,
    triggerNativeInstall,
    dismissBanner,
    resetDismissal,
  }
}
