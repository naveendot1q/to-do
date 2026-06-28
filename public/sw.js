const CACHE = 'naveenos-v3';
const STATIC = ['/', '/login', '/manifest.json'];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.destination === 'document') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(c => c || caches.match('/')))
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});

// ── SCHEDULED TASKS STATE ─────────────────────────────────────────────────────
// Stored as: { id, title, start_time, end_time, priority, due_date }
let todayTasks = [];
let currentTaskId = null;
let statusInterval = null;

// ── MESSAGE HANDLER ───────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  const { type } = e.data || {};

  // Main thread sends full task list every minute
  if (type === 'SYNC_TASKS') {
    todayTasks = e.data.tasks || [];
    schedulePendingNotifications();
    updateStatusNotification();
  }

  // One-off notification (legacy support)
  if (type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `task-${Date.now()}`,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: '/' },
      });
    }, delay);
  }

  // Clear all notifications
  if (type === 'CLEAR_STATUS') {
    self.registration.getNotifications().then(notifs => notifs.forEach(n => n.close()));
    if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
  }
});

// ── SCHEDULE FUTURE TASK NOTIFICATIONS ───────────────────────────────────────
const scheduledKeys = new Set();

function schedulePendingNotifications() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  todayTasks.forEach(task => {
    if (!task.start_time || task.completed) return;
    const [h, m] = task.start_time.split(':').map(Number);
    const startMins = h * 60 + m;

    // Notify 5 min before start
    const notifyMins = startMins - 5;
    const key5 = `${task.id}-5min`;
    if (!scheduledKeys.has(key5) && notifyMins > nowMins && notifyMins - nowMins < 1440) {
      scheduledKeys.add(key5);
      const delay = (notifyMins - nowMins) * 60 * 1000;
      setTimeout(() => {
        self.registration.showNotification(`⏰ Starting in 5 min: ${task.title}`, {
          body: `Starts at ${fmtTime(h, m)} · Get ready!`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: key5,
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
          data: { url: '/' },
          actions: [
            { action: 'open', title: '▶ Open App' },
            { action: 'dismiss', title: 'Dismiss' },
          ],
        });
      }, delay);
    }

    // Notify AT start time
    const keyStart = `${task.id}-start`;
    if (!scheduledKeys.has(keyStart) && startMins > nowMins && startMins - nowMins < 1440) {
      scheduledKeys.add(keyStart);
      const delay = (startMins - nowMins) * 60 * 1000;
      const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      setTimeout(() => {
        self.registration.showNotification(`${priorityIcon} Now: ${task.title}`, {
          body: `Task started at ${fmtTime(h, m)}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: keyStart,
          requireInteraction: false,
          vibrate: [200, 100, 200],
          data: { url: '/' },
        });
      }, delay);
    }

    // Notify if task is overdue (past end_time and not completed)
    if (task.end_time) {
      const [eh, em] = task.end_time.split(':').map(Number);
      const endMins = eh * 60 + em;
      const keyOverdue = `${task.id}-overdue`;
      if (!scheduledKeys.has(keyOverdue) && endMins > nowMins && endMins - nowMins < 1440) {
        scheduledKeys.add(keyOverdue);
        const delay = (endMins - nowMins) * 60 * 1000;
        setTimeout(async () => {
          // Only show if task is still incomplete (check client)
          self.registration.showNotification(`⚠️ Overdue: ${task.title}`, {
            body: `Was due at ${fmtTime(eh, em)} · Mark complete?`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: keyOverdue,
            requireInteraction: true,
            vibrate: [500, 200, 500],
            data: { url: '/' },
          });
        }, delay);
      }
    }
  });
}

// ── LIVE STATUS NOTIFICATION (always-on in notification bar) ─────────────────
function updateStatusNotification() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Find current running task
  const running = todayTasks.find(t => {
    if (t.completed || !t.start_time || !t.end_time) return false;
    const [sh, sm] = t.start_time.split(':').map(Number);
    const [eh, em] = t.end_time.split(':').map(Number);
    return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
  });

  // Find next upcoming task
  const upcoming = todayTasks
    .filter(t => !t.completed && t.start_time)
    .map(t => { const [h, m] = t.start_time.split(':').map(Number); return { ...t, startMins: h * 60 + m }; })
    .filter(t => t.startMins > nowMins)
    .sort((a, b) => a.startMins - b.startMins)[0];

  // Pending (not done, no time)
  const pendingCount = todayTasks.filter(t => !t.completed).length;
  const doneCount    = todayTasks.filter(t => t.completed).length;

  let title = '📋 Naveen\'s OS';
  let body  = '';

  if (running) {
    const [eh, em] = running.end_time.split(':').map(Number);
    const minsLeft = eh * 60 + em - nowMins;
    title = `▶ ${running.title}`;
    body  = `In progress · ends in ${minsLeft}min · ${doneCount}/${todayTasks.length} done today`;
  } else if (upcoming) {
    const [uh, um] = upcoming.start_time.split(':').map(Number);
    const minsUntil = uh * 60 + um - nowMins;
    title = `⏭ Next: ${upcoming.title}`;
    body  = `Starts in ${minsUntil}min · ${doneCount}/${todayTasks.length} done today`;
  } else if (pendingCount > 0) {
    title = `📋 ${pendingCount} task${pendingCount > 1 ? 's' : ''} pending`;
    body  = `${doneCount}/${todayTasks.length} done today`;
  } else if (todayTasks.length > 0) {
    title = `✅ All done for today!`;
    body  = `${doneCount} tasks completed · Great work!`;
  } else {
    return; // No tasks, don't show
  }

  // Use a persistent notification with tag 'status' (replaces itself)
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'naveen-status',      // same tag = replaces previous
    renotify: false,           // don't buzz again on update
    silent: true,              // no sound on status updates
    requireInteraction: false,
    data: { url: '/' },
  });
}

// ── PERIODIC STATUS REFRESH ────────────────────────────────────────────────── 
// Update status notification every 5 minutes
self.addEventListener('periodicsync', e => {
  if (e.tag === 'status-update') {
    e.waitUntil(updateStatusNotification());
  }
});

// Fallback: update whenever SW receives a push
self.addEventListener('push', e => {
  e.waitUntil(updateStatusNotification());
});

// ── UTIL ─────────────────────────────────────────────────────────────────────
function fmtTime(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}
