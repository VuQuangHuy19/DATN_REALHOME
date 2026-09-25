import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/invoices
 * Truy vấn danh sách hóa đơn SaaS cho Super Admin
 * Query params:
 *  - status: 'all' | 'pending' | 'unpaid' | 'paid' | 'cancelled'
 *  - search: chuỗi tìm kiếm mã hóa đơn hoặc tên công ty
 */
export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['super_admin']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'all';
    const searchParam = searchParams.get('search')?.trim().toLowerCase() || '';

    let query = supabaseAdmin
      .from('saas_invoices')
      .select('*, companies(id, name, code, owner_name, phone)')
      .order('created_at', { ascending: false });

    if (statusParam === 'pending' || statusParam === 'unpaid') {
      query = query.in('status', ['pending', 'unpaid']);
    } else if (statusParam !== 'all') {
      query = query.eq('status', statusParam);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Lỗi khi truy vấn saas_invoices:', error);
      throw error;
    }

    let result = invoices ?? [];

    if (searchParam) {
      result = result.filter((inv: any) => {
        const codeMatch = inv.invoice_code?.toLowerCase().includes(searchParam);
        const companyMatch = inv.companies?.name?.toLowerCase().includes(searchParam);
        const ownerMatch = inv.companies?.owner_name?.toLowerCase().includes(searchParam);
        return codeMatch || companyMatch || ownerMatch;
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Lỗi GET /api/super-admin/invoices:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
