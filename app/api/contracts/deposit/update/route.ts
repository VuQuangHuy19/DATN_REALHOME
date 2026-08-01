import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

/**
 * POST /api/contracts/deposit/update
 * Cập nhật thông tin hợp đồng đặt cọc và gửi thông báo tới chủ nhà.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã hợp đồng đặt cọc' }, { status: 400 });
    }

    // 1. Kiểm tra sự tồn tại của hợp đồng
    const { data: contract, error: contractErr } = await supabaseAdmin
      .from('deposit_contracts')
      .select('*, rooms(code, buildings(name, landlord_id))')
      .eq('id', id)
      .maybeSingle();

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng đặt cọc' }, { status: 404 });
    }

    // Nếu là sale, chỉ được sửa hợp đồng mình tạo
    if (auth.profile.role === 'sales_agent' && contract.created_by !== auth.userId) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa hợp đồng này' }, { status: 403 });
    }

    // 2. Tiến hành cập nhật hợp đồng đặt cọc
    const allowedFields = [
      'agreement_date', 'sign_location',
      'party_a_name', 'party_a_dob', 'party_a_address', 'party_a_id_card', 'party_a_id_date', 'party_a_id_place', 'party_a_phone',
      'party_b_name', 'party_b_phone', 'party_b_email', 'party_b_dob', 'party_b_id_card', 'party_b_id_date', 'party_b_id_place', 'party_b_address',
      'rent_price', 'electricity_price', 'water_price', 'service_price', 'other_services', 'tenant_count', 'payment_method',
      'lease_duration_months', 'termination_notice_days', 'room_repair_support_date',
      'deposit_amount', 'deadline_sign_contract', 'deposit_payment_type',
      'bank_name', 'bank_account_number', 'bank_account_owner', 'transfer_content_template', 'note',
      'lead_view_image_url', 'transfer_proof_url'
    ];

    const patch: Record<string, any> = { updated_at: new Date().toISOString(), updated_by: auth.userId };
    allowedFields.forEach((f) => {
      if (updates[f] !== undefined) {
        patch[f] = updates[f];
      }
    });

    const { data: updatedContract, error: updateErr } = await supabaseAdmin
      .from('deposit_contracts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      throw updateErr;
    }

    // 3. Thông báo cho Chủ nhà
    const landlordCode = contract.rooms?.buildings?.landlord_id;
    const roomCode = contract.rooms?.code || '---';
    const buildingName = contract.rooms?.buildings?.name || 'Tòa nhà';

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
          // Tạo notification cho chủ nhà
          await supabaseAdmin.from('notifications').insert({
            company_id: contract.company_id,
            title: 'Hợp đồng đặt cọc thay đổi',
            body: `Thông tin cọc phòng ${roomCode} (${buildingName}) đã được cập nhật bởi quản trị viên.`,
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
            subject: `[RealHome] Thay đổi thông tin cọc phòng - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5; margin-bottom: 20px;">Hợp đồng đặt cọc được cập nhật</h2>
                <p>Xin chào Chủ nhà <strong>${landlord.name}</strong>,</p>
                <p>Chúng tôi xin thông báo thông tin hợp đồng đặt cọc giữ chỗ phòng <strong>${roomCode}</strong> (${buildingName}) đã được cập nhật thay đổi bởi quản trị viên hệ thống.</p>
                <p>Vui lòng đăng nhập vào trang chủ nhà để xem lại chi tiết hợp đồng đã cập nhật.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 13px;">Trạng thái hiện tại: <strong>${updatedContract.status === 'active' ? 'Chờ xác nhận' : 'Đã xác nhận cọc'}</strong></p>
              </div>
            `,
          }).catch((err) => console.error('Lỗi gửi email cập nhật cọc cho chủ nhà:', err));
        }
      }
    }

    return NextResponse.json({ success: true, contract: updatedContract });
  } catch (error: any) {
    console.error('Lỗi cập nhật hợp đồng cọc:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
