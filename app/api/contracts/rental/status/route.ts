import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';
import { syncAgentKPI } from '@/lib/kpi-utils';

export const runtime = 'nodejs';

/**
 * POST /api/contracts/rental/status
 * Cập nhật trạng thái hợp đồng thuê và tự động giải phóng/khóa phòng.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id, status } = body;

    const validStatuses = ['draft', 'active', 'ended', 'terminated', 'cancelled'];

    if (!id || !status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Thiếu id hoặc trạng thái mới không hợp lệ' }, { status: 400 });
    }

    // 1. Lấy thông tin hợp đồng thuê hiện tại
    const { data: contract, error: contractErr } = await supabaseAdmin
      .from('rental_contracts')
      .select('*, rooms(code, price, buildings(name, landlord_id))')
      .eq('id', id)
      .maybeSingle();

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng thuê' }, { status: 404 });
    }

    if (contract.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Cập nhật trạng thái hợp đồng thuê
    const { data: updatedContract, error: updateErr } = await supabaseAdmin
      .from('rental_contracts')
      .update({
        status,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      throw updateErr;
    }

    // 3. Tự động cập nhật trạng thái phòng tương ứng
    let roomStatusUpdate = null;
    if (['ended', 'terminated', 'cancelled'].includes(status)) {
      roomStatusUpdate = 'available'; // Giải phóng phòng về trống
    } else if (status === 'active') {
      roomStatusUpdate = 'rented'; // Thiết lập phòng là đã thuê
    }

    if (roomStatusUpdate && contract.room_id) {
      const { error: roomErr } = await supabaseAdmin
        .from('rooms')
        .update({ status: roomStatusUpdate })
        .eq('id', contract.room_id);

      if (roomErr) {
        console.error('Lỗi tự động cập nhật trạng thái phòng từ HĐ thuê:', roomErr.message);
      }
    }

    // 4. Tạo thông báo (notification) cho Chủ nhà
    const landlordCode = contract.rooms?.buildings?.landlord_id;
    const roomCode = contract.rooms?.code || '---';
    const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';

    const statusLabels: Record<string, string> = {
      draft: 'Bản nháp',
      active: 'Hiệu lực',
      ended: 'Đã kết thúc (Hết hạn)',
      terminated: 'Thanh lý sớm',
      cancelled: 'Đã hủy',
    };

    if (landlordCode) {
      const { data: landlord } = await supabaseAdmin
        .from('landlords')
        .select('id, email, name')
        .eq('code', landlordCode)
        .maybeSingle();

      if (landlord) {
        let landlordEmail = landlord.email;
        const { data: lp } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('landlord_id', landlord.id)
          .maybeSingle();

        if (lp) {
          await supabaseAdmin.from('notifications').insert({
            company_id: contract.company_id,
            title: 'Trạng thái hợp đồng thuê thay đổi',
            body: `Trạng thái hợp đồng thuê phòng ${roomCode} (${buildingName}) được đổi sang: ${statusLabels[status]}.`,
            type: 'contract',
            recipient_id: lp.id,
            is_read: false,
            link: `/landlord/contracts`,
          });
          if (lp.email) landlordEmail = lp.email;
        }

        if (landlordEmail) {
          sendEmail({
            to: landlordEmail,
            subject: `[RealHome] Cập nhật trạng thái hợp đồng thuê - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5; margin-bottom: 20px;">Cập nhật trạng thái hợp đồng thuê</h2>
                <p>Xin chào Chủ nhà <strong>${landlord.name}</strong>,</p>
                <p>Chúng tôi xin thông báo trạng thái hợp đồng thuê phòng <strong>${roomCode}</strong> (${buildingName}) đã được thay đổi.</p>
                <ul>
                  <li><strong>Trạng thái mới:</strong> <strong style="color: #4f46e5;">${statusLabels[status]}</strong></li>
                  <li><strong>Mã hợp đồng:</strong> ${contract.contract_code}</li>
                </ul>
                <p>Hệ thống đã tự động cập nhật trạng thái phòng tương ứng (ví dụ: chuyển về "Còn trống" nếu kết thúc hoặc thanh lý hợp đồng thuê).</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động từ RealHome.</p>
              </div>
            `,
          }).catch((err) => console.error('Lỗi gửi mail cập nhật trạng thái HĐ thuê:', err));
        }
      }
    }

    // 5. Đồng bộ KPI nếu hợp đồng thuê có hiệu lực (active) hoặc thay đổi sang trạng thái hoàn thành khác
    if (contract.sales_agent_id && ['active', 'ended'].includes(status)) {
      const period = new Date().toISOString().substring(0, 7);
      syncAgentKPI(contract.company_id, contract.sales_agent_id, period)
        .catch(err => console.error('Lỗi đồng bộ KPI cho HĐ thuê:', err));
    }

    return NextResponse.json({ success: true, contract: updatedContract, roomStatus: roomStatusUpdate });
  } catch (error: any) {
    console.error('Lỗi khi thay đổi trạng thái HĐ thuê:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
