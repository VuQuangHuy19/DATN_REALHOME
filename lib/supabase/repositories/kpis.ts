import { supabase } from '../client';
import type { DBEmployeeKPI } from '../types';

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
