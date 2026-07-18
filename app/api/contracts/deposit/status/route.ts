import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';
import { syncAgentKPI } from '@/lib/kpi-utils';

export const runtime = 'nodejs';

/**
 * POST /api/contracts/deposit/status
 * Cập nhật trạng thái hợp đồng đặt cọc và tự động giải phóng phòng/khóa phòng.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id, status } = body;

    const validStatuses = ['draft', 'active', 'signed', 'converted', 'cancelled', 'forfeited', 'refunded'];

    if (!id || !status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Thiếu id hoặc trạng thái mới không hợp lệ' }, { status: 400 });
    }

    // 1. Lấy thông tin hợp đồng đặt cọc hiện tại
    const { data: contract, error: contractErr } = await supabaseAdmin
      .from('deposit_contracts')
      .select('*, rooms(code, price, buildings(name, landlord_id))')
      .eq('id', id)
      .maybeSingle();

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng đặt cọc' }, { status: 404 });
    }

    if (contract.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Cập nhật trạng thái hợp đồng đặt cọc
    const { data: updatedContract, error: updateErr } = await supabaseAdmin
      .from('deposit_contracts')
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

    // 3. Tự động cập nhật trạng thái phòng nếu chuyển sang trạng thái hủy cọc/mất cọc/hoàn cọc
    let roomStatusUpdate = null;
    if (['cancelled', 'forfeited', 'refunded'].includes(status)) {
      roomStatusUpdate = 'available'; // Mở khóa phòng về trống
    } else if (status === 'converted' || status === 'signed') {
      roomStatusUpdate = 'rented'; // Đã cho thuê
    } else if (status === 'active') {
      roomStatusUpdate = 'reserved'; // Khóa phòng giữ cọc
    }

    if (roomStatusUpdate && contract.room_id) {
      const { error: roomErr } = await supabaseAdmin
        .from('rooms')
        .update({ status: roomStatusUpdate })
        .eq('id', contract.room_id);

      if (roomErr) {
        console.error('Lỗi tự động cập nhật trạng thái phòng:', roomErr.message);
      }
    }

    // 4. Tạo thông báo (notification) cho Chủ nhà
    const landlordCode = contract.rooms?.buildings?.landlord_id;
    const roomCode = contract.rooms?.code || '---';
    const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';

    const statusLabels: Record<string, string> = {
      draft: 'Bản nháp',
      active: 'Chờ xác nhận cọc',
      signed: 'Đã nhận cọc',
      converted: 'Đã chuyển thành HĐ thuê',
      cancelled: 'Đã hủy cọc',
      forfeited: 'Khách mất cọc',
      refunded: 'Đã hoàn trả cọc',
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
            title: 'Trạng thái cọc phòng thay đổi',
            body: `Trạng thái cọc phòng ${roomCode} (${buildingName}) được đổi sang: ${statusLabels[status]}.`,
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
            subject: `[RealHome] Cập nhật trạng thái cọc - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5; margin-bottom: 20px;">Cập nhật trạng thái đặt cọc</h2>
                <p>Xin chào Chủ nhà <strong>${landlord.name}</strong>,</p>
                <p>Chúng tôi xin thông báo trạng thái đặt cọc phòng <strong>${roomCode}</strong> (${buildingName}) đã được thay đổi.</p>
                <ul>
                  <li><strong>Trạng thái mới:</strong> <strong style="color: #4f46e5;">${statusLabels[status]}</strong></li>
                  <li><strong>Mã hợp đồng:</strong> ${contract.contract_code}</li>
                </ul>
                <p>Hệ thống đã tự động cập nhật trạng thái phòng tương ứng (ví dụ: chuyển về "Còn trống" nếu hủy cọc).</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động từ RealHome.</p>
              </div>
            `,
          }).catch((err) => console.error('Lỗi gửi mail cập nhật trạng thái cọc:', err));
        }
      }
    }

    // 5. Đồng bộ KPI nếu trạng thái chuyển sang hoàn thành giao dịch cọc (thường là signed)
    if (contract.sales_agent_id && (status === 'signed' || status === 'converted')) {
      const period = new Date().toISOString().substring(0, 7);
      syncAgentKPI(contract.company_id, contract.sales_agent_id, period)
        .catch(err => console.error('Lỗi đồng bộ KPI:', err));
    }

    return NextResponse.json({ success: true, contract: updatedContract, roomStatus: roomStatusUpdate });
  } catch (error: any) {
    console.error('Lỗi khi thay đổi trạng thái cọc:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
