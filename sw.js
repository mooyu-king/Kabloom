/* 版本与文件名单由静态构建生成。 */
const cacheName = "kabloom-static-c0376d9cd96f95";
const precache = ["/about/","/contact/","/images/kabloom-guide-ladder.webp","/images/kabloom-guide-prompt.webp","/images/kabloom-guide-results.webp","/images/kabloom-guide-spent.webp","/images/kabloom-icon-192.png","/images/kabloom-icon-512.png","/images/kabloom-logo.svg","/images/kabloom-logo.webp","/images/kabloom-sky-climb-cover.webp","/","/manifest.webmanifest","/offline.html","/privacy/","/scores.mjs","/site.css","/site.mjs","/terms/"];
const allowed = new Set(precache);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(precache.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith('kabloom-static-') && key !== cacheName).map(key => caches.delete(key)))
  ));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(cacheName);
      return await cache.match(url.pathname) ?? cache.match('/offline.html');
    }));
  } else if (allowed.has(url.pathname) && !url.search) {
    event.respondWith(caches.open(cacheName).then(async cache =>
      await cache.match(request) ?? fetch(request)
    ));
  }
});
