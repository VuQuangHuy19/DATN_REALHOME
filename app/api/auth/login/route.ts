import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword, signJWT, fetchUserSessionData } from '@/lib/auth-utils';

export const runtime = 'nodejs';

/**
 * Endpoint xử lý đăng nhập bằng tài khoản/mật khẩu tự thiết lập.
 * Xác thực thông tin người dùng với cơ sở dữ liệu và cấp phát JWT token qua Cookie.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. Kiểm tra đầu vào hợp lệ
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ email và mật khẩu' },
        { status: 400 }
      );
    }

    // 2. Tìm kiếm profile theo email trong database
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Lỗi truy vấn cơ sở dữ liệu:', error);
      return NextResponse.json(
        { error: 'Đã xảy ra lỗi hệ thống khi kiểm tra thông tin' },
        { status: 500 }
      );
    }

    // Không tìm thấy tài khoản tương ứng
    if (!profile) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Tài khoản chưa được kích hoạt/đang bị khóa
    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Tài khoản chưa được kích hoạt hoặc đã bị tạm khóa' },
        { status: 403 }
      );
    }

    // 3. Kiểm tra tính chính xác của mật khẩu bằng hashPassword
    // Lệnh này băm mật khẩu đầu vào kết hợp muối AUTH_SALT để đối chiếu với password_hash lưu trong DB
    const inputHash = await hashPassword(password);
    
    if (inputHash !== profile.password_hash) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // 4. Khởi tạo JWT payload
    const tokenPayload = {
      sub: profile.id, // For Supabase RLS auth.uid()
      role: 'authenticated', // For Supabase RLS auth.role()
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        id: profile.id,
        role: profile.role,
        company_id: profile.company_id,
      },
      id: profile.id,
      email: profile.email,
      user_role: profile.role,
      company_id: profile.company_id,
    };

    // Lấy thời gian JWT động từ cấu hình công ty (mặc định 10 phút nếu là super_admin hoặc chưa cấu hình)
    let jwtDuration = 10;
    if (profile.company_id) {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('jwt_duration')
        .eq('id', profile.company_id)
        .maybeSingle();
      if (company?.jwt_duration) {
        jwtDuration = company.jwt_duration;
      }
    }

    // Ký JWT bằng JWT_SECRET qua helper signJWT với thời gian động
    const token = await signJWT(tokenPayload, `${jwtDuration}m`);

    // Lấy chi tiết thông tin phiên (profile, company, permissions) ở server-side để gửi về client
    const sessionData = await fetchUserSessionData(profile.id);

    // 5. Cài đặt JWT vào HTTP-only cookie để bảo mật tối đa (chống XSS)
    const response = NextResponse.json({
      success: true,
      token, // Trả về JWT token trong payload JSON
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        company_id: profile.company_id,
      },
      ...sessionData
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true, // Không cho phép truy cập cookie từ client-side JS
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi cookie qua HTTPS khi ở production
      sameSite: 'lax', // Bảo vệ chống CSRF
      path: '/', // Áp dụng cookie cho tất cả các đường dẫn trong dự án
      maxAge: 60 * jwtDuration, // Hạn dùng cookie động theo số phút được cấu hình
    });

    return response;
  } catch (error: any) {
    console.error('Lỗi trong xử lý đăng nhập:', error);
    return NextResponse.json(
      { error: `Đã xảy ra lỗi máy chủ không mong muốn: ${error.message || error}` },
      { status: 500 }
    );
  }
}
