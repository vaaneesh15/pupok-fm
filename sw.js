// sw.js – Service Worker для офлайн-доступа
const CACHE_NAME = 'pupok-fm-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',        // манифест
  './icon.svg',             // иконка
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-brands-400.woff2'
];

// Установка – кэшируем основные ресурсы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: кэширование ресурсов');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация – удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: удаление старого кэша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов – стратегия "сначала кэш, потом сеть"
self.addEventListener('fetch', event => {
  // Для навигационных запросов (переход по ссылке) отдаём index.html из кэша
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Для остальных ресурсов
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          // Кэшируем только успешные ответы с тех же источников (CDN)
          if (networkResponse && networkResponse.status === 200 && 
              (event.request.url.includes('cdnjs.cloudflare.com') || event.request.url.startsWith(self.location.origin))) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
  );
});
