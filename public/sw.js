// Hand-written service worker (no Workbox) — @vite-pwa/astro doesn't build
// on this Astro 7 / Vite 8 combo yet (see design.md). Bump CACHE_VERSION when
// the caching strategy below changes, to force old caches to be dropped.
const CACHE_VERSION = "filmo-v1";
const TMDB_IMAGE_CACHE = `${CACHE_VERSION}-tmdb-images`;
const API_CACHE = `${CACHE_VERSION}-api`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const CURRENT_CACHES = [TMDB_IMAGE_CACHE, API_CACHE, PAGE_CACHE, ASSET_CACHE];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, timeoutMs = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      ),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Offline and not cached");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // A page you've already opened stays available offline afterward.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // TMDB posters/photos don't change once published — cache aggressively.
  if (url.hostname === "image.tmdb.org") {
    event.respondWith(cacheFirst(request, TMDB_IMAGE_CACHE));
    return;
  }

  // Our own TMDB proxy — fresh when online, last-seen data when offline.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Same-origin static assets (JS/CSS/icons).
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
