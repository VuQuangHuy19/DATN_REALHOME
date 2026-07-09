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
    return {
      success: false,
      error: 'Chưa cấu hình MAILJET_API_KEY hoặc MAILJET_API_SECRET trong biến môi trường.',
    };
  }

  if (!senderEmail) {
    return {
      success: false,
      error: 'Chưa cấu hình MAILJET_SENDER_EMAIL trong biến môi trường hoặc không có email người gửi hợp lệ.',
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
            To: [
              {
                Email: to,
              },
            ],
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
      } catch {
        // Not a JSON response
      }
      return {
        success: false,
        error: errorData?.ErrorMessage || `Lỗi từ Mailjet API (Mã lỗi HTTP: ${response.status})`,
      };
    }

    const data = await response.json();
    const message = data.Messages?.[0];

    if (message?.Status === 'success') {
      return { success: true };
    } else {
      const errorMsg =
        message?.Errors?.[0]?.ErrorMessage || 'Không thể gửi email qua Mailjet.';
      return {
        success: false,
        error: errorMsg,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi không xác định khi gửi email.',
    };
  }
}
