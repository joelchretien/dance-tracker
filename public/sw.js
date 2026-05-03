const CACHE_NAME = 'dance-tracker-v41'

/**
 * Only cache successful, basic-type responses. Without this guard, a
 * transient 404 or 500 (auditorium WiFi captive portal, GitHub Pages
 * deploy mid-flight, server hiccup) gets persisted into the app cache,
 * and the SW then happily serves the bad response forever — the cache-
 * first / SWR fallback paths return whatever was last put.
 *
 * Cache writes are best-effort: if cache.put throws (storage pressure,
 * browser eviction, opaque implementation limits), the network response
 * is still returned to the app. A failed cache write should not turn a
 * successful network fetch into a failed fetch.
 */
async function cacheIfOk(request, response) {
  if (response && response.ok && response.type === 'basic') {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    } catch {
      // Cache is opportunistic; preserve the network response for the app.
    }
  }
  return response
}

self.addEventListener('install', () => {
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

  // Hashed assets (JS/CSS with content hashes): cache-first (immutable).
  // Vite emits base64-style hashes like `index-99YY4e3X.js`, not pure hex,
  // so the character class accepts mixed-case alphanumerics. (The earlier
  // pattern `[a-f0-9]+` only matched hex hashes and silently fell through
  // to the network-first catch-all for every real Vite asset — caching
  // was effectively disabled for the immutable bundle.)
  if (url.pathname.match(/\/assets\/.*-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|ttf|otf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => cacheIfOk(event.request, response))
      })
    )
    return
  }

  // Schedule manifest: network-first. The manifest determines which
  // schedules are available; SWR-serving an outdated copy on first load
  // delays visibility of newly added or removed schedules. This branch
  // must precede the schedule-data branch since the regex below would
  // otherwise match index.json too.
  if (url.pathname.endsWith('/schedules/index.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => cacheIfOk(event.request, response))
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Schedule JSON: stale-while-revalidate. The schedule almost never
  // changes during a competition, but the auditorium WiFi often does
  // 30-second pending fetches. Returning the cached copy immediately
  // and updating in the background keeps the app responsive even on
  // flaky networks.
  //
  // event.waitUntil ties the revalidation to the SW lifecycle so the
  // browser can't terminate the worker before the refresh completes —
  // without it, the revalidation in the cached-hit path was best-effort
  // and could be killed mid-flight.
  if (url.pathname.match(/\/schedules\/[^/]+\.json$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkPromise = fetch(event.request)
          .then(response => cacheIfOk(event.request, response))
          .catch(() => cached) // if network fails and we had cache, use it
        if (cached) {
          // Refresh in the background; suppress errors so a failed
          // refresh can't reject the waitUntil promise.
          event.waitUntil(networkPromise.catch(() => undefined))
          return cached
        }
        return networkPromise
      })
    )
    return
  }

  // Everything else (manifest icons, etc): network-first
  event.respondWith(
    fetch(event.request)
      .then(response => cacheIfOk(event.request, response))
      .catch(() => caches.match(event.request))
  )
})
