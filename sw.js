// MindOfTrader Service Worker v1.0
// Enables offline support and fast loading via cache-first strategy

const CACHE_NAME = 'mot-v1';
const STATIC_ASSETS = [
  '/',
  '/app',
  '/login',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Firebase/API calls: network only
// - Fonts/CDN: cache first
// - Pages: network first, fallback to cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Network-only for Firebase, API, analytics
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('yahoo.com') ||
    url.pathname.includes('/v1/') ||
    url.pathname.includes('firestore')
  ) {
    return; // let browser handle
  }

  // Cache-first for fonts and CDN assets
  if (
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for pages, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful page responses
        if (response.status === 200 && url.hostname === self.location.hostname) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background sync placeholder for offline trade logging
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trades') {
    // Handled by app.js — trades are queued in localStorage
    console.log('[SW] Background sync: trades');
  }
});
