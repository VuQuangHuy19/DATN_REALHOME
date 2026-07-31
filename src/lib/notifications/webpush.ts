/**
 * Web Push Notification Utility for Browser Notifications
 * Uses VAPID Keys and Service Worker sw.js
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[WebPush] Service Worker registered successfully');
    return registration;
  } catch (err) {
    console.error('[WebPush] Service Worker registration failed:', err);
    return null;
  }
}

export async function subscribeToWebPush(publicVapidKey?: string): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[WebPush] Notification permission denied by user');
    return null;
  }

  const registration = await registerServiceWorker();
  if (!registration) return null;

  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    const vapidKey = publicVapidKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-m9GYv540N_VOF3p81-p85i-W322';
    
    // Convert VAPID key to Uint8Array
    const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray,
    });

    return subscription;
  } catch (err) {
    console.error('[WebPush] Subscription error:', err);
    return null;
  }
}
