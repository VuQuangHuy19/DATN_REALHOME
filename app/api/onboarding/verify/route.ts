import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashRawToken } from '@/lib/auth/onboarding-token';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Thiếu token xác thực' }, { status: 400 });
    }

    // 1. Băm SHA-256 mã token thô nhận được từ query parameter
    const tokenHash = hashRawToken(token);

    // 2. Tìm kiếm bản ghi tương ứng trong bảng tenant_invitations
    const { data: invitation, error } = await supabaseAdmin
      .from('tenant_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc không tồn tại' }, { status: 400 });
    }

    // 3. Kiểm tra xem token đã được sử dụng chưa
    if (invitation.used_at !== null) {
      return NextResponse.json({ error: 'Token này đã được sử dụng trước đó' }, { status: 400 });
    }

    // 4. Kiểm tra xem token đã hết hạn chưa
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token đã hết hiệu lực (quá hạn 48 giờ)' }, { status: 400 });
    }

    // 5. Trả về thông tin hợp lệ
    return NextResponse.json({
      email: invitation.email,
      company_id: invitation.company_id,
      profile_id: invitation.profile_id,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
