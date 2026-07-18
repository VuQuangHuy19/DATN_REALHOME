import { supabaseAdmin } from '@/lib/supabase/admin';

export async function syncAgentKPI(companyId: string, employeeId: string, period: string) {
  try {
    const startDate = `${period}-01T00:00:00.000Z`;
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

    // 1. Fetch KPI config
    const { data: configData } = await supabaseAdmin
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

    // 2. Fetch employee table ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', employeeId)
      .maybeSingle();

    let employeeTableId = null;
    let employeeName = 'Unknown';
    if (profile?.email) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('email', profile.email)
        .maybeSingle();
      if (emp) {
        employeeTableId = emp.id;
        employeeName = emp.name;
      }
    }
    
    if (!employeeTableId) return; // Cannot find employee record

    // 3. Fetch existing KPI to get targets/leads if modified manually
    const { data: existingKpi } = await supabaseAdmin
      .from('employee_kpis')
      .select('id, target_revenue, total_leads, total_appointments')
      .eq('company_id', companyId)
      .eq('employee_id', employeeTableId)
      .eq('period', period)
      .maybeSingle();

    const targetRevenue = existingKpi?.target_revenue ?? config.default_target_revenue;
    const targetAppointments = existingKpi?.total_appointments ?? config.default_target_appointments;
    const targetLeads = existingKpi?.total_leads ?? config.default_target_leads;

    // 4. Fetch contracts
    const { data: deposits } = await supabaseAdmin
      .from('deposit_contracts')
      .select('rent_price, commission_amount')
      .eq('company_id', companyId)
      .eq('sales_agent_id', employeeId)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .neq('status', 'cancelled');

    const { data: rentals } = await supabaseAdmin
      .from('rental_contracts')
      .select('rent_price, commission_amount')
      .eq('company_id', companyId)
      .eq('sales_agent_id', employeeId)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .neq('status', 'cancelled');

    const totalDepositsRent = (deposits ?? []).reduce((sum: number, c) => sum + (Number(c.rent_price) || 0), 0);
    const totalDepositsComm = (deposits ?? []).reduce((sum: number, c) => sum + (Number(c.commission_amount) || 0), 0);
    const totalDepositsCount = (deposits ?? []).length;

    const totalRentalsRent = (rentals ?? []).reduce((sum: number, c) => sum + (Number(c.rent_price) || 0), 0);
    const totalRentalsComm = (rentals ?? []).reduce((sum: number, c) => sum + (Number(c.commission_amount) || 0), 0);
    const totalRentalsCount = (rentals ?? []).length;

    // 5. Cross check with converted leads count
    let convertedLeadsCount = 0;
    const { data: convertedLeads } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .eq('assigned_to', employeeId)
      .gte('converted_at', startDate)
      .lt('converted_at', endDate);
    convertedLeadsCount = (convertedLeads ?? []).length;

    // 6. Fetch completed/viewed appointments count
    let appointmentsCompletedCount = 0;
    const { data: appts } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('company_id', companyId)
      .eq('assigned_to', employeeId)
      .gte('date', period + '-01')
      .lte('date', period + '-31')
      .in('status', ['confirmed', 'completed', 'viewed', 'Viewed', 'Dealed', 'Confirm']);
    appointmentsCompletedCount = (appts ?? []).length;

    // 7. Calculate dynamic weighted performance score
    const revenueVal = totalDepositsRent + totalRentalsRent;
    const revenueRatio = targetRevenue > 0 ? (revenueVal / targetRevenue) : 0;
    const appointmentRatio = targetAppointments > 0 ? (appointmentsCompletedCount / targetAppointments) : 0;
    const leadRatio = targetLeads > 0 ? (convertedLeadsCount / targetLeads) : 0;

    const revenueScore = Math.min(revenueRatio, 1.0) * 100 * Number(config.revenue_weight);
    const appointmentScore = Math.min(appointmentRatio, 1.0) * 100 * Number(config.appointment_weight);
    const leadScore = Math.min(leadRatio, 1.0) * 100 * Number(config.lead_weight);

    const score = Math.round(revenueScore + appointmentScore + leadScore);
    
    let status = 'on_track';
    if (score >= 90 || revenueVal > targetRevenue) status = 'exceeded';
    else if (score < 70 || revenueVal < targetRevenue * 0.8) status = 'behind';

    const payload = {
      company_id: companyId,
      employee_id: employeeTableId,
      employee_name: employeeName,
      period,
      total_leads: targetLeads,
      total_appointments: appointmentsCompletedCount,
      successful_deals: totalDepositsCount + totalRentalsCount,
      conversion_rate: 0,
      revenue_generated: revenueVal,
      target_revenue: targetRevenue,
      score,
      status,
      auto_calculated: true,
      commission_earned: totalDepositsComm + totalRentalsComm,
      converted_leads_count: convertedLeadsCount,
    };

    if (existingKpi?.id) {
      await supabaseAdmin.from('employee_kpis').update(payload).eq('id', existingKpi.id);
    } else {
      await supabaseAdmin.from('employee_kpis').insert(payload);
    }
  } catch (error) {
    console.error('Error in syncAgentKPI:', error);
  }
}
