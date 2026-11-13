// Permite que la app abra sin internet. Cambie VERSION al publicar cambios.
const VERSION = 'tienda-v3';
const ARCHIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'catalogo.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Primero intenta internet (para recibir actualizaciones); si no hay, usa lo guardado.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
