import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import { useUiStore } from './stores/ui'
import './main.css'

const app = createApp(App)
const pinia = createPinia()
// Make pinia active before any store call in this module. app.use(pinia)
// already does this internally, but stating it explicitly here makes the
// useUiStore() call below correct regardless of Pinia internals — and
// satisfies the rule of thumb 'don't call useStore() outside setup unless
// you know setActivePinia is in effect'.
setActivePinia(pinia)
app.use(pinia)
app.use(router)
app.mount('#app')

// Register service worker for offline support + cache busting
if ('serviceWorker' in navigator) {
  // Capture the controller BEFORE registering. controllerchange fires on
  // every controller transition, including the very first install
  // (null → first SW). Reloading on first install causes a flash + reload
  // for new visitors, which on a flaky auditorium connection is the worst
  // possible time. We only want to reload when an UPDATE takes over a
  // page that was already controlled.
  const hadController = navigator.serviceWorker.controller !== null
  const ui = useUiStore()

  /**
   * When a new SW reaches the 'waiting' state, surface an opt-in banner
   * rather than reloading mid-tracking. The user applies the update via
   * Settings → Update available, which sends SKIP_WAITING and lets the
   * controllerchange handler perform the reload.
   *
   * Auto-reload was the previous behavior; the regression risk during a
   * live competition (interrupted scroll, transient UI lost, momentary
   * flash) outweighs the freshness benefit of an instant takeover.
   */
  function watchForWaiting(reg: ServiceWorkerRegistration) {
    if (!hadController) return // First-install path: no waiting state to honor.

    // A worker may already be waiting if the page navigated to an updated
    // tab — handle that case immediately.
    if (reg.waiting) {
      ui.updateAvailable = true
      ui.applyUpdate = () => reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
    }

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          ui.updateAvailable = true
          ui.applyUpdate = () => installing.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })
  }

  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(reg => {
    watchForWaiting(reg)
    // Check for updates every 60 seconds; the banner handles activation.
    setInterval(() => reg.update(), 60_000)

    // When the new SW takes over (because the user opted in), reload to
    // pick up the new bundle. The check on hadController guards against
    // first-install reload loops on new visitors.
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }).catch(err => {
    console.error('Service worker registration failed:', err)
  })
}
