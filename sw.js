// Keeps the License Maker working without internet: the app's few files are stored on the phone at
// the first visit and served from there. When online, a newer version is fetched in the background
// (past the browser's and GitHub's short-term caches) and the page reloads into it while locked
// (index.html, "controllerchange"). Nothing else goes through here: its only other requests are control.js's to the Control service.
//
// Notifications (Installs): Control sends an empty push when a client asks for a license; this shows a fixed
// notice (the push carries no content, so the push service learns nothing) and opens the app on a tap.
const CACHE = 'license-maker-v9';
const FILES = ['./', './index.html', './control.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

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
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    // By URL: a page request ("navigate") can't be copied with other cache settings.
    const fresh = fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});

self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('License Maker', {
    body: 'A client is waiting for a license. Open Installs.',
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
