import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

/**
 * GET/POST /api/contracts/deposit/check-unconfirmed
 * Tự động kiểm tra các hợp đồng đặt cọc ở trạng thái 'active' quá 20 phút mà chưa được xác nhận.
 * Phát thông báo Cảnh báo đỏ 🚨 qua Web Notification và Email Mailjet cho Chủ nhà & Admin.
 */
async function handleCheckUnconfirmed() {
  try {
    const now = new Date();
    const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000).toISOString();

    // 1. Lấy các HĐ cọc status = 'active' tạo trước mốc 20 phút trước
    const { data: overdueContracts, error: contractErr } = await supabaseAdmin
      .from('deposit_contracts')
      .select('*, rooms(code, buildings(name, landlord_id))')
      .eq('status', 'active')
      .lte('created_at', twentyMinsAgo);

    if (contractErr) throw contractErr;
    if (!overdueContracts || overdueContracts.length === 0) {
      return NextResponse.json({ success: true, alertsSent: 0 });
    }

    let alertsCount = 0;

    for (const contract of overdueContracts) {
      const roomCode = contract.rooms?.code || '---';
      const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';
      const landlordCodeOrId = contract.rooms?.buildings?.landlord_id;

      // Check if alert notification was already created recently for this contract
      const { data: existingNotif } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('company_id', contract.company_id)
        .eq('type', 'deposit_unconfirmed_alert')
        .like('body', `%${contract.contract_code}%`)
        .maybeSingle();

      if (existingNotif) {
        // Đã phát thông báo cho hợp đồng này rồi, bỏ qua tránh spam
        continue;
      }

      const notifications: any[] = [];
      const emailsToSend: { to: string; subject: string; html: string }[] = [];

      // 1. Tìm thông tin Chủ nhà
      if (landlordCodeOrId) {
        const { data: landlord } = await supabaseAdmin
          .from('landlords')
          .select('id, email, name')
          .or(`id.eq.${landlordCodeOrId},code.eq.${landlordCodeOrId}`)
          .maybeSingle();

        if (landlord) {
          let landlordEmail = landlord.email;
          const { data: lp } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('landlord_id', landlord.id)
            .maybeSingle();

          if (lp) {
            notifications.push({
              company_id: contract.company_id,
              title: '🚨 CẢNH BÁO DUYỆT CỌC QUÁ HẠN (20 Phút)',
              body: `Hợp đồng cọc ${contract.contract_code} cho phòng ${roomCode} (${buildingName}) đã quá 20 phút chưa được xác nhận. Vui lòng kiểm tra tài khoản!`,
              type: 'deposit_unconfirmed_alert',
              recipient_id: lp.id,
              is_read: false,
              link: `/landlord/contracts`,
            });
            if (lp.email) landlordEmail = lp.email;
          }

          if (landlordEmail) {
            emailsToSend.push({
              to: landlordEmail,
              subject: `[CẢNH BÁO 🚨] Hợp đồng cọc phòng ${roomCode} chưa được xác nhận quá 20 phút`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
                  <h2 style="color: #dc2626; margin-bottom: 16px;">🚨 CẢNH BÁO DUYỆT CỌC QUÁ HẠN 20 PHÚT</h2>
                  <p>Xin chào Chủ nhà <strong>${landlord.name}</strong>,</p>
                  <p>Hệ thống nhận thấy hợp đồng đặt cọc sau đây đã được Sale tạo thành công nhưng <strong>quá 20 phút chưa được xác nhận tiền cọc</strong>:</p>
                  <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 16px 0;" />
                  <ul>
                    <li><strong>Mã hợp đồng:</strong> ${contract.contract_code}</li>
                    <li><strong>Phòng:</strong> ${roomCode} (${buildingName})</li>
                    <li><strong>Khách hàng (Bên B):</strong> ${contract.party_b_name} (${contract.party_b_phone})</li>
                    <li><strong>Số tiền đặt cọc:</strong> ${Number(contract.deposit_amount).toLocaleString('vi-VN')} VNĐ</li>
                  </ul>
                  <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 16px 0;" />
                  <p style="color: #991b1b; font-weight: bold;">Vui lòng truy cập trang Cổng Chủ Nhà để kiểm tra tài khoản ngân hàng và bấm "Xác nhận cọc" hoặc thông báo cho Admin nếu có bất thường.</p>
                </div>
              `,
            });
          }
        }
      }

      // 2. Tìm thông tin Admin/Manager
      const { data: adminProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('company_id', contract.company_id)
        .in('role', ['company_admin', 'manager'])
        .eq('is_active', true);

      if (adminProfiles && adminProfiles.length > 0) {
        adminProfiles.forEach((admin: any) => {
          notifications.push({
            company_id: contract.company_id,
            title: '🚨 CẢNH BÁO CỌC QUÁ HẠN DUYỆT',
            body: `HĐ cọc ${contract.contract_code} (Phòng ${roomCode}) quá 20 phút Chủ nhà chưa duyệt. Admin có thể Duyệt Đè nếu tiền đã về.`,
            type: 'deposit_unconfirmed_alert',
            recipient_id: admin.id,
            is_read: false,
            link: `/admin/contracts`,
          });
        });
      }

      if (notifications.length > 0) {
        await supabaseAdmin.from('notifications').insert(notifications);
      }

      if (emailsToSend.length > 0) {
        await Promise.all(
          emailsToSend.map((opts) =>
            sendEmail(opts).catch((err) => console.error('Lỗi gửi Mailjet cảnh báo 20 phút:', err))
          )
        );
      }

      alertsCount++;
    }

    return NextResponse.json({ success: true, alertsSent: alertsCount });
  } catch (error: any) {
    console.error('Lỗi khi kiểm tra HĐ cọc quá hạn 20 phút:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  return handleCheckUnconfirmed();
}

export async function POST() {
  return handleCheckUnconfirmed();
}
