// CDL Site Management — Service Worker v9.2
// Cache-first for app shell, network-first for API calls

const CACHE_NAME = "cdl-v9.2";

const APP_SHELL = [
  "/",
  "/index.html",
  "/config.js",
  "/data.js",
  "/app.js",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: delete old caches (force refresh from v9.0)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for APIs
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isAPI =
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("generativelanguage.googleapis.com") ||
    url.hostname.includes("emailjs.com") ||
    url.hostname.includes("groq.com");

  if (isAPI) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
