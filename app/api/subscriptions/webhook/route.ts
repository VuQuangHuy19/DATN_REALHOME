import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  professional: 150000,
  enterprise: 300000,
};

/**
 * POST /api/subscriptions/webhook
 * Webhook nhận phản hồi kết quả thanh toán từ PayOS hoặc từ hệ thống giả lập.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Nhận callback webhook thanh toán B2B SaaS:', body);

    // Xác minh dữ liệu:
    // 1. Nếu là từ hệ thống giả lập (Mock UI)
    const isMock = body.isMock === true;
    let orderCode = body.orderCode || body.data?.orderCode;
    let paymentSuccess = false;

    if (isMock) {
      paymentSuccess = body.status === 'PAID';
    } else {
      // Thực tế: Kiểm tra signature từ PayOS
      // const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;
      // if (payosChecksumKey) {
      //   // Verify webhook data signature...
      // }
      paymentSuccess = body.success === true || body.data?.status === 'PAID';
    }

    if (!orderCode) {
      return NextResponse.json({ error: 'Mã orderCode không hợp lệ' }, { status: 400 });
    }

    if (!paymentSuccess) {
      return NextResponse.json({ success: true, message: 'Thanh toán thất bại, không xử lý kích hoạt' });
    }

    // 2. Tìm hóa đơn tương ứng với orderCode
    const { data: invoice, error: invoiceErr } = await supabaseAdmin
      .from('saas_invoices')
      .select('*')
      .eq('payos_order_code', Number(orderCode))
      .maybeSingle();

    if (invoiceErr || !invoice) {
      console.error(`Không tìm thấy hóa đơn SaaS với orderCode ${orderCode}:`, invoiceErr);
      return NextResponse.json({ error: 'Hóa đơn không tồn tại' }, { status: 404 });
    }

    // Nếu hóa đơn đã được thanh toán rồi, bỏ qua
    if (invoice.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Hóa đơn đã được xử lý trước đó' });
    }

    const now = new Date();

    // 3. Cập nhật hóa đơn sang 'paid'
    const { error: updateInvoiceErr } = await supabaseAdmin
      .from('saas_invoices')
      .update({
        status: 'paid',
        payment_method: isMock ? 'mock_payos' : 'payos',
        updated_at: now.toISOString(),
      })
      .eq('id', invoice.id);

    if (updateInvoiceErr) throw updateInvoiceErr;

    // 4. Hủy active của các gói cũ của công ty này
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('company_id', invoice.company_id)
      .eq('status', 'active');

    // 5. Tạo bản ghi gói đăng ký mới trong bảng subscriptions
    const pricePerMonth = PLAN_PRICES[invoice.plan] || 0;
    const { data: subscription, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id: invoice.company_id,
        plan: invoice.plan,
        status: 'active',
        seats: invoice.seats,
        price_per_month: pricePerMonth,
        starts_at: invoice.billing_period_start,
        ends_at: invoice.billing_period_end,
      })
      .select()
      .single();

    if (subErr) throw subErr;

    // Cập nhật subscription_id ngược lại hóa đơn
    await supabaseAdmin
      .from('saas_invoices')
      .update({ subscription_id: subscription.id })
      .eq('id', invoice.id);

    // 6. Cập nhật trạng thái và gói dịch vụ của công ty thành active
    const { error: companyErr } = await supabaseAdmin
      .from('companies')
      .update({
        status: 'active',
        plan: invoice.plan,
        updated_at: now.toISOString(),
      })
      .eq('id', invoice.company_id);

    if (companyErr) throw companyErr;

    console.log(`[Thành công] Công ty ${invoice.company_id} đã được kích hoạt/gia hạn gói ${invoice.plan} (${invoice.seats} seats).`);

    return NextResponse.json({ success: true, message: 'Xử lý kích hoạt gói dịch vụ thành công' });
  } catch (err: any) {
    console.error('Lỗi nghiêm trọng khi nhận webhook thanh toán:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
