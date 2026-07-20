import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSubscriptionsByProfileId, getSubscriptionsByCompanyId } from '@/src/features/notifications/services/push-subscriptions';
import { sendWebPushNotification } from '@/src/features/notifications/services/web-push-sender';
import { sendEmail as sendEmailViaMailjet } from '@/lib/mail';
export type NotificationChannel = 'in_app' | 'push' | 'email';
// Đã bỏ 'sms' ra khỏi type vì yêu cầu để lại làm sau

export interface NotifyParams {
  companyId: string;
  recipientId?: string | null; // null = thông báo cho cả company (ví dụ: lead mới chưa gán)
  type: string;                // 'lead_new', 'appointment_new', v.v.
  title: string;
  message: string;
  link?: string;               // Đường dẫn khi user click vào thông báo
  channels?: NotificationChannel[]; // Mặc định: ['in_app']
  emailTo?: string;            // Bắt buộc nếu channels có 'email'
}

/**
 * Hàm gọi chung để tạo và gửi thông báo qua nhiều kênh.
 * Luôn chèn thông báo `in_app` vào DB (bảng notifications) trước.
 * Các kênh phụ (push, email) sẽ được gọi bất đồng bộ để không chặn luồng chính (không await).
 */
export async function notify(params: NotifyParams): Promise<void> {
  const {
    companyId,
    recipientId = null,
    type,
    title,
    message,
    link,
    channels = ['in_app'],
    emailTo
  } = params;

  // 1. LUÔN LUÔN ghi vào bảng `notifications` (kênh in_app là nền tảng)
  const { data: notification, error: dbError } = await supabaseAdmin
    .from('notifications')
    .insert({
      company_id: companyId,
      recipient_id: recipientId,
      title,
      body: message,
      type,
      link,
      channels,
      send_status: 'pending',
      is_read: false
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('[notify] Lỗi lưu thông báo in_app vào database:', dbError);
    // Nếu lưu in-app thất bại thì không gửi các kênh phụ (để tránh rác dữ liệu)
    return;
  }

  const notificationId = notification.id;

  // 2. Xử lý các kênh phụ BẤT ĐỒNG BỘ (không await)
  // Việc này đảm bảo client nhận response ngay lập tức (ví dụ: đặt lịch hẹn xong liền)
  const asyncTasks: Promise<void>[] = [];

  // 2.1 Kênh Web Push
  if (channels.includes('push')) {
    asyncTasks.push(
      sendWebPush(notificationId, companyId, recipientId, title, message, link)
    );
  }

  // 2.2 Kênh Email
  if (channels.includes('email') && emailTo) {
    asyncTasks.push(
      sendEmail(notificationId, emailTo, title, message)
    );
  }

  // Chạy các task phụ, log lỗi nếu có, không quăng lỗi ra ngoài
  Promise.allSettled(asyncTasks).then(results => {
    results.forEach(res => {
      if (res.status === 'rejected') {
        console.error('[notify] Kênh phụ gửi thất bại:', res.reason);
      }
    });
  });
}

// ============================================================================
// CÁC HÀM XỬ LÝ KÊNH PHỤ (Stub tạm, sẽ làm thật ở các bước tiếp theo B3/B4)
// ============================================================================

async function sendWebPush(
  notificationId: string,
  companyId: string,
  recipientId: string | null,
  title: string,
  body: string,
  link?: string
) {
  try {
    // 1. Lấy danh sách subscriptions
    let subscriptions = [];
    if (recipientId) {
      subscriptions = await getSubscriptionsByProfileId(recipientId);
    } else {
      // Gửi cho toàn bộ nhân sự trong công ty (trừ landlord/tenant)
      // Tạm thời lấy hết của company, vì push gửi nhiều không quá tốn kém
      subscriptions = await getSubscriptionsByCompanyId(companyId);
    }

    if (subscriptions.length === 0) {
      console.log(`[notify:push] Không có Web Push subscription nào cho thông báo ${notificationId}`);
      await updateNotificationStatus(notificationId, 'sent'); // Không có ai để gửi coi như xong
      return;
    }

    // 2. Gửi push cho từng thiết bị
    const pushPromises = subscriptions.map(sub => 
      sendWebPushNotification(sub, { title, body, url: link })
    );

    const results = await Promise.allSettled(pushPromises);
    const hasSuccess = results.some(r => r.status === 'fulfilled' && r.value === true);

    if (hasSuccess) {
      console.log(`[notify:push] Đã gửi push thành công cho notification ${notificationId}`);
      await updateNotificationStatus(notificationId, 'sent');
    } else {
      console.error(`[notify:push] Gửi push thất bại cho TẤT CẢ các thiết bị (notification ${notificationId})`);
      await updateNotificationStatus(notificationId, 'failed');
    }
  } catch (error) {
    console.error(`[notify:push] Lỗi hệ thống khi gửi push cho notification ${notificationId}`, error);
    await updateNotificationStatus(notificationId, 'failed');
  }
}

async function sendEmail(
  notificationId: string,
  emailTo: string,
  subject: string,
  body: string
) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">${subject}</h2>
        <p style="white-space: pre-line;">${body}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động từ hệ thống RealHome.</p>
      </div>
    `;
    const result = await sendEmailViaMailjet({ to: emailTo, subject, html });
    if (!result.success) {
      throw new Error(result.error);
    }
    console.log(`[notify:email] Đã gửi email tới ${emailTo}`);
    await updateNotificationStatus(notificationId, 'sent');
  } catch (error) {
    console.error(`[notify:email] Lỗi gửi email tới ${emailTo}`, error);
    await updateNotificationStatus(notificationId, 'failed');
  }
}

async function updateNotificationStatus(notificationId: string, status: 'sent' | 'failed') {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ 
      send_status: status,
      sent_at: new Date().toISOString()
    })
    .eq('id', notificationId);
    
  if (error) {
    console.error(`[notify] Lỗi cập nhật send_status cho ${notificationId}`, error);
  }
}
