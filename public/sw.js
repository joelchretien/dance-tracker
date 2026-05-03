const CACHE_NAME = 'dance-tracker-v41'

/**
 * Only cache successful, basic-type responses. Without this guard, a
 * transient 404 or 500 (auditorium WiFi captive portal, GitHub Pages
 * deploy mid-flight, server hiccup) gets persisted into the app cache,
 * and the SW then happily serves the bad response forever — the cache-
 * first / SWR fallback paths return whatever was last put.
 */
async function cacheIfOk(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait for old SW to finish
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the new SW takes over
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // HTML navigation requests: network-first (always check for updates)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => cacheIfOk(event.request, response))
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Hashed assets (JS/CSS with content hashes): cache-first (immutable)
  if (url.pathname.match(/\/assets\/.*\.[a-f0-9]+\./)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => cacheIfOk(event.request, response))
      })
    )
    return
  }

  // Schedule JSON: stale-while-revalidate. The schedule almost never
  // changes during a competition, but the auditorium WiFi often does
  // 30-second pending fetches. Returning the cached copy immediately
  // and updating in the background keeps the app responsive even on
  // flaky networks.
  if (url.pathname.match(/\/schedules\/[^/]+\.json$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkPromise = fetch(event.request)
          .then(response => cacheIfOk(event.request, response))
          .catch(() => cached) // if network fails and we had cache, use it
        return cached || networkPromise
      })
    )
    return
  }

  // Everything else (manifest, etc): network-first
  event.respondWith(
    fetch(event.request)
      .then(response => cacheIfOk(event.request, response))
      .catch(() => caches.match(event.request))
  )
})
