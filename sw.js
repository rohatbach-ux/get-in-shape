// Offline-Cache für die App-Dateien. Bei Änderungen VERSION erhöhen.
const VERSION = "gis-v13"; // gleich APP_VERSION in js/app.js
const FILES = [
  "./",
  "index.html",
  "css/styles.css",
  "js/app.js",
  "js/recipes.js",
  "js/training.js",
  "js/exercises.js",
  "js/health.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (damit Updates ankommen), sonst Cache. „no-cache“ umgeht den
// HTTP-Cache des Browsers (GitHub Pages: 10 Min.), fragt aber per ETag nur kurz nach.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" })
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
