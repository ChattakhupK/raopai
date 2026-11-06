// RaoPai service worker — offline viewing of the app shell, map tiles, photos and the last place list.
const VERSION = "v3";
const SHELL = `raopai-shell-${VERSION}`;
const RUNTIME = `raopai-runtime-${VERSION}`;
const TILES = "raopai-tiles";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/"]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => (k.startsWith("raopai-") || k.startsWith("memomap-")) && ![SHELL, RUNTIME, TILES].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(req, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") {
    cache.put(req, res.clone());
    if (maxEntries) {
      cache.keys().then((keys) => {
        if (keys.length > maxEntries) cache.delete(keys[0]);
      });
    }
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "tile.openstreetmap.org") {
    event.respondWith(cacheFirst(req, TILES, 1500));
    return;
  }
  if (url.hostname === "res.cloudinary.com") {
    event.respondWith(cacheFirst(req, RUNTIME, 400));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/")) {
    event.respondWith(cacheFirst(req, SHELL));
    return;
  }
  if (url.pathname === "/api/places") {
    event.respondWith(networkFirst(req, RUNTIME));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(
      networkFirst(req, SHELL).catch(() => caches.match("/"))
    );
  }
});
