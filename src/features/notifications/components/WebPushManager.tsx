'use client';

import { useState, useEffect } from 'react';

/**
 * Chuyển đổi VAPID public key thành dạng Uint8Array cho trình duyệt
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function WebPushManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra xem trình duyệt có hỗ trợ service worker và push manager không
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      // Đăng ký service worker nếu chưa có
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[WebPush] Lỗi kiểm tra subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function subscribeToPush() {
    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.ready;

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        alert('Thiếu cấu hình VAPID key. Vui lòng liên hệ admin.');
        setIsLoading(false);
        return;
      }

      // Xin quyền và tạo subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Gửi subscription lên server để lưu vào DB
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Lỗi từ server khi lưu đăng ký');
      }

      setIsSubscribed(true);
      alert('Đã bật thông báo thành công!');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        alert('Bạn đã chặn thông báo từ trang web này. Hãy mở cài đặt trình duyệt để cấp lại quyền.');
      } else {
        console.error('[WebPush] Lỗi đăng ký thông báo:', error);
        alert('Có lỗi xảy ra khi đăng ký thông báo.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return <span className="text-xs text-gray-400">Trình duyệt không hỗ trợ Push</span>;
  }

  if (isLoading) {
    return <span className="text-xs text-gray-500">Đang kiểm tra...</span>;
  }

  if (isSubscribed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>
        Đã bật thông báo
      </span>
    );
  }

  return (
    <button
      onClick={subscribeToPush}
      className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
      Bật thông báo
    </button>
  );
}
