import { PayOS } from '@payos/node';

let payosInstance: PayOS | null = null;

/**
 * Lấy đối tượng PayOS client nếu đầy đủ biến môi trường.
 * Trả về null nếu chưa cấu hình.
 */
export function getPayOSClient(): PayOS | null {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) {
    return null;
  }

  if (!payosInstance) {
    payosInstance = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  return payosInstance;
}

export interface CreatePaymentLinkParams {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiredAt?: number; // Unix timestamp tính bằng giây
}

/**
 * Tạo link thanh toán PayOS thực tế.
 * Tự động cắt bớt mô tả nếu vượt quá giới hạn 25 ký tự của PayOS.
 * Mặc định cài đặt thời gian chờ chuyển khoản hết hạn sau 5 phút (300s).
 */
export async function createPayOSPaymentLink(params: CreatePaymentLinkParams) {
  const payos = getPayOSClient();
  if (!payos) return null;

  // PayOS giới hạn độ dài mô tả tối đa 25 ký tự
  const cleanDescription = params.description.slice(0, 25);

  // Mặc định hết hạn chuyển khoản sau 5 phút (300 giây)
  const expiredAt = params.expiredAt || Math.floor(Date.now() / 1000) + 5 * 60;

  return await payos.paymentRequests.create({
    orderCode: params.orderCode,
    amount: params.amount,
    description: cleanDescription,
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    expiredAt,
  });
}

/**
 * Xác minh tính hợp lệ và chữ ký của webhook dữ liệu thanh toán từ PayOS.
 */
export async function verifyPayOSWebhookData(webhookBody: any) {
  const payos = getPayOSClient();
  if (!payos) return null;

  try {
    return await payos.webhooks.verify(webhookBody);
  } catch (error) {
    console.error('Lỗi xác thực chữ ký PayOS Webhook:', error);
    return null;
  }
}

/**
 * Tạo PayOS Payment Link cho Hóa đơn tháng của Khách thuê.
 */
export async function createInvoicePayOSLink(params: {
  invoiceId: string;
  invoiceCode: string;
  roomCode: string;
  amount: number;
  baseUrl: string;
}) {
  const numericOrderCode = Number(
    String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900)
  );

  const description = `TT HDon ${params.roomCode}`.slice(0, 25);
  const returnUrl = `${params.baseUrl}/customer/invoices?payment_status=success&invoiceId=${params.invoiceId}`;
  const cancelUrl = `${params.baseUrl}/customer/invoices?payment_status=cancelled&invoiceId=${params.invoiceId}`;

  return await createPayOSPaymentLink({
    orderCode: numericOrderCode,
    amount: Math.round(params.amount),
    description,
    returnUrl,
    cancelUrl,
  });
}

