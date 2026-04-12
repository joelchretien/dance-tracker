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
  navigator.serviceWorker.register('/dance-tracker/sw.js').then(reg => {
    // Check for updates every 60 seconds
    setInterval(() => reg.update(), 60_000)

    // When a new SW takes over, reload to get the latest version
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}
