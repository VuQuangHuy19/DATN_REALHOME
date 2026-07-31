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
): Promise<{
  revenue_generated: number;
  successful_deals: number;
  commission_earned: number;
  converted_leads_count?: number;
  score?: number;
  target_revenue?: number;
  total_appointments?: number;
}> {
  const startDate = `${period}-01T00:00:00.000Z`;
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

  // 1. Fetch KPI configuration rules for company
  const { data: configData } = await supabase
    .from('kpi_configurations')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  const config = configData || {
    revenue_weight: 0.50,
    appointment_weight: 0.30,
    lead_weight: 0.20,
    default_target_revenue: 50000000,
    default_target_appointments: 10,
    default_target_leads: 20,
  };

  // 2. Resolve employee table ID from profile email to fetch existing target configurations
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', employeeId)
    .maybeSingle();

  let employeeTableId = null;
  if (profile?.email) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', profile.email)
      .maybeSingle();
    if (emp) {
      employeeTableId = emp.id;
    }
  }

  // 3. Fetch existing KPI rules target from database
  const { data: existingKpi } = await supabase
    .from('employee_kpis')
    .select('target_revenue, total_leads, total_appointments')
    .eq('company_id', companyId)
    .eq('employee_id', employeeTableId || employeeId)
    .eq('period', period)
    .maybeSingle();

  const targetRevenue = existingKpi?.target_revenue ?? config.default_target_revenue;
  const targetAppointments = existingKpi?.total_appointments ?? config.default_target_appointments;
  const targetLeads = existingKpi?.total_leads ?? config.default_target_leads;

  // 4. Fetch contracts
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

  // 5. Cross check with converted leads count
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

  // 6. Fetch completed/viewed appointments count
  let appointmentsCompletedCount = 0;
  try {
    const { data: appts } = await supabase
      .from('appointments')
      .select('id')
      .eq('company_id', companyId)
      .eq('assigned_to', employeeId)
      .gte('date', period + '-01')
      .lte('date', period + '-31')
      .in('status', ['confirmed', 'completed', 'viewed', 'Viewed', 'Dealed', 'Confirm']);
    appointmentsCompletedCount = (appts ?? []).length;
  } catch (err) {
    console.error('Error fetching appointments completed count:', err);
  }

  // 7. Calculate dynamic weighted performance score
  const revenueVal = totalDepositsRent + totalRentalsRent;
  const totalLandlordComm = totalDepositsComm + totalRentalsComm;

  let calculatedSaleCommission = totalLandlordComm;
  const commMode = (config as any).sale_commission_mode || 'fixed';
  
  if (commMode === 'fixed') {
    const fixedRate = (config as any).sale_commission_fixed_rate ?? 0.60;
    calculatedSaleCommission = totalLandlordComm * fixedRate;
  } else if (commMode === 'tier') {
    const tiers = (config as any).sale_commission_tiers || [
      { minRevenue: 0, maxRevenue: 12500000, rate: 0.30 },
      { minRevenue: 12500000, maxRevenue: 25000000, rate: 0.34 },
      { minRevenue: 25000000, maxRevenue: 999999999, rate: 0.40 },
    ];
    const matchedTier = tiers.find((t: any) => revenueVal >= t.minRevenue && revenueVal <= t.maxRevenue) || tiers[tiers.length - 1];
    calculatedSaleCommission = totalLandlordComm * (matchedTier?.rate ?? 0.35);
  }

  const revenueRatio = targetRevenue > 0 ? (revenueVal / targetRevenue) : 0;
  const appointmentRatio = targetAppointments > 0 ? (appointmentsCompletedCount / targetAppointments) : 0;
  const leadRatio = targetLeads > 0 ? (convertedLeadsCount / targetLeads) : 0;

  // Capped at 1.0 (100%) achievement rate per component to align with weight ranges
  const revenueScore = Math.min(revenueRatio, 1.0) * 100 * Number(config.revenue_weight);
  const appointmentScore = Math.min(appointmentRatio, 1.0) * 100 * Number(config.appointment_weight);
  const leadScore = Math.min(leadRatio, 1.0) * 100 * Number(config.lead_weight);

  const score = Math.round(revenueScore + appointmentScore + leadScore);

  return {
    revenue_generated: revenueVal,
    successful_deals: totalDepositsCount + totalRentalsCount,
    commission_earned: Math.round(calculatedSaleCommission),
    converted_leads_count: convertedLeadsCount,
    score: score,
    target_revenue: targetRevenue,
    total_appointments: appointmentsCompletedCount,
  };
}

