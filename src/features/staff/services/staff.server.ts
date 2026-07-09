import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getStaffSummaryServer(companyId: string) {
  const { data: employees, error } = await supabaseAdmin.from('employees').select('*').eq('company_id', companyId).limit(20);
  if (error) throw error;

  return { employees: employees ?? [], kpis: (employees ?? []).length };
}
