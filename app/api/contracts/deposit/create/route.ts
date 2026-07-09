import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const {
      company_id,
      room_id,
      contract_code,
      agreement_date,
      sign_location,
      party_a_name,
      party_a_dob,
      party_a_address,
      party_a_id_card,
      party_a_id_date,
      party_a_id_place,
      party_a_phone,
      party_b_name,
      party_b_phone,
      party_b_dob,
      party_b_id_card,
      party_b_id_date,
      party_b_id_place,
      party_b_address,
      rent_price,
      electricity_price,
      water_price,
      service_price,
      other_services,
      tenant_count,
      payment_method,
      lease_duration_months,
      termination_notice_days,
      room_repair_support_date,
      deposit_amount,
      deadline_sign_contract,
      deposit_payment_type,
      bank_name,
      bank_account_number,
      bank_account_owner,
      transfer_content_template,
      note,
      lead_view_image_url,
      transfer_proof_url,
    } = body;

    // 1. Kiểm tra đầu vào hợp lệ
    if (!company_id || !room_id || !contract_code || !party_b_name || !party_b_phone || !deposit_amount || !deadline_sign_contract) {
      return NextResponse.json({ error: 'Thiếu thông tin hợp đồng đặt cọc bắt buộc' }, { status: 400 });
    }

    if (auth.profile.company_id !== company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Lấy thông tin phòng và chủ nhà liên quan
    const { data: roomData, error: roomErr } = await supabaseAdmin
      .from('rooms')
      .select('code, building_id, price, buildings(name, landlord_id)')
      .eq('id', room_id)
      .single();

    if (roomErr || !roomData) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin phòng hoặc tòa nhà' }, { status: 404 });
    }

    const roomCode = roomData.code;
    const buildingName = roomData.buildings?.name || 'Tòa nhà';
    const landlordCodeOrId = roomData.buildings?.landlord_id;

    // 3. Tiến hành chèn hợp đồng đặt cọc
    const { data: contract, error: contractErr } = await supabaseAdmin
      .from('deposit_contracts')
      .insert({
        company_id,
        room_id,
        contract_code,
        status: 'active',
        agreement_date,
        sign_location,
        party_a_name,
        party_a_dob,
        party_a_address,
        party_a_id_card,
        party_a_id_date,
        party_a_id_place,
        party_a_phone,
        party_b_name,
        party_b_phone,
        party_b_dob,
        party_b_id_card,
        party_b_id_date,
        party_b_id_place,
        party_b_address,
        rent_price,
        electricity_price,
        water_price,
        service_price,
        other_services,
        tenant_count,
        payment_method,
        lease_duration_months,
        termination_notice_days,
        room_repair_support_date,
        deposit_amount,
        deadline_sign_contract,
        deposit_payment_type,
        bank_name,
        bank_account_number,
        bank_account_owner,
        transfer_content_template,
        note,
        lead_view_image_url,
        transfer_proof_url,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Lỗi ghi hợp đồng cọc: ' + contractErr?.message }, { status: 400 });
    }

    // 4. Cập nhật trạng thái phòng thành 'reserved' (Đã cọc)
    const { error: roomUpdateErr } = await supabaseAdmin
      .from('rooms')
      .update({ status: 'reserved' })
      .eq('id', room_id);

    if (roomUpdateErr) {
      console.error('Lỗi cập nhật trạng thái phòng:', roomUpdateErr);
    }

    // 5. Tạo thông báo hệ thống và chuẩn bị email
    const notifications: any[] = [];
    const emailsToSend: { to: string; subject: string; html: string }[] = [];

    // Tìm các tài khoản Admin / Manager của doanh nghiệp để thông báo
    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('company_id', company_id)
      .in('role', ['company_admin', 'manager'])
      .eq('is_active', true);

    const saleName = auth.profile.full_name || 'Nhân viên Sale';

    if (adminProfiles && adminProfiles.length > 0) {
      adminProfiles.forEach((admin: any) => {
        notifications.push({
          company_id,
          title: 'Hợp đồng đặt cọc mới',
          body: `Sale ${saleName} đã chốt cọc phòng ${roomCode} (${buildingName}).`,
          type: 'deposit_created',
          recipient_id: admin.id,
          is_read: false,
          link: `/admin/contracts`,
        });

        if (admin.email) {
          emailsToSend.push({
            to: admin.email,
            subject: `[RealHome] Hợp đồng đặt cọc mới - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5; margin-bottom: 20px;">Hợp đồng đặt cọc mới cần duyệt</h2>
                <p>Xin chào Ban Quản Trị,</p>
                <p>Nhân viên sale <strong>${saleName}</strong> đã lập hợp đồng đặt cọc giữ chỗ thành công cho khách hàng.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <h3 style="color: #334155;">Thông tin đặt cọc:</h3>
                <ul>
                  <li><strong>Mã hợp đồng:</strong> ${contract_code}</li>
                  <li><strong>Phòng:</strong> ${roomCode} (${buildingName})</li>
                  <li><strong>Khách hàng (Bên B):</strong> ${party_b_name} (${party_b_phone})</li>
                  <li><strong>Số tiền đặt cọc:</strong> ${Number(deposit_amount).toLocaleString('vi-VN')} đ</li>
                  <li><strong>Hạn ký hợp đồng chính thức:</strong> ${new Date(deadline_sign_contract).toLocaleDateString('vi-VN')}</li>
                </ul>
                ${lead_view_image_url ? `<p><strong>Ảnh sale dẫn phòng:</strong> <a href="${lead_view_image_url}" target="_blank">Xem ảnh minh chứng</a></p>` : ''}
                ${transfer_proof_url ? `<p><strong>Ảnh hóa đơn chuyển khoản:</strong> <a href="${transfer_proof_url}" target="_blank">Xem hóa đơn</a></p>` : ''}
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 13px;">Vui lòng truy cập trang quản trị để xem và in hợp đồng đặt cọc.</p>
              </div>
            `,
          });
        }
      });
    }

    // Tìm và thông báo cho Chủ nhà
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
            company_id,
            title: 'Phòng của bạn đã được cọc',
            body: `Phòng ${roomCode} (${buildingName}) đã được khách đặt cọc giữ chỗ.`,
            type: 'deposit_created',
            recipient_id: lp.id,
            is_read: false,
            link: `/landlord/contracts`,
          });
          if (lp.email) landlordEmail = lp.email;
        }

        if (landlordEmail) {
          emailsToSend.push({
            to: landlordEmail,
            subject: `[RealHome] Thông báo cọc phòng - Phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #10b981; margin-bottom: 20px;">Thông báo cọc phòng thành công</h2>
                <p>Xin chào Chủ nhà <strong>${landlord.name}</strong>,</p>
                <p>Chúng tôi xin thông báo phòng <strong>${roomCode}</strong> thuộc tòa nhà <strong>${buildingName}</strong> của bạn đã được khách hàng đặt cọc giữ chỗ thành công thông qua sale <strong>${saleName}</strong>.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <h3 style="color: #334155;">Thông tin cọc phòng:</h3>
                <ul>
                  <li><strong>Phòng:</strong> ${roomCode}</li>
                  <li><strong>Khách thuê:</strong> ${party_b_name}</li>
                  <li><strong>Tiền cọc giữ chỗ:</strong> ${Number(deposit_amount).toLocaleString('vi-VN')} đ</li>
                  <li><strong>Hạn ký hợp đồng thuê nhà:</strong> ${new Date(deadline_sign_contract).toLocaleDateString('vi-VN')}</li>
                </ul>
                <p style="color: #64748b; font-size: 13px;">Hệ thống đã tự động khóa phòng này và ẩn khỏi danh sách phòng trống trên website.</p>
              </div>
            `,
          });
        }
      }
    }

    // Ghi hàng loạt thông báo vào DB
    if (notifications.length > 0) {
      await supabaseAdmin.from('notifications').insert(notifications);
    }

    // Gửi email hàng loạt bất đồng bộ
    Promise.all(
      emailsToSend.map((emailOpts) =>
        sendEmail({
          to: emailOpts.to,
          subject: emailOpts.subject,
          html: emailOpts.html,
        }).catch((err) => console.error('Lỗi gửi email cọc phòng:', err))
      )
    ).catch((err) => console.error('Lỗi gửi nhóm email:', err));

    return NextResponse.json({ success: true, contract }, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi tạo hợp đồng cọc:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
