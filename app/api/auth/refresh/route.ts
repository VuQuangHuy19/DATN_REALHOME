import { NextResponse } from 'next/server';
import { verifyJWT, signJWT } from '@/lib/auth-utils';

export const runtime = 'nodejs';

/**
 * Endpoint gia hạn JWT token (Sliding Session).
 * Khi client gọi API này (khi người dùng còn hoạt động),
 * server sẽ kiểm tra token hiện tại và cấp lại JWT mới có thời hạn 60 phút.
 */
export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    let token = '';

    // Tìm cookie auth_token
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k.trim() === 'auth_token' && v) {
        token = decodeURIComponent(v.trim());
        break;
      }
    }

    // Nếu không có cookie, kiểm tra Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin xác thực' },
        { status: 401 }
      );
    }

    // Xác thực JWT token hiện tại
    const payload = await verifyJWT(token);
    if (!payload || (!payload.id && !payload.sub)) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' },
        { status: 401 }
      );
    }

    const userId = payload.id || payload.sub;

    // Khởi tạo JWT payload mới với thông tin hiện có
    const newTokenPayload = {
      sub: userId,
      role: payload.role || 'authenticated',
      app_metadata: payload.app_metadata || { provider: 'email', providers: ['email'] },
      user_metadata: payload.user_metadata || {
        id: userId,
        role: payload.user_role || payload.role,
        company_id: payload.company_id,
      },
      id: userId,
      email: payload.email,
      user_role: payload.user_role || payload.role,
      company_id: payload.company_id,
    };

    // Ký JWT mới với thời hạn 60 phút
    const jwtDurationMinutes = 60;
    const newToken = await signJWT(newTokenPayload, `${jwtDurationMinutes}m`);

    const response = NextResponse.json({
      success: true,
      message: 'Gia hạn phiên đăng nhập thành công',
      token: newToken,
    });

    // Thiết lập cookie auth_token mới với thời gian 60 phút (3600 giây)
    response.cookies.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * jwtDurationMinutes, // 3600 giây = 60 phút
    });

    return response;
  } catch (error: any) {
    console.error('Lỗi khi gia hạn token:', error);
    return NextResponse.json(
      { error: `Không thể gia hạn phiên đăng nhập: ${error.message || error}` },
      { status: 500 }
    );
  }
}
