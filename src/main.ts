import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './main.css'

const app = createApp(App)
app.use(createPinia())
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

  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(reg => {
    // Check for updates every 60 seconds
    setInterval(() => reg.update(), 60_000)

    // When a new SW takes over, reload to get the latest version — but
    // only if we were already controlled (i.e. this is an update, not
    // the first install).
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
