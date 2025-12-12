/**
 * Push Notification Service
 * Handles service worker registration, subscription management, and notification setup
 */

// VAPID Public Key - Store in environment variable
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}

/**
 * Check if the browser supports notifications
 */
function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Register the service worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isNotificationSupported()) {
    throw new Error("Notifications are not supported on this device");
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    console.log("✅ Service Worker registered:", registration);
    return registration;
  } catch (error) {
    console.error("❌ Service Worker registration failed:", error);
    throw error;
  }
}

/**
 * Request notification permission from the browser
 */
async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error("Notifications are not supported on this device");
  }

  if (Notification.permission === "granted") {
    console.log("✅ Notification permission already granted");
    return "granted";
  }

  if (Notification.permission === "denied") {
    console.warn("⚠️ Notification permission was previously denied");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("📝 Notification permission response:", permission);
    return permission;
  } catch (error) {
    console.error("❌ Error requesting notification permission:", error);
    throw error;
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Subscribe to push notifications
 */
async function subscribeToPush(
  swRegistration: ServiceWorkerRegistration
): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("VAPID public key is not configured");
  }

  try {
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log("✅ Push subscription created:", subscription);
    return subscription.toJSON() as any;
  } catch (error) {
    console.error("❌ Push subscription failed:", error);
    throw error;
  }
}

/**
 * Send subscription to backend
 */
async function saveSubscriptionToBackend(
  subscription: PushSubscription,
  email?: string
): Promise<void> {
  try {
    // Use provided email or get from localStorage
    const finalEmail = email || (typeof window !== 'undefined' ? localStorage.getItem('notificationEmail') : null);
    
    console.log("📤 Saving subscription to backend with email:", finalEmail);
    console.log("📤 Subscription endpoint:", subscription.endpoint?.substring(0, 50) + "...");
    
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription,
        email: finalEmail,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend error response:", errorText);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Subscription saved to backend:", data);

    // Store subscription locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        "poppik_push_subscription",
        JSON.stringify(subscription)
      );
    }
  } catch (error) {
    console.error("❌ Failed to save subscription to backend:", error);
    throw error;
  }
}

/**
 * Get existing subscription
 */
async function getExistingSubscription(
  swRegistration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      console.log("✅ Found existing push subscription");
      return subscription.toJSON() as any;
    }
    return null;
  } catch (error) {
    console.error("❌ Error checking for existing subscription:", error);
    return null;
  }
}

/**
 * Main initialization function
 */
export async function initializePushNotifications(email?: string): Promise<boolean> {
  try {
    console.log("🚀 Initializing push notifications...");
    console.log("📧 Email provided:", email);

    // Check browser support
    if (!isNotificationSupported()) {
      console.warn("⚠️ Push notifications are not supported on this device");
      return false;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.warn("⚠️ Notification permission not granted, got:", permission);
      return false;
    }

    // Register service worker
    console.log("📝 Registering service worker...");
    const swRegistration = await registerServiceWorker();

    // Check for existing subscription
    console.log("📝 Checking for existing subscription...");
    let subscription = await getExistingSubscription(swRegistration);

    // If no existing subscription, create a new one
    if (!subscription) {
      console.log("📝 Creating new push subscription...");
      subscription = await subscribeToPush(swRegistration);
    }

    // Save/update subscription on backend with email
    console.log("📝 Saving subscription to backend...");
    await saveSubscriptionToBackend(subscription, email);

    console.log("✅ Push notifications fully initialized!");

    // Show test notification if permission was just granted
    if (Notification.permission === "granted") {
      showTestNotification();
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to initialize push notifications:", error);
    return false;
  }
}

/**
 * Show a test notification (for testing)
 */
export async function showTestNotification(): Promise<void> {
  try {
    const swRegistration = await navigator.serviceWorker.ready;

    const options: NotificationOptions = {
      body: "You've successfully enabled notifications from Poppik!",
      icon: "/favicon.png",
      badge: "/favicon.png",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      tag: "poppik-test",
      requireInteraction: false,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "View Offers",
          icon: "/favicon.png",
        },
        {
          action: "close",
          title: "Close",
          icon: "/favicon.png",
        },
      ],
      // Include a URL so clicking the notification opens the offer page
      data: {
        url: "/offer",
      },
    };

    await swRegistration.showNotification("Welcome to Poppik!", options);
    console.log("✅ Test notification sent");
  } catch (error) {
    console.error("❌ Failed to show test notification:", error);
  }
}

/**
 * Check current subscription status
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    if (!isNotificationSupported()) {
      return false;
    }

    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.getSubscription();

    return subscription !== null && Notification.permission === "granted";
  } catch (error) {
    console.error("❌ Error checking subscription status:", error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem("poppik_push_subscription");
      console.log("✅ Unsubscribed from push notifications");
    }
  } catch (error) {
    console.error("❌ Error unsubscribing from push notifications:", error);
  }
}

export type { PushSubscription };
