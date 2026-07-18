import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notifications/notify';

export const runtime = 'nodejs';

/**
 * GET /api/cron/check-expired-contracts
 * Cron job chạy hàng ngày để kiểm tra các hợp đồng thuê đã hết hạn.
 * Sẽ chuyển trạng thái hợp đồng thành 'ended' và phòng thành 'available'.
 */
export async function GET(request: Request) {
  try {
    // 1. Xác thực bằng Cron Secret (Bảo mật)
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'default-cron-secret-for-dev';
    
    if (authHeader !== `Bearer ${expectedSecret}` && request.headers.get('x-cron-secret') !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Tìm các hợp đồng đang active nhưng ngày kết thúc < ngày hiện tại
    const today = new Date().toISOString().split('T')[0];
    
    const { data: expiredContracts, error: fetchErr } = await supabaseAdmin
      .from('rental_contracts')
      .select('id, contract_code, room_id, company_id, rooms(code, buildings(name, landlord_id))')
      .eq('status', 'active')
      .lt('end_date', today);

    if (fetchErr) {
      throw fetchErr;
    }

    if (!expiredContracts || expiredContracts.length === 0) {
      return NextResponse.json({ success: true, message: 'Không có hợp đồng nào hết hạn.' });
    }

    let successCount = 0;
    const errorLogs: string[] = [];

    // 3. Xử lý từng hợp đồng
    for (const contract of expiredContracts) {
      try {
        // Cập nhật hợp đồng thành ended
        await supabaseAdmin
          .from('rental_contracts')
          .update({ status: 'ended', updated_at: new Date().toISOString() })
          .eq('id', contract.id);

        // Mở khóa phòng thành available
        if (contract.room_id) {
          await supabaseAdmin
            .from('rooms')
            .update({ status: 'available', updated_at: new Date().toISOString() })
            .eq('id', contract.room_id);
        }

        // Tìm landlord profile ID để gửi thông báo
        const landlordCode = contract.rooms?.buildings?.landlord_id;
        if (landlordCode) {
          const { data: landlord } = await supabaseAdmin
            .from('landlords')
            .select('id')
            .eq('code', landlordCode)
            .maybeSingle();

          if (landlord) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('landlord_id', landlord.id)
              .maybeSingle();

            if (profile) {
              const roomCode = contract.rooms?.code || '---';
              const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';
              
              await notify({
                companyId: contract.company_id,
                recipientId: profile.id,
                type: 'contract',
                title: 'Hợp đồng thuê hết hạn',
                message: \`Hợp đồng thuê mã \${contract.contract_code} tại phòng \${roomCode} (\${buildingName}) đã hết hạn. Hệ thống đã tự động chuyển phòng về trạng thái "Còn trống".\`,
                link: '/landlord/contracts',
                channels: ['in_app', 'email']
              });
            }
          }
        }

        successCount++;
      } catch (err: any) {
        errorLogs.push(\`Lỗi xử lý HĐ \${contract.id}: \${err.message}\`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: expiredContracts.length,
      successCount,
      errors: errorLogs
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
