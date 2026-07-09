import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

/**
 * POST /api/contracts/deposit/confirm
 * Chủ nhà xác nhận đã nhận tiền cọc cho hợp đồng đặt cọc.
 * Cập nhật status từ 'active' thành 'signed'.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['landlord']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã hợp đồng đặt cọc' }, { status: 400 });
    }

    if (!auth.profile.landlord_id) {
      return NextResponse.json({ error: 'Tài khoản không được liên kết với chủ nhà' }, { status: 403 });
    }

    // 1. Lấy thông tin landlord code
    const { data: landlord, error: landlordErr } = await supabaseAdmin
      .from('landlords')
      .select('id, code, name')
      .eq('id', auth.profile.landlord_id)
      .maybeSingle();

    if (landlordErr || !landlord) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin chủ nhà' }, { status: 403 });
    }

    // 2. Lấy thông tin hợp đồng đặt cọc
    const { data: contract, error: contractErr } = await supabaseAdmin
      .from('deposit_contracts')
      .select('*, rooms(code, buildings(name, landlord_id))')
      .eq('id', id)
      .maybeSingle();

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng đặt cọc' }, { status: 404 });
    }

    // Kiểm tra tính sở hữu tòa nhà của chủ nhà
    const landlordCodeOnBuilding = contract.rooms?.buildings?.landlord_id;
    if (landlordCodeOnBuilding !== landlord.code) {
      return NextResponse.json({ error: 'Bạn không có quyền xác nhận hợp đồng này' }, { status: 403 });
    }

    if (contract.status !== 'active') {
      return NextResponse.json({ error: 'Hợp đồng này không ở trạng thái chờ xác nhận' }, { status: 400 });
    }

    // 3. Cập nhật trạng thái hợp đồng đặt cọc thành 'signed'
    const { data: updatedContract, error: updateErr } = await supabaseAdmin
      .from('deposit_contracts')
      .update({
        status: 'signed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      throw updateErr;
    }

    const roomCode = contract.rooms?.code || '---';
    const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';

    // 4. Tạo thông báo (notification) cho Admin/Manager của công ty
    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('company_id', contract.company_id)
      .in('role', ['company_admin', 'manager'])
      .eq('is_active', true);

    const notifications: any[] = [];
    const emailsToSend: { to: string; subject: string; html: string }[] = [];

    if (adminProfiles && adminProfiles.length > 0) {
      adminProfiles.forEach((admin: any) => {
        notifications.push({
          company_id: contract.company_id,
          title: 'Đã xác nhận cọc',
          body: `Chủ nhà ${landlord.name} đã xác nhận nhận cọc phòng ${roomCode} (${buildingName}).`,
          type: 'contract',
          recipient_id: admin.id,
          is_read: false,
          link: `/admin/contracts`,
        });

        if (admin.email) {
          emailsToSend.push({
            to: admin.email,
            subject: `[RealHome] Chủ nhà xác nhận cọc - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #10b981; margin-bottom: 20px;">Đã nhận tiền đặt cọc</h2>
                <p>Xin chào Ban Quản Trị,</p>
                <p>Chủ nhà <strong>${landlord.name}</strong> đã xác nhận đã nhận cọc từ khách hàng cho hợp đồng đặt cọc sau:</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <ul>
                  <li><strong>Mã hợp đồng:</strong> ${contract.contract_code}</li>
                  <li><strong>Phòng:</strong> ${roomCode} (${buildingName})</li>
                  <li><strong>Khách hàng:</strong> ${contract.party_b_name} (${contract.party_b_phone})</li>
                  <li><strong>Số tiền đặt cọc:</strong> ${Number(contract.deposit_amount).toLocaleString('vi-VN')} đ</li>
                </ul>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 13px;">Trạng thái hợp đồng đã được cập nhật thành <strong>Đã xác nhận cọc (signed)</strong>.</p>
              </div>
            `,
          });
        }
      });

      // Ghi thông báo vào DB
      await supabaseAdmin.from('notifications').insert(notifications);

      // Gửi email bất đồng bộ
      Promise.all(
        emailsToSend.map((opts) =>
          sendEmail(opts).catch((err) => console.error('Lỗi gửi mail xác nhận cọc:', err))
        )
      ).catch((err) => console.error(err));
    }

    return NextResponse.json({ success: true, contract: updatedContract });
  } catch (error: any) {
    console.error('Lỗi khi xác nhận cọc:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
