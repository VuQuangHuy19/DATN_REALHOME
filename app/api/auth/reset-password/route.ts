import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/password-utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { code, newPassword } = await request.json();

    if (!code || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Thông tin không hợp lệ hoặc mật khẩu quá ngắn' }, { status: 400 });
    }

    // Tìm OTP hợp lệ chưa sử dụng và chưa hết hạn
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'Mã xác nhận không hợp lệ hoặc đã hết hạn' }, { status: 400 });
    }

    // Băm mật khẩu mới
    const passwordHash = await hashPassword(newPassword);

    // Cập nhật mật khẩu trong profiles
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.user_id);

    if (updateProfileError) {
      console.error('Lỗi khi cập nhật mật khẩu:', updateProfileError);
      return NextResponse.json({ error: 'Lỗi máy chủ khi cập nhật mật khẩu' }, { status: 500 });
    }

    // Đánh dấu OTP đã được sử dụng
    await supabaseAdmin
      .from('auth_otps')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' });

  } catch (error: any) {
    console.error('Lỗi trong api reset-password:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
