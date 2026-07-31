import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/password-utils';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register
 * Xử lý đăng ký tài khoản mới cho Khách hàng / Khách thuê.
 * Lưu thông tin trực tiếp vào bảng profiles trong CSDL Supabase.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phone, username, email, password } = body;

    if (!fullName || !phone || !username || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ các thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const userEmail = (email && email.trim() !== '') 
      ? email.trim().toLowerCase() 
      : `${username.trim().toLowerCase()}@realhome.com`;

    // 1. Kiểm tra email đã tồn tại trong CSDL chưa
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    if (checkError) {
      console.error('Lỗi khi kiểm tra tài khoản tồn tại:', checkError);
      return NextResponse.json({ error: 'Đã xảy ra lỗi kiểm tra hệ thống' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email hoặc Tên đăng nhập này đã được đăng ký. Vui lòng chọn tên khác hoặc đăng nhập.' },
        { status: 400 }
      );
    }

    // 2. Băm mật khẩu bằng bcrypt
    const passwordHash = await hashPassword(password);

    // 3. Chèn bản ghi tài khoản mới vào CSDL profiles
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: userEmail,
        password_hash: passwordHash,
        role: 'customer', // Tài khoản khách hàng / khách xem phòng
        is_active: true,
        company_id: null,
      })
      .select('id, email, full_name, role')
      .single();

    if (insertError) {
      console.error('Lỗi khi chèn tài khoản mới vào profiles:', insertError);
      return NextResponse.json(
        { error: `Không thể tạo tài khoản: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: newProfile,
    });
  } catch (error: any) {
    console.error('Lỗi trong xử lý đăng ký tài khoản:', error);
    return NextResponse.json(
      { error: `Đã xảy ra lỗi máy chủ: ${error.message || error}` },
      { status: 500 }
    );
  }
}
