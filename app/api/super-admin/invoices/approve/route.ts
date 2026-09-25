import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function approveSingleInvoice(invoiceId: string, note?: string) {
  const { data: invoice, error: fetchErr } = await supabaseAdmin
    .from('saas_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (fetchErr || !invoice) {
    throw new Error(`Không tìm thấy hóa đơn SaaS với ID ${invoiceId}`);
  }

  if (invoice.status === 'paid') {
    return { id: invoiceId, status: 'already_paid' };
  }

  const now = new Date();
  const isAddon = (invoice.plan && invoice.plan.endsWith('_addon')) || (invoice.invoice_code && invoice.invoice_code.startsWith('INV-ADDON-'));

  const { error: updateInvoiceErr } = await supabaseAdmin
    .from('saas_invoices')
    .update({
      status: 'paid',
      payment_method: invoice.payment_method || 'manual_approval',
      updated_at: now.toISOString(),
    })
    .eq('id', invoice.id);

  if (updateInvoiceErr) throw updateInvoiceErr;

  if (isAddon) {
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('company_id', invoice.company_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      const newSeats = (activeSub.seats || 0) + (invoice.seats || 0);
      await supabaseAdmin
        .from('subscriptions')
        .update({ seats: newSeats, updated_at: now.toISOString() })
        .eq('id', activeSub.id);

      await supabaseAdmin
        .from('saas_invoices')
        .update({ subscription_id: activeSub.id })
        .eq('id', invoice.id);
    } else {
      const basePlan = (invoice.plan || 'starter').replace('_addon', '');
      const { data: newSub } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          company_id: invoice.company_id,
          plan: basePlan,
          status: 'active',
          seats: invoice.seats || 5,
          price_per_month: invoice.amount,
          starts_at: invoice.billing_period_start || now.toISOString(),
          ends_at: invoice.billing_period_end || null,
        })
        .select()
        .single();

      if (newSub) {
        await supabaseAdmin
          .from('saas_invoices')
          .update({ subscription_id: newSub.id })
          .eq('id', invoice.id);
      }
    }

    await supabaseAdmin
      .from('companies')
      .update({ status: 'active', updated_at: now.toISOString() })
      .eq('id', invoice.company_id);
  } else {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('company_id', invoice.company_id)
      .eq('status', 'active');

    const { data: newSub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id: invoice.company_id,
        plan: invoice.plan || 'starter',
        status: 'active',
        seats: invoice.seats || 5,
        price_per_month: invoice.amount,
        starts_at: invoice.billing_period_start || now.toISOString(),
        ends_at: invoice.billing_period_end || null,
      })
      .select()
      .single();

    if (subErr) throw subErr;

    if (newSub) {
      await supabaseAdmin
        .from('saas_invoices')
        .update({ subscription_id: newSub.id })
        .eq('id', invoice.id);
    }

    await supabaseAdmin
      .from('companies')
      .update({
        status: 'active',
        plan: invoice.plan,
        updated_at: now.toISOString(),
      })
      .eq('id', invoice.company_id);
  }

  return { id: invoiceId, status: 'approved' };
}

/**
 * POST /api/super-admin/invoices/approve
 * Body: { invoiceId?: string, invoiceIds?: string[], note?: string }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { invoiceId, invoiceIds, note } = body;

    const idsToApprove: string[] = invoiceIds || (invoiceId ? [invoiceId] : []);

    if (idsToApprove.length === 0) {
      return NextResponse.json({ error: 'Thiếu mã hóa đơn invoiceId hoặc invoiceIds' }, { status: 400 });
    }

    const results = [];
    for (const id of idsToApprove) {
      try {
        const res = await approveSingleInvoice(id, note);
        results.push(res);
      } catch (err: any) {
        console.error(`Lỗi phê duyệt hóa đơn ${id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      approvedCount: results.length,
      message: `Đã phê duyệt ${results.length} hóa đơn SaaS thành công`,
    });
  } catch (err: any) {
    console.error('Lỗi POST /api/super-admin/invoices/approve:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
