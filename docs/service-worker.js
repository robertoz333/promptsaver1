const CACHE_NAME = "pwa-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

// Installa il Service Worker e salva i file in cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Attiva il Service Worker e pulisci le vecchie cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
});

// Intercetta le richieste e risponde con la cache (offline support)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
