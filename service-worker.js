const CACHE = "club-money-order-v8";
const ASSETS = ["./", "./index.html", "./styles.css", "./src/app.mjs", "./src/calculations.mjs", "./src/presentation.mjs", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
