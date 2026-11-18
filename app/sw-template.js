// Control Center's service worker. The build (app/vite.config.ts, plugin "service-worker") writes it to sw.js
// with __VERSION__ and __FILES__ filled in: every file of this build, stored on the device at install, so the app
// (key making above all) works without internet from the first visit. When online, the page is fetched fresh;
// a new deploy is a new version, which replaces the old files. Nothing else goes through here: the app's only
// other requests are to Control, which this never stores.
//
// Notifications: Control sends an empty push when a client asks for a license or sends a store inquiry; this shows
// a fixed notice (the push carries no content, so the push service learns nothing) and opens the app on a tap.
const CACHE = 'control-center-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (e) => {
  // 'reload': straight from the server, never a stale copy the browser kept.
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // The page: fresh when online (a new deploy shows), stored copy when not.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html', { ignoreSearch: true }).then((r) => r || caches.match('./'))));
    return;
  }
  // The build's files never change under the same name (hashed): stored copy first.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || fetch(e.request)));
});

self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('Control Center', {
    body: 'A client is waiting: a license request or a store inquiry. Open the app.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'control',
    renotify: true,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => {
    const app = open.find((c) => c.url.startsWith(self.registration.scope));
    return app ? app.focus() : self.clients.openWindow('./');
  }));
});
