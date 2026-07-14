import { supabase } from '../client';

export async function getDashboardStats(companyId: string, landlordId?: string) {
  if (landlordId) {
    let filterLandlordCode = landlordId;
    if (landlordId && landlordId.includes('-')) {
      const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
      filterLandlordCode = landlord?.code || landlordId;
    }

    // 1. Fetch landlord's buildings
    const { data: landlordBuildings } = await supabase
      .from('buildings')
      .select('id, name, code, area, address, total_rooms, total_floors')
      .eq('company_id', companyId)
      .eq('landlord_id', filterLandlordCode);

    const buildingCodes = (landlordBuildings ?? []).map((b: any) => b.code).filter(Boolean);

    if (buildingCodes.length === 0) {
      return {
        totalBuildings: 0,
        totalRooms: 0,
        availableRooms: 0,
        rentedRooms: 0,
        totalLeads: 0,
        newLeads: 0,
        newConsultations: 0,
        unreadNotifications: 0,
        recentAppointments: [],
        recentLeads: [],
        totalLandlords: 0,
        isLandlord: true,
        monthlyRevenue: 0,
        companyRevenue: 0,
        landlordRevenue: 0,
        totalCollectedAmount: 0,
        activeContractsCount: 0,
        occupancyRate: 0,
        buildingsList: [],
        roomsList: [],
        contractsList: [],
      };
    }

    // 2. Fetch rooms in those buildings
    const { data: landlordRooms } = await supabase
      .from('rooms')
      .select('id, building_id, status, code, floor, price, bedrooms, bathrooms, has_private_balcony, max_occupants, max_vehicles_per_room, min_contract_months')
      .eq('company_id', companyId)
      .in('building_id', buildingCodes);

    const roomRows = landlordRooms ?? [];
    const totalRooms = roomRows.length;
    const availableRooms = roomRows.filter((r: any) => r.status === 'available').length;
    const rentedRooms = roomRows.filter((r: any) => r.status === 'rented').length;
    const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

    // 3. Fetch active rental contracts
    const roomIds = roomRows.map((r: any) => r.id);
    let activeContractsCount = 0;
    let activeContractsList: any[] = [];
    if (roomIds.length > 0) {
      const { data: contracts, count } = await supabase
        .from('rental_contracts')
        .select('id, contract_code, tenant_count, start_date, end_date, rent_price, party_b_name, room_id, party_b_phone')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('room_id', roomIds);
      activeContractsCount = count ?? 0;
      activeContractsList = contracts ?? [];
    }

    // 4. Calculate monthly revenue
    const currentPeriod = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    let landlordRevenue = 0;
    let companyRevenue = 0;
    let totalCollectedAmount = 0;
    if (roomIds.length > 0) {
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total_amount, rent_amount, management_fee_amount, landlord_payout_amount')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .eq('period', currentPeriod)
        .in('room_id', roomIds);
      
      landlordRevenue = (paidInvoices ?? []).reduce((sum: number, inv: any) => {
        const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
          ? Number(inv.landlord_payout_amount)
          : Number(inv.rent_amount || 0);
        return sum + payout;
      }, 0);

      companyRevenue = (paidInvoices ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.management_fee_amount) || 0), 0);
      totalCollectedAmount = (paidInvoices ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
    }

    // 5. Fetch appointments related to those rooms
    let recentAppointments: any[] = [];
    if (roomIds.length > 0) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, status, customer_name, room_title, date, time')
        .eq('company_id', companyId)
        .in('room_id', roomIds)
        .order('date', { ascending: false })
        .limit(5);
      recentAppointments = appts ?? [];
    }

    // 6. Calculate building details with revenue & occupancy
    const buildingsList = [];
    for (const building of landlordBuildings ?? []) {
      const bRooms = roomRows.filter((r: any) => r.building_id === building.code);
      const bRoomsCount = bRooms.length;
      const bRentedCount = bRooms.filter((r: any) => r.status === 'rented').length;
      const bRoomIds = bRooms.map((r: any) => r.id);
      
      let bRevenue = 0;
      if (bRoomIds.length > 0) {
        const { data: bInvoices } = await supabase
          .from('invoices')
          .select('total_amount, rent_amount, landlord_payout_amount')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .eq('period', currentPeriod)
          .in('room_id', bRoomIds);
        
        bRevenue = (bInvoices ?? []).reduce((sum: number, inv: any) => {
          const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
            ? Number(inv.landlord_payout_amount)
            : Number(inv.rent_amount || 0);
          return sum + payout;
        }, 0);
      }

      buildingsList.push({
        ...building,
        totalRooms: bRoomsCount,
        rentedRooms: bRentedCount,
        revenue: bRevenue,
      });
    }

    let recentInvoices: any[] = [];
    if (roomIds.length > 0) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_code, period, total_amount, status, payment_date, room_id, rooms(code)')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(10);
      recentInvoices = invoices ?? [];
    }

    return {
      totalBuildings: landlordBuildings.length,
      totalRooms,
      availableRooms,
      rentedRooms,
      totalLeads: 0,
      newLeads: 0,
      newConsultations: 0,
      unreadNotifications: 0,
      recentAppointments,
      recentLeads: [],
      totalLandlords: 0,
      isLandlord: true,
      monthlyRevenue: landlordRevenue,
      companyRevenue,
      landlordRevenue,
      totalCollectedAmount,
      activeContractsCount,
      occupancyRate,
      buildingsList,
      roomsList: roomRows,
      contractsList: activeContractsList,
      recentInvoices,
    };
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentPeriod = today.toISOString().substring(0, 7); // 'YYYY-MM'
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  const [
    buildings,
    rooms,
    leads,
    appointments,
    consultations,
    notifications,
    landlords,
    paidInvoices,
    expiringContracts,
    pendingApptsToday,
    unassignedConsults,
    overdueInvs,
    revenueData,
    topEmployees,
  ] = await Promise.all([
    supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('rooms').select('id, status', { count: 'exact' }).eq('company_id', companyId),
    supabase.from('leads').select('id, status', { count: 'exact' }).eq('company_id', companyId),
    supabase.from('appointments').select('id, status, customer_name, room_title, date, time').eq('company_id', companyId).order('date', { ascending: false }).limit(5),
    supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'new'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_read', false),
    supabase.from('landlords').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('invoices').select('total_amount, rent_amount, management_fee_amount, landlord_payout_amount').eq('company_id', companyId).eq('status', 'paid').eq('period', currentPeriod),
    supabase.from('rental_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active').gte('end_date', todayStr).lte('end_date', in30DaysStr),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['Pending', 'pending']).eq('date', todayStr),
    supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'new').is('assigned_to', null),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'overdue'),
    supabase.from('invoices').select('period, total_amount, management_fee_amount').eq('company_id', companyId).eq('status', 'paid').order('period', { ascending: true }),
    supabase.from('employee_kpis').select('employee_name, score, revenue_generated, successful_deals').eq('company_id', companyId).eq('period', currentPeriod).order('score', { ascending: false }).limit(5),
  ]);

  const roomRows = (rooms.data ?? []) as { id: string; status: string }[];
  const leadRows = (leads.data ?? []) as { id: string; status: string }[];
  const recentAppointments = (appointments.data ?? []) as any[];

  const totalRooms = roomRows.length;
  const rentedRooms = roomRows.filter((r) => r.status === 'rented').length;
  const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

  const totalCollectedAmount = (paidInvoices.data ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
  const companyRevenue = (paidInvoices.data ?? []).reduce((sum: number, inv: any) => sum + (Number(inv.management_fee_amount) || 0), 0);
  const landlordRevenue = (paidInvoices.data ?? []).reduce((sum: number, inv: any) => {
    const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
      ? Number(inv.landlord_payout_amount)
      : Number(inv.rent_amount || 0);
    return sum + payout;
  }, 0);

  // revenueHistory logic
  const periodMap = (revenueData.data ?? []).reduce((acc: Record<string, { total: number; company: number }>, inv: any) => {
    if (!acc[inv.period]) {
      acc[inv.period] = { total: 0, company: 0 };
    }
    acc[inv.period].total += Number(inv.total_amount) || 0;
    acc[inv.period].company += Number(inv.management_fee_amount) || 0;
    return acc;
  }, {});
  const revenueHistory = Object.entries(periodMap)
    .map(([period, val]) => {
      const dataVal = val as { total: number; company: number };
      return { 
        period, 
        amount: dataVal.company, 
        totalCollected: dataVal.total 
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-6);

  return {
    totalBuildings: buildings.count ?? 0,
    totalRooms,
    availableRooms: roomRows.filter((r) => r.status === 'available').length,
    rentedRooms,
    totalLeads: leadRows.length,
    newLeads: leadRows.filter((l) => ['new', 'contacted', 'consulting'].includes(l.status)).length,
    newConsultations: consultations.count ?? 0,
    unreadNotifications: notifications.count ?? 0,
    recentAppointments,
    recentLeads: leadRows.slice(0, 5),
    totalLandlords: landlords.count ?? 0,
    isLandlord: false,
    monthlyRevenue: companyRevenue,
    companyRevenue,
    landlordRevenue,
    totalCollectedAmount,
    activeContractsCount: roomRows.filter((r) => r.status === 'rented').length, // active count
    occupancyRate,
    buildingsList: [],
    roomsList: [],
    contractsList: [],
    expiringContractsCount: expiringContracts.count ?? 0,
    pendingAppointmentsToday: pendingApptsToday.count ?? 0,
    unassignedConsultations: unassignedConsults.count ?? 0,
    overdueInvoices: overdueInvs.count ?? 0,
    revenueHistory,
    topEmployees: topEmployees.data ?? [],
  };
}

export async function getSalesDashboardStats(companyId: string, saleId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentPeriod = now.toISOString().slice(0, 7); // 'YYYY-MM'
  const startOfMonth = currentPeriod + '-01';

  const [
    myLeads,
    myAppointments,
    myContracts,
    availableRooms,
    notifications,
    employeeKpis,
  ] = await Promise.all([
    // Leads được giao cho sale này
    supabase
      .from('leads')
      .select('id, status, full_name, phone, created_at, assigned_to, source, last_contacted_at')
      .eq('company_id', companyId)
      .eq('assigned_to', saleId)
      .order('created_at', { ascending: false }),
    // Lịch hẹn của sale này
    supabase
      .from('appointments')
      .select('id, status, customer_name, room_title, date, time, room_id')
      .eq('company_id', companyId)
      .eq('assigned_to', saleId)
      .order('date', { ascending: false })
      .limit(20),
    // Hợp đồng cọc do sale tạo
    supabase
      .from('deposit_contracts')
      .select('id, contract_code, party_b_name, party_b_phone, deposit_amount, created_at, status, deadline_sign_contract')
      .eq('company_id', companyId)
      .eq('created_by', saleId)
      .order('created_at', { ascending: false })
      .limit(10),
    // Phòng còn trống để sale có thể tư vấn
    supabase
      .from('rooms')
      .select('id, code, status, price, building_id, buildings(name)')
      .eq('company_id', companyId)
      .eq('status', 'available')
      .limit(20),
    // Thông báo chưa đọc của sale
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('recipient_id', saleId)
      .eq('is_read', false),
    // KPI của sale trong tháng này
    supabase
      .from('employee_kpis')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', saleId)
      .eq('period', currentPeriod)
      .maybeSingle(),
  ]);

  const leadsData = (myLeads.data ?? []) as any[];
  const appointmentsData = (myAppointments.data ?? []) as any[];
  const contractsData = (myContracts.data ?? []) as any[];
  const roomsData = (availableRooms.data ?? []) as any[];

  // Phân loại leads theo trạng thái CRM
  const newLeads = leadsData.filter(l => l.status === 'new').length;
  const contactedLeads = leadsData.filter(l => l.status === 'contacted').length;
  const consultingLeads = leadsData.filter(l => l.status === 'consulting').length;
  const depositedLeads = leadsData.filter(l => l.status === 'deposited').length;
  const closedLeads = leadsData.filter(l => l.status === 'closed').length;
  const lostLeads = leadsData.filter(l => l.status === 'lost').length;

  // Lịch hẹn hôm nay
  const todayAppointments = appointmentsData.filter(a => a.date === todayStr);
  const upcomingAppointments = appointmentsData.filter(a => a.date > todayStr && a.status !== 'cancelled');
  const pendingAppointments = appointmentsData.filter(a => a.status === 'pending');

  // Hợp đồng cọc trong tháng
  const monthlyContracts = contractsData.filter(c => c.created_at >= startOfMonth);
  const totalDepositRevenue = monthlyContracts.reduce((sum: number, c: any) => sum + (c.deposit_amount || 0), 0);

  return {
    // CRM Lead stats
    totalLeads: leadsData.length,
    newLeads,
    contactedLeads,
    consultingLeads,
    depositedLeads,
    closedLeads,
    lostLeads,
    recentLeads: leadsData.slice(0, 8),
    // Appointments
    totalAppointments: appointmentsData.length,
    todayAppointments,
    upcomingAppointments: upcomingAppointments.slice(0, 5),
    pendingAppointments,
    // Contracts/Deposits
    totalContracts: contractsData.length,
    monthlyContracts,
    totalDepositRevenue,
    recentContracts: contractsData.slice(0, 5),
    // Available rooms to pitch
    availableRooms: roomsData,
    // Notifications
    unreadNotifications: notifications.count ?? 0,
    // KPI
    employeeKpis: employeeKpis.data || null,
  };
}

