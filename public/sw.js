// public/sw.js - VSM Service Worker
const CACHE_NAME = 'vsm-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/products.html',
    '/cart.html',
    '/css/style.css',
    '/js/app.js',
    '/images/logo.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Only cache GET requests, bypass API and admin
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
