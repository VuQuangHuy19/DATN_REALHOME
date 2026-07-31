import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPayOSPaymentLink } from '@/src/lib/payos';

export const runtime = 'nodejs';

const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  professional: 150000,
  enterprise: 300000,
};

/**
 * POST /api/subscriptions/checkout
 * Tạo hóa đơn SaaS mới và trả về link thanh toán (hoặc link thanh toán giả lập nếu chưa cấu hình cổng thanh toán)
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { plan, seats, months } = body;

    if (!plan || !seats || !months || !PLAN_PRICES.hasOwnProperty(plan)) {
      return NextResponse.json({ error: 'Thông tin thanh toán không hợp lệ' }, { status: 400 });
    }

    const companyId = auth.profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Tài khoản không thuộc công ty nào' }, { status: 400 });
    }

    const pricePerMonth = PLAN_PRICES[plan] * seats;
    const amount = pricePerMonth * months;
    
    // Nếu là gói starter và giá là 0đ, tự động kích hoạt luôn không cần thanh toán
    if (amount === 0) {
      const now = new Date();
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + months);

      // Cập nhật subscription
      const { data: sub, error: subErr } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          company_id: companyId,
          plan,
          status: 'active',
          seats,
          price_per_month: 0,
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();

      if (subErr) throw subErr;

      // Mở khóa công ty
      await supabaseAdmin
        .from('companies')
        .update({ status: 'active', plan, updated_at: now.toISOString() })
        .eq('id', companyId);

      return NextResponse.json({ success: true, instantActive: true });
    }

    const invoiceCode = `INV-SAAS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payosOrderCode = Number(`${Date.now()}`.slice(-9)); // PayOS orderCode là kiểu int32 hợp lệ
    const now = new Date();
    const billingStart = new Date();
    const billingEnd = new Date();
    billingEnd.setMonth(billingEnd.getMonth() + months);

    // 1. Tạo hóa đơn SaaS lưu trong database ở trạng thái 'unpaid'
    const { data: invoice, error: invoiceErr } = await supabaseAdmin
      .from('saas_invoices')
      .insert({
        company_id: companyId,
        invoice_code: invoiceCode,
        amount,
        plan,
        seats,
        status: 'unpaid',
        payment_method: 'payos',
        payos_order_code: payosOrderCode,
        billing_period_start: billingStart.toISOString(),
        billing_period_end: billingEnd.toISOString(),
      })
      .select()
      .single();

    if (invoiceErr) throw invoiceErr;

    // 2. Gọi PayOS API tạo link thanh toán thật nếu đã có API Key/Client ID/Checksum Key
    let paymentUrl = '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
      const payosResponse = await createPayOSPaymentLink({
        orderCode: payosOrderCode,
        amount,
        description: `Thanh toan ${plan.toUpperCase()}`,
        returnUrl: `${siteUrl}/admin/system/billing?payment=success&order_code=${payosOrderCode}`,
        cancelUrl: `${siteUrl}/admin/system/billing?payment=cancelled`,
      });

      if (payosResponse && payosResponse.checkoutUrl) {
        paymentUrl = payosResponse.checkoutUrl;
      }
    } catch (err) {
      console.error('Lỗi khi kết nối cổng thanh toán PayOS thực tế, chuyển sang giả lập:', err);
    }

    // Nếu không cấu hình PayOS Key hoặc gọi thất bại, sử dụng Mock Checkout Page
    if (!paymentUrl) {
      paymentUrl = `${siteUrl}/admin/system/billing/pay-mock?invoice_id=${invoice.id}&order_code=${payosOrderCode}&amount=${amount}&plan=${plan}&seats=${seats}&months=${months}`;
    }

    // Cập nhật link thanh toán vào hóa đơn
    await supabaseAdmin
      .from('saas_invoices')
      .update({ payment_url: paymentUrl })
      .eq('id', invoice.id);

    return NextResponse.json({ success: true, paymentUrl, invoiceCode, invoiceId: invoice.id });
  } catch (err: any) {
    console.error('Lỗi xử lý checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
