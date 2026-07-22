export interface SendSMSResult {
  success: boolean;
  message?: string;
  error?: any;
}

export async function sendSMS(to: string, content: string): Promise<SendSMSResult> {
  const accessToken = process.env.SPEEDSMS_API_TOKEN;
  
  if (!accessToken) {
    console.warn('[SPEEDSMS] SPEEDSMS_API_TOKEN is not configured. Falling back to log.');
    console.log(`[MOCK SMS] Gửi SMS tới ${to}: ${content}`);
    return { success: true, message: 'Mock SMS (Token not configured)' };
  }

  const formattedPhone = to.trim();

  const buf = Buffer.from(accessToken + ':x');
  const auth = "Basic " + buf.toString('base64');
  
  try {
    const response = await fetch('https://api.speedsms.vn/index.php/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({
        to: [formattedPhone],
        content: content,
        sms_type: 4 // Random number sender for accounts without brandname
      })
    });

    const json = await response.json();
    
    if (json.status === 'success') {
      console.log(`[SPEEDSMS] Gửi SMS tới ${formattedPhone} thành công.`);
      return { success: true, message: 'SMS sent successfully' };
    } else {
      console.error("[SPEEDSMS] Gửi SMS thất bại: ", json);
      // Fallback log
      console.log(`[SPEEDSMS FALLBACK] Mã SMS dự phòng: ${content}`);
      return { success: false, error: json };
    }
  } catch (error) {
    console.error("[SPEEDSMS] Lỗi kết nối gửi SMS: ", error);
    return { success: false, error };
  }
}
