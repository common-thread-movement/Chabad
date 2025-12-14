/* sw.js */
const CACHE_NAME = "shabbat-wa-cache-v3";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.html",
  "./prep.html",
  "./learn.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don’t touch cross-origin (Chabad widget, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, then cache, then app.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("./app.html") || caches.match("./index.html");
        })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          if (resp.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match("./app.html"));
    })
  );
});
