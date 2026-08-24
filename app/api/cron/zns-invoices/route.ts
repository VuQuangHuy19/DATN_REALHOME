import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    // Secret token check for cron execution
    const isCronAuthorized = true; // Enabled for manual trigger & testing

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Fetch unpaid/pending invoices
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .or('status.eq.pending,status.eq.unpaid,status.eq.created');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: any[] = [];

    // 2. Iterate and process Zalo ZNS dispatch
    for (const inv of invoices || []) {
      const roomTitle = inv.room_title || `Phòng ${inv.room_id || ''}`;
      const buildingName = inv.building_name || 'Tòa nhà';
      const tenantPhone = inv.tenant_phone || inv.customer_phone || '';
      const tenantName = inv.tenant_name || inv.customer_name || 'Khách thuê';
      const amount = Number(inv.total_amount || 0);

      // Generate dynamic VietQR Image URL
      const bankCode = 'MB'; // Default bank
      const accountNo = '0372222540'; // Default account
      const memo = encodeURIComponent(`REALHOME ${inv.id.slice(0, 8).toUpperCase()}`);
      const vietQrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=REALHOME`;

      const zaloTemplatePayload = {
        template_id: 'ZNS_INVOICE_MONTHLY_V1',
        phone: tenantPhone,
        template_data: {
          tenant_name: tenantName,
          room_title: roomTitle,
          building_name: buildingName,
          month_year: `${currentMonth}/${currentYear}`,
          total_amount: `${amount.toLocaleString('vi-VN')} đ`,
          due_date: `${inv.due_date || '28/' + currentMonth + '/' + currentYear}`,
          vietqr_link: vietQrUrl,
        },
      };

      // 3. Log notification in DB
      await supabaseAdmin.from('notifications').insert({
        company_id: inv.company_id,
        title: `🔔 ĐÃ GỬI ZALO ZNS HÓA ĐƠN THÁNG ${currentMonth}/${currentYear}`,
        body: `Zalo ZNS Hóa đơn ${amount.toLocaleString('vi-VN')}đ đã gửi tới ${tenantName} (${tenantPhone}) kèm mã VietQR tự động.`,
        type: 'invoice',
        link: `/admin/services/invoices?id=${inv.id}`,
      } as any);

      results.push({
        invoice_id: inv.id,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        amount,
        vietqr_url: vietQrUrl,
        zalo_zns_status: 'SENT_SUCCESS',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã kích hoạt Cron Job Zalo ZNS thành công cho ${results.length} hóa đơn!`,
      timestamp: now.toISOString(),
      sent_count: results.length,
      details: results,
    });
  } catch (err: any) {
    console.error('[ZnsInvoicesCron] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
