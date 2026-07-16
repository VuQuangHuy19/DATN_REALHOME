import webpush from 'web-push';
import { deleteSubscription, PushSubscriptionRow } from './push-subscriptions';

// Cấu hình VAPID keys từ biến môi trường
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
let vapidSubject = process.env.NEXT_PUBLIC_SITE_URL || 'mailto:admin@example.com';
if (!vapidSubject.startsWith('https:') && !vapidSubject.startsWith('mailto:')) {
  vapidSubject = 'mailto:admin@example.com';
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('[WebPush] VAPID keys chưa được cấu hình trong .env.local');
}

export async function sendWebPushNotification(
  subscriptionRow: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  const pushSubscription = {
    endpoint: subscriptionRow.endpoint,
    keys: {
      p256dh: subscriptionRow.p256dh,
      auth: subscriptionRow.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: {
          url: payload.url || '/',
        },
      })
    );
    return true; // Gửi thành công
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // 410 Gone / 404 Not Found: Client đã huỷ đăng ký hoặc hết hạn ở phía trình duyệt
      console.log(`[WebPush] Subscription hết hạn, đang xoá: ${subscriptionRow.endpoint}`);
      await deleteSubscription(subscriptionRow.endpoint);
    } else {
      console.error('[WebPush] Lỗi gửi thông báo:', error);
    }
    return false; // Gửi thất bại
  }
}
