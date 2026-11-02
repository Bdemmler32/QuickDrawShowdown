/* Quick Draw Showdown service worker.
   Bump VERSION together with APP_VERSION in index.html to ship a release. */
const VERSION = '0.02';
const APP = 'quickdraw';
const SHELL_CACHE = `${APP}-${VERSION}`;
const CDN_CACHE = `${APP}-cdn`;      // pinned libraries: kept across versions
const FONT_CACHE = `${APP}-fonts`;   // web-font CSS and files: kept across versions

// App shell, relative to this file so the app works from any folder.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Exact, version-pinned CDN URLs (none today: the game has no third-party libraries).
const CDN = [];

const FONT_CSS_HOSTS = ['fonts.googleapis.com'];
const FONT_FILE_HOSTS = ['fonts.gstatic.com'];

const abs = u => new URL(u, self.registration.scope).href;
const SHELL_URLS = new Set(SHELL.map(abs));
const CDN_URLS = new Set(CDN);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Each file is fetched fresh (?v= busts any HTTP cache, cache:'reload' skips the browser cache)
    // and stored under its clean URL. One failure fails the install, so a release is all-or-nothing.
    await Promise.all(SHELL.map(async path => {
      const clean = abs(path);
      const busted = new URL(clean); busted.searchParams.set('v', VERSION);
      const res = await fetch(busted.href, {cache:'reload'});
      if (!res.ok) throw new Error(`Precache failed for ${path}: ${res.status}`);
      await cache.put(clean, res);
    }));
    // Pinned CDN files: best effort, never blocks the install.
    if (CDN.length){
      const cdn = await caches.open(CDN_CACHE);
      await Promise.all(CDN.map(async url => {
        try {
          if (await cdn.match(url)) return;
          const res = await fetch(url, {mode:'cors', cache:'reload'});
          if (res.ok) await cdn.put(url, res);
        } catch (e) {}
      }));
    }
    // No skipWaiting here: the page asks for it when the player taps Update.
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith(`${APP}-`) && k !== SHELL_CACHE && k !== CDN_CACHE && k !== FONT_CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App shell: cache-first from this version's cache only.
  if (url.origin === self.location.origin){
    const clean = url.origin + url.pathname;
    if (SHELL_URLS.has(clean) || req.mode === 'navigate'){
      event.respondWith((async () => {
        const cache = await caches.open(SHELL_CACHE);
        const hit = await cache.match(clean) || (req.mode === 'navigate' ? await cache.match(abs('./')) : null);
        return hit || fetch(req);
      })());
    }
    return;   // anything else on our origin goes to the network
  }

  // Pinned CDN libraries: cache-first, persistent across versions.
  if (CDN_URLS.has(req.url)){
    event.respondWith((async () => {
      const cache = await caches.open(CDN_CACHE);
      const hit = await cache.match(req.url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req.url, res.clone());
      return res;
    })());
    return;
  }

  // Web-font CSS: stale-while-revalidate.
  if (FONT_CSS_HOSTS.includes(url.hostname)){
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  // Font files are immutable once referenced: cache-first.
  if (FONT_FILE_HOSTS.includes(url.hostname)){
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })());
  }
  // Everything else: network (default browser behaviour).
});
