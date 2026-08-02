//service worker minimo: sin cache propio, sólo dejo pasar los requests a la red.
//existe para que chrome considere la app "instalable" de verdad (uno de los
//criterios es tener un service worker con fetch handler) en vez de crear
//sólo un acceso directo que abre el navegador. al no cachear nada, cada
//visita trae siempre la última versión deployada en vercel sin necesidad de
//reinstalar la app.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
