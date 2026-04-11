// TheBountyForge Service Worker
const CACHE_NAME = 'thebountyforge-v1';
const urlsToCache = [
    '/thebountyforge-mobile.html',
    '/thebountyforge-app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap'
];

// Install event — pre-cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Cache opened');
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch event — serve from cache, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});

// Activate event — clean up old caches
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
