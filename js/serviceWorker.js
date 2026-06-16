/**/

/*/

/**/
// begin code

/**
 * Service worker module for the svision application. It precaches the
 * application assets on install, removes stale caches on activation, and
 * serves GET requests from the cache (with a network fallback) while bypassing
 * dynamic data endpoints. The version and asset list are injected at build
 * time via the PHP placeholders below.
 */

const CACHE_PREFIX = self.registration.scope;
const CACHE_NAME = CACHE_PREFIX+'v'+'PHP_VERSION_PLACEHOLDER';
const ASSETS = [/* PHP_ASSETS_PLACEHOLDER */];

/**
 * Install handler: opens the versioned cache and stores each asset listed in
 * ASSETS individually (forcing a fresh network fetch). Caching is resilient —
 * a single failing asset is logged and skipped instead of aborting the whole
 * pre-cache — then the new worker activates immediately via skipWaiting.
 * @param {ExtendableEvent} event - The service worker install event.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(
        ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))
          .catch((error) => console.error('[sw] precache failed:', url, error)))
      ))
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate handler: deletes any previously stored caches that belong to this
 * scope but do not match the current CACHE_NAME, then takes control of all
 * open clients via clients.claim.
 * @param {ExtendableEvent} event - The service worker activate event.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX))
        .filter((name) => name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

/**
 * Fetch handler: serves cached responses for same-origin GET requests, falling
 * back to the network and, for navigation requests, to the cached root page.
 * On a cache miss the successful network response is also added to the cache
 * (runtime caching) so assets not covered by the pre-cache become available
 * offline after first use. Non-GET requests, cross-origin requests, and dynamic
 * data endpoints (paths containing '/data/' or query strings ending with
 * '.data', '.db', or '.post') are passed through untouched.
 * @param {FetchEvent} event - The service worker fetch event.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/data/')) return;
  if (url.search.endsWith('.data') || url.search.endsWith('.db') || url.search.endsWith('.post')) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }))
      .catch(() => event.request.mode === 'navigate' ? caches.match('./') : undefined)
  );
});
