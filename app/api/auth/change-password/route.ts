import { NextResponse } from 'next/server';
import { verifyJWT, hashPassword } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 1. Đọc cookie auth_token từ request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn' }, { status: 401 });
    }

    // 2. Xác thực token JWT
    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }, { status: 401 });
    }

    // 3. Đọc dữ liệu mật khẩu mới từ body
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' }, { status: 400 });
    }

    // 4. Băm mật khẩu mới bằng helper hashPassword
    const passwordHash = await hashPassword(password);

    // 5. Cập nhật vào cột password_hash của bảng profiles
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id);

    if (updateError) {
      console.error('Lỗi khi cập nhật mật khẩu trong database:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật mật khẩu mới' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
    });
  } catch (error: any) {
    console.error('Lỗi trong API đổi mật khẩu:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ không mong muốn' }, { status: 500 });
  }
}

// Hàm bổ trợ phân tích cú pháp cookie thủ công
function parseCookie(cookieString: string, key: string): string | null {
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k.trim() === key) {
      return decodeURIComponent(v.trim());
    }
  }
  return null;
}
