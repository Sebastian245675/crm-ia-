// service-worker.js
// Este archivo debe colocarse en la carpeta public para que sea accesible desde la raíz

// Nombre y versión de la caché
const CACHE_NAME = 'regala-algo-cache-v1';

// Recursos que se cachearán durante la instalación
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo-nuevo.png',
  '/principio1.webp',
  '/principio2.webp',
  '/principio3.webp'
];

// Estrategia para el límite de caché
const CACHE_LIMIT = 100; // Número máximo de entradas en caché

// Evento de instalación - precachea recursos importantes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caché abierta');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Fuerza al SW nuevo a activarse inmediatamente
  );
});

// Evento de activación - limpia cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de todos los clientes
  );
});

// Evento fetch - estrategia de cacheo
self.addEventListener('fetch', (event) => {
  // Ignorar solicitudes no GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar solicitudes de análisis o API
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('google-analytics') ||
    url.pathname.includes('firebase') ||
    url.pathname.includes('analytics')
  ) {
    return;
  }
  
  // Estrategia para imágenes: cache-first con actualización en segundo plano
  if (
    event.request.destination === 'image' ||
    url.pathname.match(/\.(jpe?g|png|gif|webp|svg|ico)$/i)
  ) {
    event.respondWith(cacheFirstWithRefresh(event.request));
    return;
  }
  
  // Estrategia para HTML: network-first
  if (event.request.destination === 'document') {
    event.respondWith(networkFirstWithTimeout(event.request, 1500));
    return;
  }
  
  // Estrategia para JS/CSS: stale-while-revalidate
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  
  // Estrategia por defecto: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// Estrategia Cache First con actualización en segundo plano
async function cacheFirstWithRefresh(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Intentar obtener desde caché primero
  const cachedResponse = await cache.match(request);
  
  // Actualizar la caché en segundo plano
  const fetchAndCachePromise = fetch(request)
    .then(networkResponse => {
      // Solo cachear respuestas válidas
      if (networkResponse && networkResponse.ok && networkResponse.status < 400) {
        const clonedResponse = networkResponse.clone();
        // Actualizar en caché
        cache.put(request, clonedResponse);
        // Limitar tamaño de caché
        limitCacheSize(CACHE_NAME, CACHE_LIMIT);
      }
      return networkResponse;
    })
    .catch(err => {
      // Si la red falla, simplemente continuamos con la versión en caché
      console.log('Error en fetch, usando caché para:', request.url);
      // Importante: Retornar null explícitamente para evitar el error "Failed to convert value to 'Response'"
      return null;
    });
  
  // Si tenemos una respuesta en caché, la devolvemos inmediatamente
  if (cachedResponse) {
    // Aún así intentamos actualizar en segundo plano (pero sin esperar)
    fetchAndCachePromise.catch(() => {}); // Capturar cualquier error para evitar promesas no manejadas
    return cachedResponse;
  }
  
  try {
    // Si no hay caché, esperamos la respuesta de la red
    const networkResponse = await fetchAndCachePromise;
    if (networkResponse) return networkResponse;
    
    // Si network response es null, debemos devolver una respuesta por defecto
    return new Response('Not found', {status: 404, statusText: 'Not found'});
  } catch (error) {
    console.error('Error completo en la solicitud de red:', error);
    // Devolver una respuesta por defecto cuando todo falla
    return new Response('Network error', {status: 503, statusText: 'Network error'});
  }
}

// Estrategia Network First con timeout
async function networkFirstWithTimeout(request, timeout) {
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => {
      resolve(null);
    }, timeout);
  });
  
  // Intentar desde la red primero con un timeout
  try {
    const networkPromise = fetch(request);
    const race = await Promise.race([networkPromise, timeoutPromise]);
    
    // Si obtuvimos una respuesta real (no el timeout)
    if (race) {
      const networkResponse = await networkPromise;
      const cache = await caches.open(CACHE_NAME);
      // Cachear respuesta
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
  } catch (error) {
    console.log('Error de red, intentando caché para:', request.url);
  }
  
  // Si la red falló o timeout, intentar desde caché
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Si no hay caché, intentar de nuevo desde la red sin timeout
  return fetch(request);
}

// Estrategia Stale-While-Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Intentar obtener desde caché
  const cachedResponse = await cache.match(request);
  
  // Actualizar caché en segundo plano
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        // Limitar tamaño de caché
        limitCacheSize(CACHE_NAME, CACHE_LIMIT);
      }
      return networkResponse;
    })
    .catch(error => {
      console.log('Error actualizando caché:', error);
      return null;
    });
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const response = await fetchPromise;
  if (response) return response;
  
  return new Response('Not found', {status: 404, statusText: 'Not found'});
}

// Función para limitar el tamaño de la caché
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Eliminar los elementos más antiguos
    await cache.delete(keys[0]);
    // Llamar recursivamente para asegurar que no excedemos el límite
    limitCacheSize(cacheName, maxItems);
  }
}

// Manejo de mensajes para comunicación con la aplicación
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        ).then(() => {
          // Informar a la aplicación que la caché se limpió
          if (event.source) {
            event.source.postMessage({
              type: 'CACHE_CLEARED'
            });
          }
        });
      })
    );
  }
});
