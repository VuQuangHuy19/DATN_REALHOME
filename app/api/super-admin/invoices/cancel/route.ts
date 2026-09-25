import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/super-admin/invoices/cancel
 * Body: { invoiceId?: string, invoiceIds?: string[], reason?: string }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { invoiceId, invoiceIds, reason } = body;

    const idsToCancel: string[] = invoiceIds || (invoiceId ? [invoiceId] : []);

    if (idsToCancel.length === 0) {
      return NextResponse.json({ error: 'Thiếu mã hóa đơn invoiceId hoặc invoiceIds' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('saas_invoices')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .in('id', idsToCancel)
      .neq('status', 'paid');

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `Đã hủy ${idsToCancel.length} hóa đơn SaaS thành công`,
    });
  } catch (err: any) {
    console.error('Lỗi POST /api/super-admin/invoices/cancel:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
