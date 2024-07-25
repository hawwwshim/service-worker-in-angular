const CACHE_NAME = 'my-cache-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const urlsToCache = [
  '/',
  '/assets/**',
  '/*.css',
  '/*.js'
];

const fileExtensionsToCache = [
  'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'woff2', 'woff', 'ttf', 'eot'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached files and update cache
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const fileExtension = requestUrl.pathname.split('.').pop();

  // Highlighted: Check for supported schemes before proceeding
  if (requestUrl.protocol.startsWith('http') && fileExtensionsToCache.includes(fileExtension)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          const fetchedResponse = fetch(event.request).then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });

            return networkResponse;
          });

          // If cached response is older than the cache duration, return the fetched response
          const cachedResponseDate = response.headers.get('date');
          if (cachedResponseDate && (new Date().getTime() - new Date(cachedResponseDate).getTime()) > CACHE_DURATION) {
            return fetchedResponse;
          }

          return response;
        }

        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        });
      })
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});
