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
  sale_commission_mode: 'fixed' as 'fixed' | 'tier' | 'custom',
  sale_commission_fixed_rate: 0.60, // 60% của hoa hồng thu từ Chủ nhà
  sale_commission_tiers: [
    { minRevenue: 0, maxRevenue: 12500000, rate: 0.30, label: 'Dưới 12.5 triệu' },
    { minRevenue: 12500000, maxRevenue: 25000000, rate: 0.34, label: 'Từ 12.5tr - 25 triệu' },
    { minRevenue: 25000000, maxRevenue: 999999999, rate: 0.40, label: 'Trên 25 triệu' },
  ],
};

export async function getKPIConfiguration(companyId: string): Promise<any> {
  const { data } = await supabase
    .from('kpi_configurations')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  let localCommConfig: any = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`sale_comm_config_${companyId}`);
      if (raw) localCommConfig = JSON.parse(raw);
    } catch (e) {
      console.error('Error loading local comm config:', e);
    }
  }

  const baseConfig = data || {
    id: '',
    company_id: companyId,
    ...DEFAULT_KPI_CONFIGURATION,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  };

  return {
    ...baseConfig,
    sale_commission_mode: localCommConfig.sale_commission_mode || (baseConfig as any).sale_commission_mode || 'fixed',
    sale_commission_fixed_rate: localCommConfig.sale_commission_fixed_rate ?? (baseConfig as any).sale_commission_fixed_rate ?? 0.60,
    sale_commission_tiers: localCommConfig.sale_commission_tiers || (baseConfig as any).sale_commission_tiers || DEFAULT_KPI_CONFIGURATION.sale_commission_tiers,
  };
}

export async function saveKPIConfiguration(
  companyId: string,
  config: any
): Promise<any> {
  // Save sale commission configurations locally so it works seamlessly without database migration error
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sale_comm_config_${companyId}`, JSON.stringify({
        sale_commission_mode: config.sale_commission_mode,
        sale_commission_fixed_rate: config.sale_commission_fixed_rate,
        sale_commission_tiers: config.sale_commission_tiers,
      }));
    } catch (e) {
      console.error('Error saving local comm config:', e);
    }
  }

  // Strip out fields that don't exist in Supabase kpi_configurations table schema to avoid PostgREST column errors
  const dbPayload = {
    revenue_weight: config.revenue_weight,
    appointment_weight: config.appointment_weight,
    lead_weight: config.lead_weight,
    default_target_revenue: config.default_target_revenue,
    default_target_appointments: config.default_target_appointments,
    default_target_leads: config.default_target_leads,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('kpi_configurations')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle();

  let resultData;
  if (existing) {
    const { data, error } = await supabase
      .from('kpi_configurations')
      .update(dbPayload)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    resultData = data;
  } else {
    const { data, error } = await supabase
      .from('kpi_configurations')
      .insert({
        ...dbPayload,
        company_id: companyId,
      })
      .select()
      .single();

    if (error) throw error;
    resultData = data;
  }

  return {
    ...resultData,
    sale_commission_mode: config.sale_commission_mode || 'fixed',
    sale_commission_fixed_rate: config.sale_commission_fixed_rate ?? 0.60,
    sale_commission_tiers: config.sale_commission_tiers || DEFAULT_KPI_CONFIGURATION.sale_commission_tiers,
  };
}

export interface SaleCommissionInfo {
  mode: 'fixed' | 'tier' | 'custom';
  calculatedCommission: number;
  currentRate: number;
  currentTierLabel: string;
  nextTierRate?: number;
  nextTierLabel?: string;
  nextTierMinRevenue?: number;
  amountNeeded?: number;
  progressPercent: number;
}

export function calculateSaleCommissionInfo(
  totalRevenue: number,
  totalGrossCommission: number,
  config?: any
): SaleCommissionInfo {
  const mode = config?.sale_commission_mode || 'fixed';
  const fixedRate = config?.sale_commission_fixed_rate ?? 0.60;
  const tiers = config?.sale_commission_tiers || DEFAULT_KPI_CONFIGURATION.sale_commission_tiers;

  // Base amount: if totalGrossCommission > 0 use it, else fallback to totalRevenue
  const baseAmount = totalGrossCommission > 0 ? totalGrossCommission : totalRevenue;

  if (mode === 'fixed') {
    return {
      mode: 'fixed',
      calculatedCommission: baseAmount * fixedRate,
      currentRate: fixedRate,
      currentTierLabel: `% Cố định (${Math.round(fixedRate * 100)}%)`,
      progressPercent: 100,
    };
  }

  if (mode === 'tier' && Array.isArray(tiers) && tiers.length > 0) {
    // Sort tiers by minRevenue ascending
    const sortedTiers = [...tiers].sort((a, b) => (Number(a.minRevenue) || 0) - (Number(b.minRevenue) || 0));
    
    let currentTierIdx = 0;
    for (let i = 0; i < sortedTiers.length; i++) {
      const min = Number(sortedTiers[i].minRevenue) || 0;
      if (totalRevenue >= min) {
        currentTierIdx = i;
      }
    }

    const currentTier = sortedTiers[currentTierIdx];
    const currentRate = Number(currentTier.rate) || 0.30;
    const currentTierLabel = currentTier.label || `Mốc ${currentTierIdx + 1}`;
    const currentMin = Number(currentTier.minRevenue) || 0;
    const currentMax = Number(currentTier.maxRevenue) || 999999999;

    const nextTier = sortedTiers[currentTierIdx + 1];
    let nextTierRate: number | undefined;
    let nextTierLabel: string | undefined;
    let nextTierMinRevenue: number | undefined;
    let amountNeeded: number | undefined;
    let progressPercent = 100;

    if (nextTier) {
      nextTierRate = Number(nextTier.rate) || 0.40;
      nextTierLabel = nextTier.label || `Mốc ${currentTierIdx + 2}`;
      nextTierMinRevenue = Number(nextTier.minRevenue) || currentMax;
      amountNeeded = Math.max(0, nextTierMinRevenue - totalRevenue);

      const span = nextTierMinRevenue - currentMin;
      if (span > 0) {
        const achieved = totalRevenue - currentMin;
        progressPercent = Math.min(100, Math.max(8, Math.round((achieved / span) * 100)));
      }
    }

    return {
      mode: 'tier',
      calculatedCommission: baseAmount * currentRate,
      currentRate,
      currentTierLabel: `Bậc ${currentTierIdx + 1} (${Math.round(currentRate * 100)}%)`,
      nextTierRate,
      nextTierLabel: `Bậc ${currentTierIdx + 2} (${Math.round((nextTierRate || 0) * 100)}%)`,
      nextTierMinRevenue,
      amountNeeded,
      progressPercent,
    };
  }

  // Fallback / Custom mode
  return {
    mode: 'custom',
    calculatedCommission: baseAmount * fixedRate,
    currentRate: fixedRate,
    currentTierLabel: 'Tùy chỉnh',
    progressPercent: 100,
  };
}
