import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Endpoint xử lý đăng xuất.
 * Xóa cookie auth_token bằng cách đặt thời gian hết hạn về quá khứ (maxAge: 0).
 */
export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công' });
  
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Xóa cookie lập tức
  });

  return response;
}
