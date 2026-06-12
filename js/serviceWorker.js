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
 * Install handler: opens the versioned cache and stores every asset listed in
 * ASSETS (forcing a fresh network fetch), then activates the new worker
 * immediately via skipWaiting.
 * @param {ExtendableEvent} event - The service worker install event.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
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
 * Non-GET requests, cross-origin requests, and dynamic data endpoints
 * (paths containing '/data/' or query strings referencing '.data', '.db', or
 * '.post') are passed through untouched.
 * @param {FetchEvent} event - The service worker fetch event.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/data/')) return;
  if (url.search.includes('.data') || url.search.includes('.db') || url.search.includes('.post')) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(event.request))
      .catch(() => event.request.mode === 'navigate' ? caches.match('./') : undefined)
  );
});
