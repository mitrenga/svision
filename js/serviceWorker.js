/**/

/*/

/**/
// begin code

const CACHE_PREFIX = self.registration.scope;
const CACHE_NAME = CACHE_PREFIX+'v'+'PHP_VERSION_PLACEHOLDER';
const ASSETS = [/* PHP_ASSETS_PLACEHOLDER */];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

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
