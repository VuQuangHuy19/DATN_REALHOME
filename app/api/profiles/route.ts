import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles?company_id=xxx
 * Trả về danh sách profiles theo company_id để frontend có thể map tên/SĐT nhân viên.
 * Dùng supabaseAdmin (service role) để bypass RLS.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent', 'landlord']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || auth.profile.company_id;

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Chỉ cho phép query company của chính user đó
    if (auth.profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('Lỗi lấy danh sách profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
