import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

/**
 * GET/POST /api/cron/check-expired-contracts
 * Cron job chạy hàng ngày để xử lý hợp đồng thuê đến ngày hết hạn:
 * 1. Nếu KHÔNG báo hủy trước 30 ngày (status === 'active'):
 *    -> Tự động gia hạn (Auto-Renew) thêm đúng số tháng đã ký lần 1.
 *    -> Bắn thông báo Web Push & Mailjet Email cho Chủ nhà & Khách thuê.
 * 2. Nếu CÓ báo hủy/thanh lý (status === 'terminated'):
 *    -> Chuyển HĐ sang 'ended' và nhả phòng về 'available' (Còn trống).
 */
async function handleExpiredContracts(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'Realhome2026_Cron';

    if (
      authHeader !== `Bearer ${expectedSecret}` &&
      request.headers.get('x-cron-secret') !== expectedSecret &&
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Lấy tất cả HĐ thuê ở trạng thái active hoặc terminated có end_date < hôm nay
    const { data: expiredContracts, error: fetchErr } = await supabaseAdmin
      .from('rental_contracts')
      .select('id, contract_code, start_date, end_date, room_id, company_id, party_b_name, party_b_phone, status, rooms(code, buildings(name, landlord_id))')
      .in('status', ['active', 'terminated'])
      .lt('end_date', todayStr);

    if (fetchErr) throw fetchErr;

    if (!expiredContracts || expiredContracts.length === 0) {
      return NextResponse.json({ success: true, message: 'Không có hợp đồng nào đến hạn cần xử lý.', processed: 0 });
    }

    let renewedCount = 0;
    let endedCount = 0;
    const errorLogs: string[] = [];

    for (const contract of expiredContracts) {
      try {
        const roomCode = contract.rooms?.code || '---';
        const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';
        const landlordCodeOrId = contract.rooms?.buildings?.landlord_id;

        // Lấy thông tin email/profile của Chủ nhà nếu có
        let landlordEmail = '';
        let landlordName = 'Chủ nhà';
        if (landlordCodeOrId) {
          const { data: landlord } = await supabaseAdmin
            .from('landlords')
            .select('id, email, name')
            .or(`id.eq.${landlordCodeOrId},code.eq.${landlordCodeOrId}`)
            .maybeSingle();

          if (landlord) {
            landlordName = landlord.name;
            landlordEmail = landlord.email || '';
          }
        }

        // TRƯỜNG HỢP 1: HỢP ĐỒNG ĐÃ ĐƯỢC ĐÁNH DẤU THANH LÝ SỚM (THẦY/KHÁCH CÓ BÁO TRƯỚC 30 NGÀY)
        if (contract.status === 'terminated') {
          await supabaseAdmin
            .from('rental_contracts')
            .update({ status: 'ended', updated_at: new Date().toISOString() })
            .eq('id', contract.id);

          if (contract.room_id) {
            await supabaseAdmin
              .from('rooms')
              .update({ status: 'available', updated_at: new Date().toISOString() })
              .eq('id', contract.room_id);
          }

          // Thông báo kết thúc HĐ
          await supabaseAdmin.from('notifications').insert({
            company_id: contract.company_id,
            title: 'Hợp đồng thuê kết thúc',
            body: `Hợp đồng mã ${contract.contract_code} tại phòng ${roomCode} (${buildingName}) đã kết thúc theo báo trước. Hệ thống đã trả phòng về "Còn trống".`,
            type: 'contract',
            is_read: false,
          });

          endedCount++;
          continue;
        }

        // TRƯỜNG HỢP 2: TỰ ĐỘNG GIA HẠN (KHÔNG BÁO HỦY TRƯỚC 30 NGÀY)
        const oldStartDate = new Date(contract.start_date);
        const oldEndDate = new Date(contract.end_date);
        const diffTime = Math.max(1, oldEndDate.getTime() - oldStartDate.getTime());
        const termMonths = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));

        // Tính mốc thời hạn mới
        const newStartDateStr = contract.end_date;
        const newEndDate = new Date(oldEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + termMonths);
        const newEndDateStr = newEndDate.toISOString().split('T')[0];

        // Cập nhật hợp đồng thuê với thời hạn mới, giữ nguyên status = 'active'
        await supabaseAdmin
          .from('rental_contracts')
          .update({
            start_date: newStartDateStr,
            end_date: newEndDateStr,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contract.id);

        // Đảm bảo phòng duy trì status = 'rented'
        if (contract.room_id) {
          await supabaseAdmin
            .from('rooms')
            .update({ status: 'rented', updated_at: new Date().toISOString() })
            .eq('id', contract.room_id);
        }

        const formattedNewEndDate = `${newEndDate.getDate()}/${newEndDate.getMonth() + 1}/${newEndDate.getFullYear()}`;

        // 1. Gửi thông báo Web Push cho Admin & Chủ nhà
        const notifications: any[] = [
          {
            company_id: contract.company_id,
            title: '🔄 HỢP ĐỒNG TỰ ĐỘNG GIA HẠN',
            body: `HĐ thuê ${contract.contract_code} phòng ${roomCode} (${buildingName}) đã tự động gia hạn thêm ${termMonths} tháng (hạn mới: ${formattedNewEndDate}) do không có báo trước hủy trước 30 ngày.`,
            type: 'contract',
            is_read: false,
            link: `/admin/contracts`,
          },
        ];

        await supabaseAdmin.from('notifications').insert(notifications);

        // 2. Gửi Email Mailjet cho Chủ nhà
        if (landlordEmail) {
          sendEmail({
            to: landlordEmail,
            subject: `[RealHome 🔄] Tự động gia hạn HĐ Thuê - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #3b82f6; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-bottom: 16px;">🔄 HỢP ĐỒNG THUÊ ĐÃ TỰ ĐỘNG GIA HẠN</h2>
                <p>Xin chào Chủ nhà <strong>${landlordName}</strong>,</p>
                <p>Do không nhận được thông báo hủy hợp đồng trước 30 ngày từ khách thuê, hệ thống đã tự động gia hạn hợp đồng thuê phòng theo điều khoản quy định:</p>
                <hr style="border: 0; border-top: 1px solid #bfdbfe; margin: 16px 0;" />
                <ul>
                  <li><strong>Mã hợp đồng:</strong> ${contract.contract_code}</li>
                  <li><strong>Phòng:</strong> ${roomCode} (${buildingName})</li>
                  <li><strong>Khách thuê:</strong> ${contract.party_b_name} (${contract.party_b_phone})</li>
                  <li><strong>Thời gian gia hạn thêm:</strong> ${termMonths} tháng</li>
                  <li><strong>Hạn hợp đồng mới:</strong> <strong style="color: #2563eb;">${formattedNewEndDate}</strong></li>
                </ul>
                <hr style="border: 0; border-top: 1px solid #bfdbfe; margin: 16px 0;" />
                <p style="color: #64748b; font-size: 13px;">Phòng tiếp tục ở trạng thái Đã Thuê. Bạn có thể xem chi tiết trên Cổng Chủ Nhà.</p>
              </div>
            `,
          }).catch((err) => console.error('Lỗi gửi mail tự động gia hạn HĐ thuê:', err));
        }

        renewedCount++;
      } catch (err: any) {
        errorLogs.push(`Lỗi xử lý HĐ ${contract.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: expiredContracts.length,
      renewedCount,
      endedCount,
      errors: errorLogs,
    });
  } catch (error: any) {
    console.error('Cron job auto-renew error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleExpiredContracts(request);
}

export async function POST(request: Request) {
  return handleExpiredContracts(request);
}
