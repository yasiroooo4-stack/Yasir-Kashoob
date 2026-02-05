// Service Worker for Employee Tracking App
const CACHE_NAME = 'employee-tracking-v1';
const urlsToCache = [
  '/employee-app',
  '/logo192.png',
  '/logo512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Background sync for location
self.addEventListener('sync', (event) => {
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocation());
  }
});

async function syncLocation() {
  const pendingLocations = await getPendingLocations();
  for (const location of pendingLocations) {
    try {
      await fetch('/api/tracking/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location)
      });
    } catch (error) {
      console.log('Failed to sync location:', error);
    }
  }
}

async function getPendingLocations() {
  // This would read from IndexedDB in a real implementation
  return [];
}
