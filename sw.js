// delivery-dashboard/sw.js
const CACHE_NAME = 'deldash-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/super-admin.html',
  '/dispatcher.html',
  '/delivery-man.html',
  '/customer.html',
  '/css/main.css',
  '/css/super-admin.css',
  '/css/dispatcher.css',
  '/css/delivery-man.css',
  '/css/customer.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/data-loader.js',
  '/js/notification-simulator.js',
  '/js/map-utils.js',
  '/js/live-tracking.js',
  '/js/driver-assignment.js',
  '/js/analytics.js',
  '/js/user-management.js',
  '/js/delivery-proof.js',
  '/js/route-map.js',
  '/js/settings.js',
  '/js/notifications.js',
  '/lib/leaflet.js',
  '/lib/leaflet.css',
  '/lib/chart.min.js',
  '/data/orders.json',
  '/data/users.json',
  '/data/vehicles.json',
  '/data/routes.json',
  '/data/notifications.json',
  '/data/settings.json',
  '/data/delivery-proofs.json',
  '/data/driver-assignments.json',
  '/data/tracking-events.json',
  '/data/analytics-data.json',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          // Don't cache non-GET or non-same-origin requests
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(error => {
          // Fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw error;
        });
      })
  );
});
