export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Gửi email qua Mailjet Send API v3.1.
 * Yêu cầu cài đặt các biến môi trường:
 * - MAILJET_API_KEY
 * - MAILJET_API_SECRET
 * - MAILJET_SENDER_EMAIL (Email đã verify trên Mailjet)
 * - MAILJET_SENDER_NAME (Tùy chọn)
 */
export async function sendEmail({
  to,
  subject,
  html,
  fromEmail,
  fromName,
}: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;
  const defaultSenderEmail = process.env.MAILJET_SENDER_EMAIL;
  const defaultSenderName = process.env.MAILJET_SENDER_NAME || 'RealHome';

  const senderEmail = fromEmail || defaultSenderEmail;

  if (!apiKey || !apiSecret) {
    console.log(`[Mailjet Mock] Email tới: ${to} | Tiêu đề: ${subject}`);
    return {
      success: true, // Fallback success for local dev/testing
      error: 'Chưa cấu hình MAILJET_API_KEY hoặc MAILJET_API_SECRET. Hệ thống chạy ở chế độ giả lập (Mock).',
    };
  }

  if (!senderEmail) {
    return {
      success: false,
      error: 'Chưa cấu hình MAILJET_SENDER_EMAIL trong biến môi trường.',
    };
  }

  try {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: senderEmail,
              Name: fromName || defaultSenderName,
            },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {}
      return {
        success: false,
        error: errorData?.ErrorMessage || `Lỗi từ Mailjet API (HTTP: ${response.status})`,
      };
    }

    const data = await response.json();
    const message = data.Messages?.[0];

    if (message?.Status === 'success') {
      return { success: true };
    } else {
      return {
        success: false,
        error: message?.Errors?.[0]?.ErrorMessage || 'Không thể gửi email qua Mailjet.',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi không xác định khi gửi email.',
    };
  }
}

// ─── ✉️ 1. Email kích hoạt tài khoản nhân viên / khách thuê ─────────────────
export async function sendAccountActivationEmail({
  toEmail,
  name,
  roleLabel,
  loginUrl,
  tempPassword,
}: {
  toEmail: string;
  name: string;
  roleLabel: string;
  loginUrl: string;
  tempPassword?: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
      <div style="text-align: center; background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Real<span style="color: #ffffff;">Home</span></h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Hệ thống Quản lý Bất động sản & Phòng trọ</p>
      </div>

      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a;">Chào ${name},</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Tài khoản <strong>${roleLabel}</strong> của bạn trên hệ thống <strong>RealHome</strong> đã được kích hoạt thành công!
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Thông tin đăng nhập:</strong></p>
          <p style="margin: 0 0 4px 0; font-size: 13px;">Email: <strong>${toEmail}</strong></p>
          ${tempPassword ? `<p style="margin: 0; font-size: 13px;">Mật khẩu tạm thời: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Đăng nhập vào Hệ thống →
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          * Vì lý do bảo mật, vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu tiên.
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} RealHome System. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[RealHome] Kích hoạt tài khoản ${roleLabel} thành công`,
    html,
  });
}

