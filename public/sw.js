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
  //sólo intercepto GET: reenviar un POST (ej. el login) a través del service
  //worker con fetch(event.request) puede romper el body del request en
  //android, así que para todo lo que no sea GET dejo pasar sin tocar nada
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
