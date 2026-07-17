import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    // Lấy token từ Authorization header hoặc cookie
    let token = '';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      const cookieHeader = request.headers.get('cookie') || '';
      const pairs = cookieHeader.split(';');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k?.trim() === 'auth_token') {
          token = decodeURIComponent(v?.trim() ?? '');
          break;
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !(payload.sub || payload.id)) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }, { status: 401 });
    }

    const userId = (payload.sub || payload.id) as string;

    const body = await request.json();
    const { full_name, phone, avatar_url } = body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(full_name !== undefined && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(avatar_url !== undefined && { avatar_url }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error('Lỗi cập nhật hồ sơ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
