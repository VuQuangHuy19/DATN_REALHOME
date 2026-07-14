import { supabase } from '@/lib/supabase/client';
import type { DBEmployeeKPI } from '@/lib/supabase/types';

type KPIInsert = Omit<DBEmployeeKPI, 'id' | 'created_at' | 'updated_at'>;
type KPIUpdate = Partial<KPIInsert>;

export async function getKPIs(companyId?: string): Promise<DBEmployeeKPI[]> {
  let q = supabase.from('employee_kpis').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBEmployeeKPI[];
}

export async function createKPI(k: KPIInsert): Promise<DBEmployeeKPI> {
  const { data, error } = await supabase.from('employee_kpis').insert(k as any).select().single();
  if (error) throw error;
  return data as unknown as DBEmployeeKPI;
}

export async function updateKPI(id: string, k: KPIUpdate): Promise<DBEmployeeKPI> {
  const { data, error } = await supabase
    .from('employee_kpis').update({ ...(k as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as DBEmployeeKPI;
}

export async function deleteKPI(id: string) {
  const { error } = await supabase.from('employee_kpis').delete().eq('id', id);
  if (error) throw error;
}

export async function computeAutoKPI(
  companyId: string,
  employeeId: string,
  period: string
): Promise<{ revenue_generated: number; successful_deals: number; commission_earned: number; converted_leads_count?: number }> {
  const startDate = `${period}-01T00:00:00.000Z`;
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

  const { data: deposits, error: depError } = await supabase
    .from('deposit_contracts')
    .select('rent_price, commission_amount')
    .eq('company_id', companyId)
    .eq('sales_agent_id', employeeId)
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .neq('status', 'cancelled');

  if (depError) throw depError;

  const { data: rentals, error: rentError } = await supabase
    .from('rental_contracts')
    .select('rent_price, commission_amount')
    .eq('company_id', companyId)
    .eq('sales_agent_id', employeeId)
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .neq('status', 'cancelled');

  if (rentError) throw rentError;

  const totalDepositsRent = (deposits ?? []).reduce((sum: number, c: any) => sum + (Number(c.rent_price) || 0), 0);
  const totalDepositsComm = (deposits ?? []).reduce((sum: number, c: any) => sum + (Number(c.commission_amount) || 0), 0);
  const totalDepositsCount = (deposits ?? []).length;

  const totalRentalsRent = (rentals ?? []).reduce((sum: number, c: any) => sum + (Number(c.rent_price) || 0), 0);
  const totalRentalsComm = (rentals ?? []).reduce((sum: number, c: any) => sum + (Number(c.commission_amount) || 0), 0);
  const totalRentalsCount = (rentals ?? []).length;

  // Cross check with converted leads count
  let convertedLeadsCount = 0;
  try {
    const { data: convertedLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .eq('assigned_to', employeeId)
      .gte('converted_at', startDate)
      .lt('converted_at', endDate);
    convertedLeadsCount = (convertedLeads ?? []).length;
  } catch (err) {
    console.error('Error fetching cross-check leads:', err);
  }

  return {
    revenue_generated: totalDepositsRent + totalRentalsRent,
    successful_deals: totalDepositsCount + totalRentalsCount,
    commission_earned: totalDepositsComm + totalRentalsComm,
    converted_leads_count: convertedLeadsCount,
  };
}

