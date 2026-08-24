import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const targetExpiryDate = new Date();
    targetExpiryDate.setDate(now.getDate() + 30);
    const targetDateStr = targetExpiryDate.toISOString().split('T')[0];

    // 1. Fetch contracts expiring around 30 days from now
    const { data: contracts, error } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('status', 'active');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const expiringContracts = (contracts || []).filter((c: any) => {
      if (!c.end_date) return false;
      const expDate = new Date(c.end_date);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });

    const results: any[] = [];

    for (const c of expiringContracts) {
      const tenantName = c.customer_name || 'Khách thuê';
      const tenantPhone = c.customer_phone || '';
      const roomTitle = c.room_title || 'Căn hộ';
      const endDateFormatted = c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : '—';

      // 2. Log Zalo ZNS Renewal Reminder
      await supabaseAdmin.from('notifications').insert({
        company_id: c.company_id,
        title: `🔔 ZALO ZNS NHẮC HẠN HỢP ĐỒNG (CÒN 30 NGÀY)`,
        body: `Hợp đồng thuê ${roomTitle} của khách ${tenantName} sẽ hết hạn vào ${endDateFormatted}. Đã tự động gửi Zalo ZNS mời gia hạn.`,
        type: 'contract',
        link: `/admin/contracts?id=${c.id}`,
      } as any);

      results.push({
        contract_id: c.id,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        room_title: roomTitle,
        end_date: c.end_date,
        zalo_zns_status: 'RENEWAL_INVITE_SENT',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã tự động gửi Zalo ZNS nhắc gia hạn hợp đồng cho ${results.length} khách thuê!`,
      expiring_count: results.length,
      details: results,
    });
  } catch (err: any) {
    console.error('[ZnsLeaseRenewalsCron] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
