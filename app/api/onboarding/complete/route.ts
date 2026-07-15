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

    // 2. Tìm thông tin invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('tenant_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn' },
        { status: 400 }
      );
    }

    // Kiểm tra xem đã được dùng chưa
    if (invitation.used_at) {
      return NextResponse.json(
        { error: 'Liên kết kích hoạt này đã được sử dụng trước đó' },
        { status: 400 }
      );
    }

    // Kiểm tra hết hạn
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Liên kết kích hoạt đã hết hạn sử dụng' },
        { status: 400 }
      );
    }

    const { profile_id, company_id } = invitation;

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
    // (Không kích hoạt khi landlord hoặc các role khác onboarding)
    if (updatedProfile?.role === 'company_admin') {
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
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateInviteError) {
      // Ghi log lỗi nhưng không block việc onboarding thành công của user
      console.error('Không thể đánh dấu sử dụng cho invitation:', updateInviteError);
    }

    return NextResponse.json({
      success: true,
      message: 'Kích hoạt tài khoản thành công',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
