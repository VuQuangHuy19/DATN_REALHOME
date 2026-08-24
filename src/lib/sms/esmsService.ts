/**
 * eSMS.vn Integration Service
 * Document: https://esms.vn/tai-lieu-api
 * API Endpoint: https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json
 */

export interface ESMSResponse {
  CodeResult: string; // '100' means Success
  CountRegenerate?: number;
  SMSID?: string;
  ErrorMessage?: string;
}

export interface SendSMSInput {
  phone: string;
  content: string;
  smsType?: string; // '2': CSKH đầu số ngẫu nhiên, '8': đầu số cố định 10 số
  isUnicode?: '0' | '1'; // '0': Không dấu (160 ký tự/tin), '1': Có dấu (70 ký tự/tin)
}

/**
 * Clean phone number to Vietnamese standard (e.g., +84977123456 -> 0977123456)
 */
export function normalizeVietnamesePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Remove Vietnamese accents for SMS non-unicode mode (160 chars per SMS)
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Main eSMS Sending Function
 */
export async function sendESMS(input: SendSMSInput): Promise<{
  success: boolean;
  smsId?: string;
  message: string;
  rawResponse?: ESMSResponse;
}> {
  const apiKey = process.env.ESMS_API_KEY || process.env.NEXT_PUBLIC_ESMS_API_KEY;
  const secretKey = process.env.ESMS_SECRET_KEY || process.env.NEXT_PUBLIC_ESMS_SECRET_KEY;
  const defaultSmsType = process.env.ESMS_SMS_TYPE || '2';

  const normalizedPhone = normalizeVietnamesePhone(input.phone);

  if (!normalizedPhone) {
    return { success: false, message: 'Số điện thoại không hợp lệ' };
  }

  // Simulation mode if keys are not set yet (Dev friendly - zero crashes)
  if (!apiKey || !secretKey || apiKey === 'YOUR_ESMS_API_KEY' || apiKey === 'YOUR_ESMS_API_KEY_HERE') {
    console.log(`[eSMS SIMULATION MODE] Sending SMS to ${normalizedPhone}: "${input.content}"`);
    return {
      success: true,
      smsId: 'SIMULATED_SMS_' + Date.now(),
      message: 'Mô phỏng gửi SMS thành công (Chưa cấu hình ESMS_API_KEY trong .env.local)',
    };
  }

  const isUnicode = input.isUnicode || '0';
  const finalContent = isUnicode === '0' ? removeVietnameseAccents(input.content) : input.content;

  const payload = {
    ApiKey: apiKey,
    SecretKey: secretKey,
    Phone: normalizedPhone,
    Content: finalContent,
    SmsType: input.smsType || defaultSmsType,
    IsUnicode: isUnicode,
    Brandname: '', // Empty for Non-brandname sending
  };

  try {
    const res = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: ESMSResponse = await res.json();

    // CodeResult '100' indicates clean success in eSMS API
    if (data && data.CodeResult === '100') {
      return {
        success: true,
        smsId: data.SMSID,
        message: 'Gửi tin nhắn SMS thành công qua eSMS.vn',
        rawResponse: data,
      };
    } else {
      const errorMsg = getESMSErrorMessage(data?.CodeResult) || data?.ErrorMessage || 'Lỗi không xác định từ eSMS';
      console.error(`[eSMS Error] Code: ${data?.CodeResult}, Message: ${errorMsg}`);
      return {
        success: false,
        message: `Lỗi eSMS: ${errorMsg}`,
        rawResponse: data,
      };
    }
  } catch (err: any) {
    console.error('[eSMS Fetch Exception]', err);
    return {
      success: false,
      message: err.message || 'Không thể kết nối tới máy chủ eSMS.vn',
    };
  }
}

/**
 * eSMS.vn Result Code Description Helper
 */
function getESMSErrorMessage(code?: string): string | null {
  switch (code) {
    case '100': return 'Gửi tin thành công';
    case '99': return 'Lỗi hệ thống eSMS';
    case '101': return 'ApiKey hoặc SecretKey không chính xác';
    case '102': return 'Tài khoản eSMS đã bị khóa';
    case '103': return 'Số dư tài khoản eSMS không đủ để gửi tin';
    case '104': return 'Brandname hoặc SmsType không hợp lệ';
    case '105': return 'Nội dung tin nhắn bị rỗng hoặc vi phạm từ khóa cấm';
    case '106': return 'Số điện thoại người nhận không hợp lệ';
    default: return null;
  }
}

/**
 * Helper 1: Gửi SMS thông báo lịch hẹn tới CHỦ NHÀ (Định dạng đẹp mắt - Tuyệt đối BẢO MẬT SĐT Khách hàng)
 * BẢO MẬT: Chủ nhà CHỈ xem được SĐT của Sale phụ trách, TUYỆT ĐỐI không gửi SĐT khách cho Chủ nhà!
 */
export async function sendSMSNotificationToLandlord(options: {
  landlordPhone: string;
  customerName: string;
  roomCode: string;
  buildingName?: string;
  buildingAddress?: string;
  saleName: string;
  salePhone: string;
  date: string;
  time: string;
}) {
  const {
    landlordPhone, customerName, roomCode,
    buildingName, buildingAddress, saleName, salePhone, date, time
  } = options;

  const content = `📋 QUY KHAC CO LICH HEN XEM PHONG
-------------------------------
👤 Khach hang: ${customerName}
🏠 Bat dong san: ${roomCode} ${buildingName ? '(' + buildingName + ')' : ''}
📍 Dia chi: ${buildingAddress || buildingName || 'Theo thoa thuan'}
📅 Ngay xem: ${date}
⏰ Gio xem: ${time}
👨‍💼 Sale phu trach: ${saleName}
📞 SDT Sale: ${salePhone || 'Lien he he thong'}`;

  return await sendESMS({
    phone: landlordPhone,
    content,
    isUnicode: '0',
  });
}

/**
 * Helper 2: Gửi SMS thông báo lịch hẹn tới KHÁCH HÀNG
 */
export async function sendSMSNotificationToCustomer(options: {
  customerPhone: string;
  customerName: string;
  roomCode: string;
  buildingName?: string;
  buildingAddress?: string;
  landlordName?: string;
  saleName: string;
  salePhone: string;
  date: string;
  time: string;
}) {
  const {
    customerPhone, customerName, roomCode, buildingName,
    buildingAddress, landlordName, saleName, salePhone, date, time
  } = options;

  const content = `📋 LICH HEN XEM PHONG CUA QUY KHAC
-------------------------------
👤 Khach hang: ${customerName}
🏠 Bat dong san: ${roomCode} ${buildingName ? '(' + buildingName + ')' : ''}
📍 Dia chi: ${buildingAddress || buildingName || 'Theo thoa thuan'}
🔑 Chu nha: ${landlordName || 'Chu nha'}
📅 Ngay xem: ${date}
⏰ Gio xem: ${time}
👨‍💼 Sale phu trach: ${saleName}
📞 SDT Sale: ${salePhone || 'Lien he he thong'}
🏷️ Trang thai: Da xac nhan thanh cong`;

  return await sendESMS({
    phone: customerPhone,
    content,
    isUnicode: '0',
  });
}
