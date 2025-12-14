/* sw.js */
const CACHE_VERSION = "shabbat-wa-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./prep.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_VERSION ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Same-origin requests: cache-first, then network, then offline fallback
// - Cross-origin (Chabad widget, etc.): network-only (don’t poison cache)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // Cross-origin => let the network handle it
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // Cache successful basic responses
          const copy = resp.clone();
          if (resp.ok && resp.type === "basic") {
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => {
          // Fallbacks
          if (req.mode === "navigate") return caches.match("./prep.html");
          return caches.match("./");
        });
    })
  );
});
