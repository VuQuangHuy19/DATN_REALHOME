import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getFinanceSummaryServer(companyId: string) {
  const [{ count: invoiceCount }, { data: readings }] = await Promise.all([
    supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabaseAdmin.from('service_readings').select('*').eq('company_id', companyId).limit(10),
  ]);

  return {
    invoiceCount: invoiceCount ?? 0,
    readings: readings ?? [],
  };
}
