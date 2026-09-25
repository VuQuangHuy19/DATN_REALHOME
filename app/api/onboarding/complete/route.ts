import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashRawToken } from '@/lib/auth/onboarding-token';
import { hashPassword } from '@/lib/password-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc (token, password)' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự có chữ hoa , chữ thường và số và ký tự đặc biệt' },
        { status: 400 }
      );
    }

    // 1. Hash raw token
    const tokenHash = hashRawToken(token);

    // 2. Tìm thông tin invitation (hỗ trợ cả column token và token_hash)
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('tenant_invitations')
      .select('*')
      .or(`token.eq.${token},token.eq.${tokenHash}`)
      .maybeSingle();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn' },
        { status: 400 }
      );
    }

    // Kiểm tra xem đã được dùng chưa
    if (invitation.status === 'used' || (invitation as any).used_at) {
      return NextResponse.json(
        { error: 'Liên kết kích hoạt này đã được sử dụng trước đó' },
        { status: 400 }
      );
    }

    // 3. Kiểm tra loại tài khoản (Tenant hay Nhân viên/Quản trị)
    let profile_id = (invitation as any).profile_id;
    const company_id = invitation.company_id;
    let isTenant = false;

    if (!profile_id && invitation.email) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('email', invitation.email)
        .maybeSingle();
      if (prof) {
        profile_id = prof.id;
        if (prof.role === 'tenant') isTenant = true;
      }
    } else if (profile_id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', profile_id)
        .maybeSingle();
      if (prof?.role === 'tenant') isTenant = true;
    }

    if (isTenant || (invitation as any).rental_contract_id) {
      // Dành cho Khách thuê: Token có hiệu lực vô thời hạn cho tới khi Hợp đồng thuê hết hạn / bị hủy / thanh lý
      const email = invitation.email;
      const phone = invitation.phone;

      let contractsFilter = '';
      if (email && phone) {
        contractsFilter = `party_b_email.eq.${email},party_b_phone.eq.${phone}`;
      } else if (email) {
        contractsFilter = `party_b_email.eq.${email}`;
      } else if (phone) {
        contractsFilter = `party_b_phone.eq.${phone}`;
      }

      if (contractsFilter) {
        const { data: deposits } = await supabaseAdmin
          .from('deposit_contracts')
          .select('status')
          .or(contractsFilter);

        const { data: rentals } = await supabaseAdmin
          .from('rental_contracts')
          .select('status')
          .or(contractsFilter);

        const allContracts = [...(deposits || []), ...(rentals || [])];
        if (allContracts.length > 0) {
          const hasActiveContract = allContracts.some((c) =>
            ['active', 'signed', 'draft', 'converted'].includes(c.status)
          );
          if (!hasActiveContract) {
            return NextResponse.json(
              { error: 'Hợp đồng thuê nhà hoặc đặt cọc của bạn đã kết thúc, hết hạn hoặc bị hủy.' },
              { status: 400 }
            );
          }
        }
      }
    } else {
      // Dành cho Nhân viên / Quản lý: Kiểm tra expires_at thông thường
      if (invitation.expires_at) {
        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < new Date()) {
          return NextResponse.json(
            { error: 'Liên kết kích hoạt đã hết hạn sử dụng' },
            { status: 400 }
          );
        }
      }
    }

    if (!profile_id) {
      return NextResponse.json(
        { error: 'Không tìm thấy hồ sơ người dùng tương ứng với liên kết' },
        { status: 400 }
      );
    }

    // Kiểm tra giới hạn seats trước khi kích hoạt
    try {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', profile_id)
        .single();

      if (currentProfile && currentProfile.role !== 'company_admin') {
        const { data: activeSub } = await supabaseAdmin
          .from('subscriptions')
          .select('seats')
          .eq('company_id', company_id)
          .eq('status', 'active')
          .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
          .limit(1)
          .maybeSingle();

        const allowedSeats = activeSub?.seats || 5;

        const { count: activeProfilesCount, error: countError } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company_id)
          .eq('is_active', true)
          .in('role', ['company_admin', 'manager', 'sales_agent']);

        if (countError) throw countError;

        if ((activeProfilesCount || 0) >= allowedSeats) {
          return NextResponse.json(
            { error: `Không thể kích hoạt tài khoản. Công ty của bạn đã sử dụng hết số lượng tài khoản hoạt động (${allowedSeats} chỗ). Vui lòng liên hệ Admin để nâng cấp gói.` },
            { status: 400 }
          );
        }
      }
    } catch (e: any) {
      console.error('Lỗi kiểm tra giới hạn seats khi onboarding:', e);
    }

    // Cập nhật mật khẩu trong Supabase Auth
    try {
      await supabaseAdmin.auth.admin.updateUserById(profile_id, {
        password: password,
      });
    } catch (authErr: any) {
      console.error('Lỗi cập nhật mật khẩu Supabase Auth:', authErr);
    }

    // 3. Thiết lập mật khẩu và kích hoạt tài khoản trong bảng profiles
    const passwordHash = await hashPassword(password);
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        password_hash: passwordHash,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile_id)
      .select('role')
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: `Không thể thiết lập mật khẩu và kích hoạt tài khoản: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 5. Chỉ kích hoạt trạng thái Company khi người dùng là company_admin
    if (updatedProfile?.role === 'company_admin' && company_id) {
      const { error: companyError } = await supabaseAdmin
        .from('companies')
        .update({ status: 'active' })
        .eq('id', company_id);

      if (companyError) {
        return NextResponse.json(
          { error: `Không thể kích hoạt công ty: ${companyError.message}` },
          { status: 400 }
        );
      }
    }

    // 6. Đánh dấu token đã sử dụng
    const { error: updateInviteError } = await supabaseAdmin
      .from('tenant_invitations')
      .update({ status: 'used', used_at: new Date().toISOString() } as any)
      .eq('id', invitation.id);

    if (updateInviteError) {
      console.error('Lỗi khi đánh dấu token đã sử dụng:', updateInviteError);
    }

    return NextResponse.json({
      success: true,
      message: 'Kích hoạt tài khoản thành công',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
