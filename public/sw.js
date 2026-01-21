const CACHE_NAME = 'tracksim-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 1. Instalación: Cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Activación: Limpiar cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// 3. Fetch: Estrategia Stale-While-Revalidate (Usa caché, pero actualiza en fondo)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que sean a la API de Firestore/Google
  if (event.request.method !== 'GET' || event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// --- MANEJO DE NOTIFICACIONES PUSH ---

// 4. Escuchar el evento 'push' (cuando el servidor envía una notificación)
self.addEventListener('push', (event) => {
  // El servidor (o la app cliente) nos envía los datos de la notificación en formato JSON
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Agenda TrackSIM';
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png', // Usar el icono enviado o uno por defecto
    badge: '/icon-192.png', // Icono para la barra de notificaciones en Android
    data: {
      url: data.url || '/' // URL a la que se navegará al hacer clic
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Escuchar el clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Cierra la notificación
  event.waitUntil(clients.openWindow(event.notification.data.url)); // Abre la app o la URL especificada
});