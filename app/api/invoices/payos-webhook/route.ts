import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyPayOSWebhookData } from '@/lib/payos';

export const runtime = 'nodejs';

/**
 * POST /api/invoices/payos-webhook
 * Webhook nhận phản hồi kết quả thanh toán Hóa đơn tháng từ PayOS.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Nhận callback webhook thanh toán Hóa đơn tháng:', body);

    const isMock = body.isMock === true;
    let orderCode = body.orderCode || body.data?.orderCode;
    let invoiceId = body.invoiceId || body.data?.invoiceId;
    let paymentSuccess = false;

    if (isMock) {
      paymentSuccess = body.status === 'PAID';
    } else {
      const verifiedData = await verifyPayOSWebhookData(body);
      if (verifiedData) {
        orderCode = verifiedData.orderCode || orderCode;
        paymentSuccess = verifiedData.code === '00' || body.code === '00' || body.success === true;
      } else {
        paymentSuccess = body.success === true || body.data?.status === 'PAID' || body.code === '00';
      }
    }

    // Xử lý request test webhook từ PayOS Dashboard
    if (Number(orderCode) === 123 || String(orderCode).toLowerCase().includes('test')) {
      console.log('[PayOS Invoice Webhook] Test request kết nối thành công!');
      return NextResponse.json({ success: true, message: 'Xác thực PayOS Webhook Test thành công' });
    }

    let invoice = null;

    if (invoiceId) {
      const { data } = await supabaseAdmin.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
      invoice = data;
    }

    if (!invoice && orderCode) {
      // Tra cứu theo invoice_code hoặc mã orderCode ngẫu nhiên ghép với invoice
      const { data } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .or(`invoice_code.eq.${orderCode},note.ilike.%${orderCode}%`)
        .maybeSingle();
      invoice = data;
    }

    if (!invoice) {
      console.error(`Không tìm thấy Hóa đơn tháng phù hợp với orderCode/invoiceId ${orderCode || invoiceId}`);
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Hóa đơn đã được chốt thanh toán trước đó' });
    }

    if (!paymentSuccess) {
      return NextResponse.json({ success: true, message: 'Thanh toán chưa thành công, không cập nhật hóa đơn' });
    }

    const now = new Date().toISOString();

    // Cập nhật trạng thái Hóa đơn sang 'paid'
    const { error: updateErr } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'paid',
        payment_date: now,
        payment_method: isMock ? 'mock_payos' : 'payos',
        updated_at: now,
      })
      .eq('id', invoice.id);

    if (updateErr) {
      console.error('Lỗi khi cập nhật hóa đơn tháng:', updateErr);
      throw updateErr;
    }

    // Lấy thông tin phòng và khách thuê để tạo thông báo In-App
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('code, building_id, buildings(name, landlord_id)')
      .eq('id', invoice.room_id)
      .maybeSingle();

    const roomCode = room?.code || '';
    const landlordId = (room?.buildings as any)?.landlord_id;

    // Gửi thông báo cho Chủ nhà/Manager
    if (landlordId) {
      await supabaseAdmin.from('notifications').insert({
        company_id: invoice.company_id,
        recipient_id: landlordId,
        recipient_role: 'landlord',
        type: 'invoice_paid',
        title: '💰 Hóa đơn đã được thanh toán',
        body: `Khách thuê phòng ${roomCode} đã thanh toán hóa đơn ${invoice.invoice_code} (${Number(invoice.total_amount).toLocaleString('vi-VN')}đ) qua PayOS.`,
        link: `/landlord/invoices`,
        is_read: false,
      } as any);
    }

    console.log(`[Thành công] Hóa đơn ${invoice.invoice_code} (${invoice.id}) đã được chốt thanh toán PAID tự động.`);

    return NextResponse.json({
      success: true,
      message: 'Cập nhật trạng thái Hóa đơn sang PAID thành công!',
      invoiceCode: invoice.invoice_code,
    });
  } catch (err: any) {
    console.error('Lỗi khi xử lý PayOS Invoice Webhook:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
