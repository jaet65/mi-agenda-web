const CACHE_NAME = "tracksim-v1";
const ASSETS = [
  "/", 
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  // Las librerías externas ahora son parte del bundle de Vite, 
  // así que Vite se encarga de su versión y caché.
];

// 1. Instalación: Cachear recursos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Activación: Limpiar cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// 3. Fetch: Estrategia Stale-While-Revalidate (Usa caché, pero actualiza en segundo plano)
self.addEventListener("fetch", (event) => {
  // Ignorar peticiones que no sean GET o que sean a la API de Firestore/Google
  if (event.request.method !== "GET" || event.request.url.includes("firestore") || event.request.url.includes("googleapis")) {
    return;
  }

  // La estrategia Stale-While-Revalidate tiene dos partes:
  // 1. Responde inmediatamente con lo que haya en caché (si existe).
  // 2. Mientras tanto, realiza una petición a la red para obtener la versión más reciente y actualizar la caché para la próxima vez.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Inicia la petición a la red para actualizar el caché en segundo plano.
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Si la petición a la red es exitosa, la guardamos en caché.
            // Es crucial clonar la respuesta aquí, porque se va a usar dos veces:
            // 1. Para guardarla en la caché.
            // 2. Para devolverla al navegador.
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(err => {
            // Si la petición de red falla, no hacemos nada y el navegador usará la respuesta de caché si existe.
            console.warn(`[SW] Fetch failed for ${event.request.url}; returning cached response if available.`, err);
            return cachedResponse; // Devuelve la respuesta de caché si la red falla.
          });

        // Devolvemos la respuesta del caché inmediatamente si existe, si no, esperamos la respuesta de la red.
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// --- MANEJO DE NOTIFICACIONES PUSH ---

// 4. Escuchar el evento 'push' (cuando el servidor envía una notificación)
self.addEventListener("push", (event) => {
  // El servidor (o la app cliente) nos envía los datos de la notificación en formato JSON
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Agenda TrackSIM";
  const options = {
    body: data.body, // Usar el icono enviado o uno por defecto
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png", // Icono para la barra de notificaciones en Android
    data: {
      url: data.url || "/" // URL a la que se navegará al hacer clic
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Escuchar el clic en la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // Cierra la notificación
  event.waitUntil(clients.openWindow(event.notification.data.url)); // Abre la app o la URL especificada
});