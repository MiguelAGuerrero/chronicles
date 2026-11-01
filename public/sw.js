// Chronicles' service worker (v1 slice 6, NT2, NT8): it shows the app's local
// notifications and hands a tap back to the app. No push, no caching, no
// network: everything stays on the device. The message and the URL it opens
// match src/lib/notify/webNotice.ts.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  n.close();
  const msg = { type: 'notice-response', id: n.tag, data: n.data || {}, action: event.action || null };
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((c) => c.url.startsWith(scope));
      if (open) {
        open.postMessage(msg);
        return open.focus();
      }
      // No window: open one carrying the tap, which the app reads once on load.
      const url = new URL(scope);
      url.searchParams.set('notice', JSON.stringify(msg));
      return self.clients.openWindow(url.href);
    })(),
  );
});
