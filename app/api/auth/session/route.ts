import { NextResponse } from 'next/server';
import { verifyJWT, fetchUserSessionData } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint kiểm tra session hiện tại từ Cookie auth_token.
 * Trả về thông tin user đã giải mã từ JWT hoặc null nếu chưa đăng nhập/hết hạn.
 */
export async function GET(request: Request) {
  try {
    // Đọc cookie auth_token từ request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');

    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Xác thực token JWT bằng JWT_SECRET qua verifyJWT
    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.json({ user: null });
    }

    // Lấy thông tin chi tiết phiên (profile, company, permissions) ở server-side để trả về
    const sessionData = await fetchUserSessionData(payload.id);

    return NextResponse.json({
      token, // Trả về token cho client-side Supabase client
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.user_role || payload.role,
        company_id: payload.company_id,
      },
      ...sessionData
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin session:', error);
    return NextResponse.json({ user: null }, { status: 500 });
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
