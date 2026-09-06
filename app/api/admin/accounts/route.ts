import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || auth.profile.company_id;

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    if (auth.profile.role !== 'super_admin' && auth.profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role, is_active, kyc_status, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(profiles ?? []);
  } catch (error: any) {
    console.error('Lỗi lấy danh sách tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { userId, is_active, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
    }

    const { data: targetProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, role, email')
      .eq('id', userId)
      .single();

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    if (auth.profile.role !== 'super_admin' && targetProfile.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'toggle_status') {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await supabaseAdmin
        .from('employees')
        .update({ status: is_active ? 'active' : 'inactive' })
        .eq('profile_id', userId);

      return NextResponse.json({ success: true, user: updated });
    }

    if (action === 'reset_password') {
      if (!targetProfile.email) {
        return NextResponse.json({ error: 'Tài khoản không có email' }, { status: 400 });
      }
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const { error: resetErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: targetProfile.email,
        options: {
          redirectTo: `${siteUrl}/auth/reset-password`,
        },
      });

      if (resetErr) throw resetErr;

      return NextResponse.json({ success: true, message: `Đã phát lệnh đặt lại mật khẩu cho ${targetProfile.email}` });
    }

    return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Lỗi cập nhật tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
