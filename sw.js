/* Service worker : rend l'application utilisable hors ligne.
   À CHAQUE MISE EN LIGNE, change VERSION (ex. partcalc-1.0.1) ET CONFIG.version dans index.html :
   c'est ce qui déclenche la mise à jour sur le téléphone. */
const VERSION = "partcalc-1.0.1";

// Fichiers de « coquille » mis en cache à l'installation (tout ce qu'il faut pour démarrer sans réseau).
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./data/taux.json", "./fonts/inter.woff2",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/icon-180.png"];

// Fichiers toujours relus sur le réseau d'abord (la page elle-même et les taux publiés, qui peuvent changer).
const FRESH = ["/index.html", "/data/taux.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  // supprime les caches des anciennes versions puis prend la main tout de suite
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // API GitHub, liens externes : réseau direct, jamais en cache

  const nav = req.mode === "navigate";
  if (nav || FRESH.some(p => url.pathname.endsWith(p))) {
    // RÉSEAU D'ABORD : version fraîche si en ligne, copie locale si hors ligne
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(nav ? "./index.html" : req, copy)); }
      return res;
    }).catch(() => caches.match(nav ? "./index.html" : req, { ignoreSearch: true })));
    return;
  }
  // CACHE D'ABORD pour le reste (police, icônes…) : rapide et hors ligne
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
