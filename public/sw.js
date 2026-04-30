const CACHE_NAME = 'mytodo-v2';
const STATIC_ASSETS = ['/', '/login', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && e.request.destination === 'document') {
        caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
      }
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    if (list.length > 0) return list[0].focus();
    return clients.openWindow('/');
  }));
});

// Handle scheduled notifications from main thread
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `task-${Date.now()}`,
        requireInteraction: false,
        silent: false,
        data: { url: '/' },
        vibrate: [200, 100, 200],
      });
    }, delay);
  }
});
