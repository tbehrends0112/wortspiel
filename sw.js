/* Service Worker: legt die App-Dateien im Cache ab, damit das Spiel offline läuft.
   Bei Änderungen an den Dateien CACHE_NAME hochzählen.

   Wichtig: Die Startseite wird nur als "./" gespeichert, nicht als "./index.html".
   Cloudflare leitet /index.html auf / um, und Safari verweigert Seiten, die der
   Service Worker aus einer Umleitung liefert ("Response served by service worker has
   redirections"). Zur Sicherheit werden Umleitungen beim Speichern außerdem entfernt. */
const CACHE_NAME = "wortspiel-v2";
const START_PAGE = "./";
const FILES = [
  START_PAGE,
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Eine Antwort, die über eine Umleitung kam, als "saubere" Antwort neu verpacken.
async function withoutRedirect(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        FILES.map(async (file) => {
          const response = await fetch(file, { cache: "reload" });
          if (!response.ok) throw new Error(`${file}: ${response.status}`);
          await cache.put(file, await withoutRedirect(response));
        })
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Seitenaufrufe (auch /index.html vom alten Home-Bildschirm-Symbol) bekommen immer die Startseite.
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match(START_PAGE).then((hit) => hit || fetch(event.request).then(withoutRedirect))
    );
    return;
  }

  // Alles andere: zuerst aus dem Cache, sonst aus dem Netz
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
