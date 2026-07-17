import { supabase } from '@/lib/supabase/client';
import type { DBKPIConfiguration, Database } from '@/lib/supabase/types';

export type KPIConfigurationInsert = Database['public']['Tables']['kpi_configurations']['Insert'];
export type KPIConfigurationUpdate = Database['public']['Tables']['kpi_configurations']['Update'];

export const DEFAULT_KPI_CONFIGURATION = {
  revenue_weight: 0.50,
  appointment_weight: 0.30,
  lead_weight: 0.20,
  default_target_revenue: 50000000,
  default_target_appointments: 10,
  default_target_leads: 20,
};

export async function getKPIConfiguration(companyId: string): Promise<DBKPIConfiguration> {
  const { data, error } = await supabase
    .from('kpi_configurations')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      id: '',
      company_id: companyId,
      ...DEFAULT_KPI_CONFIGURATION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      updated_by: null,
    } as DBKPIConfiguration;
  }

  return data as DBKPIConfiguration;
}

export async function saveKPIConfiguration(
  companyId: string,
  config: Omit<KPIConfigurationInsert, 'company_id'>
): Promise<DBKPIConfiguration> {
  const { data: existing } = await supabase
    .from('kpi_configurations')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('kpi_configurations')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    return data as DBKPIConfiguration;
  } else {
    const { data, error } = await supabase
      .from('kpi_configurations')
      .insert({
        ...config,
        company_id: companyId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as DBKPIConfiguration;
  }
}