// ─── 🧾 2. Email thông báo Hóa đơn hàng tháng ─────────────────────────────
export async function sendMonthlyInvoiceEmail({
  toEmail,
  name,
  roomCode,
  month,
  rentAmount,
  electricityAmount,
  waterAmount,
  totalAmount,
  dueDate,
  paymentUrl,
}: {
  toEmail: string;
  name: string;
  roomCode: string;
  month: string;
  rentAmount: string;
  electricityAmount: string;
  waterAmount: string;
  totalAmount: string;
  dueDate: string;
  paymentUrl: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Real<span style="color: #ffffff;">Home</span></h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Thông báo Hóa đơn Tiền nhà & Dịch vụ</p>
      </div>

      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a;">Kính gửi anh/chị ${name},</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Ban Quản Lý xin gửi tới anh/chị hóa đơn tiền phòng <strong>${roomCode}</strong> kỳ <strong>${month}</strong>.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 10px; border-bottom: 2px solid #cbd5e1;">Hạng mục</th>
              <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right;">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Tiền thuê phòng</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${rentAmount}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Tiền điện sinh hoạt</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${electricityAmount}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Tiền nước sử dụng</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${waterAmount}</td>
            </tr>
            <tr style="background-color: #fef3c7;">
              <td style="padding: 12px; font-weight: bold; color: #78350f;">TỔNG THANH TOÁN:</td>
              <td style="padding: 12px; font-weight: bold; color: #b45309; text-align: right; font-size: 16px;">${totalAmount} VNĐ</td>
            </tr>
          </tbody>
        </table>

        <p style="font-size: 13px; color: #dc2626; font-weight: bold;">
          ⏰ Hạn thanh toán: trước ngày ${dueDate}
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Xem chi tiết & Thanh toán Online →
          </a>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
        Mọi thắc mắc xin liên hệ Ban Quản Lý qua ứng dụng RealHome.
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[RealHome] Thông báo Hóa đơn ${month} - Phòng ${roomCode}`,
    html,
  });
}

// ─── 📅 3. Email xác nhận Lịch hẹn xem phòng ──────────────────────────────
export async function sendAppointmentNotificationEmail({
  toEmail,
  customerName,
  roomTitle,
  date,
  time,
  address,
  notes,
}: {
  toEmail: string;
  customerName: string;
  roomTitle: string;
  date: string;
  time: string;
  address: string;
  notes?: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Real<span style="color: #ffffff;">Home</span></h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Xác nhận Lịch hẹn Xem phòng</p>
      </div>

      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a;">Chào ${customerName},</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Yêu cầu đặt lịch xem phòng của bạn đã được tiếp nhận và xác nhận!
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Căn hộ:</strong> ${roomTitle}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Thời gian:</strong> <span style="color: #d97706; font-weight: bold;">${time} - Ngày ${date}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Địa chỉ xem phòng:</strong> ${address}</p>
          ${notes ? `<p style="margin: 0; font-size: 13px; color: #64748b;">Ghi chú: ${notes}</p>` : ''}
        </div>

        <p style="font-size: 13px; color: #475569; line-height: 1.5;">
          Nhân viên môi giới (Sale) sẽ liên hệ trực tiếp với bạn trước giờ hẹn 30 phút để hỗ trợ đón bạn tại địa điểm.
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
        Cảm ơn bạn đã tin tưởng dịch vụ của RealHome!
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[RealHome] Xác nhận lịch hẹn xem phòng ngày ${date}`,
    html,
  });
}

// ─── 🔒 4. Email thông báo Đổi mật khẩu thành công ──────────────────────
export async function sendPasswordChangeNotificationEmail({
  toEmail,
  name,
}: {
  toEmail: string;
  name: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Real<span style="color: #ffffff;">Home</span></h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Thông báo Bảo mật Tài khoản</p>
      </div>

      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a;">Chào ${name},</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Mật khẩu tài khoản <strong>RealHome</strong> của bạn vừa được thay đổi thành công vào lúc <span style="color: #d97706; font-weight: bold;">${new Date().toLocaleString('vi-VN')}</span>.
        </p>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #991b1b; font-weight: bold;">⚠️ Bạn không thực hiện thao tác này?</p>
          <p style="margin: 0; font-size: 12px; color: #7f1d1d;">Nếu bạn không tự thực hiện đổi mật khẩu, vui lòng liên hệ ngay với Ban Quản Lý hoặc hỗ trợ kỹ thuật RealHome để bảo vệ tài khoản.</p>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} RealHome System. Email tự động, vui lòng không phản hồi trực tiếp.
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[RealHome] Thông báo: Mật khẩu tài khoản của bạn vừa được thay đổi`,
    html,
  });
}

// ─── 🔑 5. Email mã OTP khôi phục mật khẩu ──────────────────────────────
export async function sendPasswordResetOTPEmail({
  toEmail,
  name,
  otp,
}: {
  toEmail: string;
  name: string;
  otp: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Real<span style="color: #ffffff;">Home</span></h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Khôi phục Mật khẩu Tài khoản</p>
      </div>

      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a;">Chào ${name},</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>${toEmail}</strong> trên hệ thống RealHome. Mã xác nhận OTP của bạn là:
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 6px; color: #d97706; background-color: #fffbebf; border: 2px dashed #f59e0b; padding: 12px 28px; border-radius: 8px; display: inline-block;">${otp}</span>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: center;">
          ⏰ Mã xác nhận có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} RealHome System. If you did not request this, please ignore this email.
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[RealHome] Mã OTP khôi phục mật khẩu: ${otp}`,
    html,
  });
}

