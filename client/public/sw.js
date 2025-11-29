
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
  const options = {
    body: data.body || 'New offer available!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    image: data.image || '',
    data: {
      url: data.url || '/',
      timestamp: new Date().toISOString(),
      ...data
    },
    vibrate: [200, 100, 200],
    tag: data.tag || 'poppik-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'View Offer',
        icon: '/favicon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.png'
      }
    ],
    // Additional options for better UX
    badge: 'https://poppiklifestyle.com/favicon.png',
    timestamp: Date.now(),
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open with this URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
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
