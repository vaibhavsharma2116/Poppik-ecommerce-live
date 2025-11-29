
// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  // Handle different data formats
  let data = {};
  try {
    if (event.data) {
      const text = event.data.text();
      data = text.startsWith('{') ? JSON.parse(text) : { body: text };
    }
  } catch (error) {
    console.error('Error parsing push data:', error);
    data = { body: 'New notification from Poppik!' };
  }

  const title = data.title || 'Poppik Lifestyle';

  // Prefer icons/images sent in payload, fall back to site favicon
  const icon = data.icon || '/favicon.png';
  const badge = data.badge || '/favicon.png';
  const image = data.image || '';

  const options = {
    body: data.body || 'New offer available!',
    icon,
    badge,
    image,
    data: {
      url: data.url || '/',
      timestamp: new Date().toISOString(),
      ...data
    },
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'poppik-notification',
    requireInteraction: data.requireInteraction ?? false,
    renotify: data.renotify ?? true,
    actions: [
      {
        action: 'open',
        title: 'View Offer',
        icon: data.actionIcon || icon
      },
      {
        action: 'close',
        title: 'Close',
        icon: data.actionIcon || icon
      }
    ],
    // timestamps and sound/visual cues
    timestamp: Date.now(),
    silent: data.silent ?? false,
  };

  // If this is an offer notification, make it persistent and more visible
  const isOffer = (data.tag && data.tag.toString().toLowerCase().includes('offer')) || data.type === 'offer' || (data.url && data.url.toString().toLowerCase().includes('/offer'));
  if (isOffer) {
    options.requireInteraction = true;
    options.renotify = true;
    options.vibrate = data.vibrate || [300, 100, 400];
    // prefer large image and non-silent for offers
    options.silent = false;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // If user explicitly clicked 'close' action, just close
  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing tab with the same origin + path
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin);
            if (clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
              return client.focus();
            }
          } catch (e) {
            // fallback simple compare
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
        }

        // If no matching client found, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  event.waitUntil(
    // Resubscribe to push when subscription changes
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.applicationServerKey
    }).then((subscription) => {
      // Send new subscription to server
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
    })
  );
});

// Handle service worker messages from client
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
