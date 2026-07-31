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
    { minRevenue: 0, maxRevenue: 10500000, rate: 0.30, label: 'Mốc 1 (0 - 10.5M)' },
    { minRevenue: 12500000, maxRevenue: 25000000, rate: 0.34, label: 'Mốc 2 (12.5M - 25M)' },
    { minRevenue: 25000000, maxRevenue: 999999999, rate: 0.40, label: 'Mốc 3 (Trển 25M)' },
  ],
};

export async function getKPIConfiguration(companyId: string): Promise<any> {
  const [kpiRes, commRes] = await Promise.all([
    supabase
      .from('kpi_configurations')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('contract_templates')
      .select('content')
      .eq('type', 'system_sales_commission')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let commConfig: any = {};
  if (commRes.data?.content) {
    try {
      commConfig = JSON.parse(commRes.data.content);
    } catch (e) {
      console.error('Error parsing comm config from DB:', e);
    }
  }

  // LocalStorage fallback for client offline responsiveness
  if (typeof window !== 'undefined' && (!commConfig || !commConfig.sale_commission_mode)) {
    try {
      const raw = localStorage.getItem(`sale_comm_config_${companyId}`);
      if (raw) commConfig = JSON.parse(raw);
    } catch (e) {
      console.error('Error loading local comm config:', e);
    }
  }

  const baseConfig = kpiRes.data || {
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
    sale_commission_mode: commConfig.sale_commission_mode || (baseConfig as any).sale_commission_mode || DEFAULT_KPI_CONFIGURATION.sale_commission_mode,
    sale_commission_fixed_rate: commConfig.sale_commission_fixed_rate ?? (baseConfig as any).sale_commission_fixed_rate ?? DEFAULT_KPI_CONFIGURATION.sale_commission_fixed_rate,
    sale_commission_tiers: commConfig.sale_commission_tiers || (baseConfig as any).sale_commission_tiers || DEFAULT_KPI_CONFIGURATION.sale_commission_tiers,
  };
}

export async function saveKPIConfiguration(
  companyId: string,
  config: any
): Promise<any> {
  const commData = {
    sale_commission_mode: config.sale_commission_mode || 'fixed',
    sale_commission_fixed_rate: config.sale_commission_fixed_rate ?? 0.60,
    sale_commission_tiers: config.sale_commission_tiers || DEFAULT_KPI_CONFIGURATION.sale_commission_tiers,
  };

  // Save to DB via contract_templates system record for server & client access
  if (companyId) {
    try {
      const { data: existingTemplate } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('company_id', companyId)
        .eq('type', 'system_sales_commission')
        .maybeSingle();

      if (existingTemplate?.id) {
        await supabase
          .from('contract_templates')
          .update({
            content: JSON.stringify(commData),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTemplate.id);
      } else {
        await supabase
          .from('contract_templates')
          .insert({
            company_id: companyId,
            name: 'System Sales Commission Configuration',
            type: 'system_sales_commission',
            content: JSON.stringify(commData),
          });
      }
    } catch (e) {
      console.error('Error saving sales comm to contract_templates:', e);
    }
  }

  // Also sync to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sale_comm_config_${companyId}`, JSON.stringify(commData));
    } catch (e) {
      console.error('Error saving local comm config:', e);
    }
  }

  // Strip out non-existent columns for kpi_configurations DB table
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
    ...commData,
  };
}

export interface SaleCommissionInfo {
  mode: 'fixed' | 'tier' | 'custom';
  calculatedCommission: number;
  collectedCommission: number; // Hoa hồng thực nhận (đã được Chủ nhà thanh toán)
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
  config?: any,
  collectedGrossCommission: number = 0
): SaleCommissionInfo {
  const mode = config?.sale_commission_mode || 'fixed';
  const fixedRate = config?.sale_commission_fixed_rate ?? 0.60;
  const tiers = config?.sale_commission_tiers || DEFAULT_KPI_CONFIGURATION.sale_commission_tiers;

  const baseAmount = totalGrossCommission > 0 ? totalGrossCommission : totalRevenue;
  const collectedBaseAmount = collectedGrossCommission > 0 ? collectedGrossCommission : 0;

  if (mode === 'fixed') {
    return {
      mode: 'fixed',
      calculatedCommission: Math.round(baseAmount * fixedRate),
      collectedCommission: Math.round(collectedBaseAmount * fixedRate),
      currentRate: fixedRate,
      currentTierLabel: `% Cố định (${Math.round(fixedRate * 100)}%)`,
      progressPercent: 100,
    };
  }

  if (mode === 'tier' && Array.isArray(tiers) && tiers.length > 0) {
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
    const currentTierLabel = currentTier.label || `Mốc ${currentTierIdx + 1} (${Math.round(currentRate * 100)}%)`;
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
      nextTierLabel = nextTier.label || `Mốc ${currentTierIdx + 2} (${Math.round((nextTierRate || 0) * 100)}%)`;
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
      calculatedCommission: Math.round(baseAmount * currentRate),
      collectedCommission: Math.round(collectedBaseAmount * currentRate),
      currentRate,
      currentTierLabel: `Mốc ${currentTierIdx + 1} (${Math.round(currentRate * 100)}%)`,
      nextTierRate,
      nextTierLabel: `Mốc ${currentTierIdx + 2} (${Math.round((nextTierRate || 0) * 100)}%)`,
      nextTierMinRevenue,
      amountNeeded,
      progressPercent,
    };
  }

  // Fallback / Custom mode
  return {
    mode: 'custom',
    calculatedCommission: Math.round(baseAmount * fixedRate),
    collectedCommission: Math.round(collectedBaseAmount * fixedRate),
    currentRate: fixedRate,
    currentTierLabel: 'Tùy chỉnh',
    progressPercent: 100,
  };
}
