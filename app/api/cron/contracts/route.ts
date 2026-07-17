import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/contracts
 * Cron job quét các hợp đồng thuê (rental_contracts) sắp hết hạn trong 30, 15, 7 ngày.
 * Gửi thông báo nhắc nhở gia hạn tới quản trị viên & sales phụ trách.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'Realhome2026_Cron';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Mốc thời gian hết hạn (30 ngày, 15 ngày, 7 ngày tới)
    const datesToCheck = [30, 15, 7].map((days: number) => {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + days);
      return {
        days,
        dateStr: targetDate.toISOString().slice(0, 10)
      };
    });

    let notifiedContracts = 0;

    for (const check of datesToCheck) {
      // Tìm hợp đồng active hết hạn đúng ngày check.dateStr
      const { data: contracts, error: fetchErr } = await supabaseAdmin
        .from('rental_contracts')
        .select('id, contract_code, company_id, party_b_name, end_date, room_id, created_by, rooms(code, buildings(name))')
        .eq('status', 'active')
        .eq('end_date', check.dateStr);

      if (fetchErr) throw fetchErr;

      for (const contract of contracts) {
        notifiedContracts++;
        const roomCode = contract.rooms?.code || '---';
        const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';

        // 1. Gửi thông báo cho Sales phụ trách (người tạo ra hợp đồng)
        if (contract.created_by) {
          await supabaseAdmin.from('notifications').insert({
            company_id: contract.company_id,
            title: `Hợp đồng thuê ${contract.contract_code} sắp hết hạn`,
            body: `Hợp đồng phòng ${roomCode} (${buildingName}) của khách hàng ${contract.party_b_name} sẽ hết hạn trong ${check.days} ngày nữa (${contract.end_date}). Vui lòng liên hệ gia hạn.`,
            type: 'contract',
            recipient_id: contract.created_by,
            link: `/admin/contracts`,
            is_read: false
          });
        }

        // 2. Gửi thông báo cho các Company Admin
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('company_id', contract.company_id)
          .eq('role', 'company_admin')
          .eq('is_active', true);

        if (admins && admins.length > 0) {
          const notificationInserts = admins.map((admin: any) => ({
            company_id: contract.company_id,
            title: `Hợp đồng ${contract.contract_code} sắp hết hạn`,
            body: `Hợp đồng phòng ${roomCode} (${buildingName}) của khách ${contract.party_b_name} sẽ hết hạn trong ${check.days} ngày nữa.`,
            type: 'contract',
            recipient_id: admin.id,
            link: `/admin/contracts`,
            is_read: false
          }));

          await supabaseAdmin.from('notifications').insert(notificationInserts);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notifiedContracts
    });
  } catch (err: any) {
    console.error('Lỗi chạy contract expiry cron job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
