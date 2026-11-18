// The old address's service worker, replaced: phones that installed Control Center here get this one, which
// deletes the old stored files and removes itself, so the "moved" page shows instead of the old app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
