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

    let landlordRevenueHistory: any[] = [];
    if (roomIds.length > 0) {
      const { data: invoiceHistory } = await supabase
        .from('invoices')
        .select('period, rent_amount, electricity_amount, water_amount, service_amount, total_amount, status')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .in('room_id', roomIds)
        .order('period', { ascending: true });
      landlordRevenueHistory = invoiceHistory ?? [];
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
      landlordRevenueHistory,
    };
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentPeriod = today.toISOString().substring(0, 7); // 'YYYY-MM'
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const startOf6MonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`;

  const [
    buildingsRes,
    roomsRes,
    leadsRes,
    appointmentsRes,
    consultationsRes,
    notificationsRes,
    landlordsRes,
    paidInvoicesRes,
    expiringContractsRes,
    pendingApptsTodayRes,
    unassignedConsultsRes,
    overdueInvsRes,
    depositContractsHistoryRes,
    topEmployeesRes,
    activeContractsRes,
    dynamicDepositsRes,
    dynamicRentalsRes,
    rentalContractsHistoryRes,
  ] = await Promise.all([
    supabase.from('buildings').select('id, name, code, area, address, total_rooms, total_floors').eq('company_id', companyId),
    supabase.from('rooms').select('id, building_id, landlord_id, status, code, floor, price, bedrooms, bathrooms, has_private_balcony, max_occupants, max_vehicles_per_room, min_contract_months').eq('company_id', companyId),
    supabase.from('leads').select('*').eq('company_id', companyId),
    supabase.from('appointments').select('id, status, customer_name, room_title, date, time').eq('company_id', companyId).order('date', { ascending: false }).limit(5),
    supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'new'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_read', false),
    supabase.from('landlords').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('invoices').select('total_amount, rent_amount, management_fee_amount, landlord_payout_amount, room_id').eq('company_id', companyId).eq('status', 'paid').eq('period', currentPeriod),
    supabase.from('rental_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active').gte('end_date', todayStr).lte('end_date', in30DaysStr),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['Pending', 'pending']).eq('date', todayStr),
    supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'new').is('assigned_to', null),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'overdue'),
    supabase.from('deposit_contracts').select('commission_amount, created_at').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', startOf6MonthsAgoStr),
    supabase.from('employee_kpis').select('employee_name, score, revenue_generated, successful_deals').eq('company_id', companyId).eq('period', currentPeriod).order('score', { ascending: false }).limit(5),
    supabase.from('rental_contracts').select('id, contract_code, tenant_count, start_date, end_date, rent_price, party_b_name, room_id, party_b_phone').eq('company_id', companyId).eq('status', 'active'),
    supabase.from('deposit_contracts').select('rent_price, commission_amount, sales_agent_id, created_by').eq('company_id', companyId).gte('created_at', `${currentPeriod}-01T00:00:00.000Z`).neq('status', 'cancelled'),
    supabase.from('rental_contracts').select('rent_price, commission_amount, sales_agent_id, created_by').eq('company_id', companyId).gte('created_at', `${currentPeriod}-01T00:00:00.000Z`).neq('status', 'cancelled'),
    supabase.from('rental_contracts').select('commission_amount, created_at').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', startOf6MonthsAgoStr),
  ]);

  const buildingRows = buildingsRes.data ?? [];
  const roomRows = (roomsRes.data ?? []) as any[];
  const leadRows = (leadsRes.data ?? []) as any[];
  const recentAppointments = (appointmentsRes.data ?? []) as any[];
  const activeContractsList = (activeContractsRes.data ?? []) as any[];
  const paidInvoicesList = paidInvoicesRes.data ?? [];

  const totalRooms = roomRows.length;
  const rentedRooms = roomRows.filter((r) => r.status === 'rented').length;
  const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

  const totalCollectedAmount = paidInvoicesList.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
  const depositCommission = (dynamicDepositsRes.data ?? []).reduce((sum: number, c: any) => sum + (Number(c.commission_amount) || 0), 0);
  const rentalCommission = (dynamicRentalsRes.data ?? []).reduce((sum: number, c: any) => sum + (Number(c.commission_amount) || 0), 0);
  const companyRevenue = depositCommission + rentalCommission;

  const landlordRevenue = paidInvoicesList.reduce((sum: number, inv: any) => {
    const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
      ? Number(inv.landlord_payout_amount)
      : Number(inv.rent_amount || 0);
    return sum + payout;
  }, 0);

  // revenueHistory logic (tổng hợp hoa hồng sale của cả cọc và thuê theo từng tháng)
  const periodMap = new Map<string, number>();

  (depositContractsHistoryRes.data ?? []).forEach((c: any) => {
    if (!c.created_at) return;
    const p = c.created_at.substring(0, 7);
    periodMap.set(p, (periodMap.get(p) || 0) + (Number(c.commission_amount) || 0));
  });

  (rentalContractsHistoryRes.data ?? []).forEach((c: any) => {
    if (!c.created_at) return;
    const p = c.created_at.substring(0, 7);
    periodMap.set(p, (periodMap.get(p) || 0) + (Number(c.commission_amount) || 0));
  });

  const last6Months = [];
  const nowForChart = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowForChart.getFullYear(), nowForChart.getMonth() - i, 1);
    const pStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last6Months.push(pStr);
  }

  const revenueHistory = last6Months.map(period => {
    const comm = periodMap.get(period) || 0;
    return {
      period,
      amount: comm,
      totalCollected: 0
    };
  });

  // Calculate building details with real occupancy and revenue for Admin
  const buildingsList = buildingRows.map((building: any) => {
    const bRooms = roomRows.filter((r: any) => r.building_id === building.code);
    const bRoomsCount = bRooms.length;
    const bRentedCount = bRooms.filter((r: any) => r.status === 'rented').length;
    const bRoomIds = bRooms.map((r: any) => r.id);
    
    const bRevenue = paidInvoicesList
      .filter((inv: any) => bRoomIds.includes(inv.room_id))
      .reduce((sum: number, inv: any) => {
        const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
          ? Number(inv.landlord_payout_amount)
          : Number(inv.rent_amount || 0);
        return sum + payout;
      }, 0);

    return {
      ...building,
      totalRooms: bRoomsCount,
      rentedRooms: bRentedCount,
      revenue: bRevenue,
    };
  });

  // Dynamic KPI for Top Employees
  const depositsList = dynamicDepositsRes?.data ?? [];
  const rentalsList = dynamicRentalsRes?.data ?? [];

  const agentStatsMap = new Map<string, { deals: number; revenue: number }>();

  const processContract = (c: any) => {
    const agentId = c.sales_agent_id || c.created_by;
    if (!agentId) return;
    if (!agentStatsMap.has(agentId)) {
      agentStatsMap.set(agentId, { deals: 0, revenue: 0 });
    }
    const stats = agentStatsMap.get(agentId)!;
    stats.deals += 1;
    stats.revenue += (Number(c.rent_price) || 0);
  };

  depositsList.forEach(processContract);
  rentalsList.forEach(processContract);

  const agentIds = Array.from(agentStatsMap.keys());
  let dynamicTopEmployees: any[] = [];
  
  if (agentIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', agentIds);
    
    dynamicTopEmployees = (profilesData ?? []).map((prof: any) => {
      const stats = agentStatsMap.get(prof.id);
      return {
        employee_name: prof.full_name || prof.email,
        score: stats ? Math.round(stats.deals * 10 + (stats.revenue / 1000000) * 2) : 0,
        revenue_generated: stats?.revenue || 0,
        successful_deals: stats?.deals || 0
      };
    });
  }

  dynamicTopEmployees.sort((a, b) => b.score - a.score);
  const topEmployees = dynamicTopEmployees.length > 0 ? dynamicTopEmployees.slice(0, 5) : (topEmployeesRes.data ?? []);


  return {
    totalBuildings: buildingRows.length,
    totalRooms,
    availableRooms: roomRows.filter((r) => r.status === 'available').length,
    rentedRooms,
    totalLeads: leadRows.length,
    newLeads: leadRows.filter((l) => ['new', 'contacted', 'consulting'].includes(l.status)).length,
    newConsultations: consultationsRes.count ?? 0,
    unreadNotifications: notificationsRes.count ?? 0,
    recentAppointments,
    recentLeads: leadRows.slice(0, 5),
    totalLandlords: landlordsRes.count ?? 0,
    isLandlord: false,
    monthlyRevenue: companyRevenue,
    companyRevenue,
    landlordRevenue,
    totalCollectedAmount,
    activeContractsCount: rentedRooms,
    occupancyRate,
    buildingsList,
    roomsList: roomRows,
    contractsList: activeContractsList,
    expiringContractsCount: expiringContractsRes.count ?? 0,
    pendingAppointmentsToday: pendingApptsTodayRes.count ?? 0,
    unassignedConsultations: unassignedConsultsRes.count ?? 0,
    overdueInvoices: overdueInvsRes.count ?? 0,
    revenueHistory,
    topEmployees,
    leadsList: leadRows,
  };
}

export async function getSalesDashboardStats(companyId: string, saleId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentPeriod = now.toISOString().slice(0, 7); // 'YYYY-MM'
  const startOfMonth = currentPeriod + '-01';
  
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  // 1. Resolve employee ID from employees table by matching profile email
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', saleId)
    .maybeSingle();

  let employeeIdFromTable = null;
  if (profile?.email) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', profile.email)
      .maybeSingle();
    if (emp) {
      employeeIdFromTable = emp.id;
    }
  }

  // 2. Build current month's ISO start and end timestamps for dynamic calculation
  const startOfMonthISO = `${currentPeriod}-01T00:00:00.000Z`;
  const [yearStr, monthStr] = currentPeriod.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endOfMonthISO = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

  const [
    myLeads,
    myAppointments,
    myContracts,
    availableRooms,
    notifications,
    employeeKpis,
    expiringContracts,
    monthlyDeposits,
    monthlyRentals,
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
    // Hợp đồng cọc do sale phụ trách hoặc tạo (limit 10 để hiển thị danh sách gần đây)
    supabase
      .from('deposit_contracts')
      .select('id, contract_code, party_b_name, party_b_phone, deposit_amount, created_at, status, deadline_sign_contract')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
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
    // KPI của sale trong tháng này (truy vấn dùng employeeIdFromTable đã khớp từ bảng employees)
    supabase
      .from('employee_kpis')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employeeIdFromTable || saleId)
      .eq('period', currentPeriod)
      .maybeSingle(),
    // Hợp đồng sắp hết hạn trong 30 ngày tới do sale phụ trách
    supabase
      .from('rental_contracts')
      .select('id, contract_code, party_b_name, party_b_phone, end_date, room_id, rooms(id, code, building_id, buildings(name))')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
      .eq('status', 'active')
      .gte('end_date', todayStr)
      .lte('end_date', in30DaysStr)
      .order('end_date', { ascending: true }),
    // Hợp đồng cọc trong tháng này của sale này (không limit) để tính toán doanh thu thực tế
    supabase
      .from('deposit_contracts')
      .select('rent_price, commission_amount, deposit_amount, status')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
      .gte('created_at', startOfMonthISO)
      .lt('created_at', endOfMonthISO)
      .neq('status', 'cancelled'),
    // Hợp đồng thuê trong tháng này của sale này (không limit) để tính toán doanh thu thực tế
    supabase
      .from('rental_contracts')
      .select('rent_price, commission_amount, status')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
      .gte('created_at', startOfMonthISO)
      .lt('created_at', endOfMonthISO)
      .neq('status', 'cancelled'),
  ]);

  const leadsData = (myLeads.data ?? []) as any[];
  const appointmentsData = (myAppointments.data ?? []) as any[];
  const contractsData = (myContracts.data ?? []) as any[];
  const roomsData = (availableRooms.data ?? []) as any[];
  
  if (expiringContracts?.error) {
    console.error('Error fetching expiring contracts:', expiringContracts.error);
  }
  const expiringContractsData = (expiringContracts?.data ?? []) as any[];
  const roomsEndingSoon = expiringContractsData.map((c: any) => c.rooms).filter(Boolean);

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

  // Tính toán doanh thu thực tế dynamically
  const monthlyDepositsList = (monthlyDeposits.data ?? []) as any[];
  const monthlyRentalsList = (monthlyRentals.data ?? []) as any[];

  const totalDepositsRent = monthlyDepositsList.reduce((sum, c) => sum + (Number(c.rent_price) || 0), 0);
  const totalDepositsComm = monthlyDepositsList.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);
  const totalDepositsCount = monthlyDepositsList.length;

  const totalRentalsRent = monthlyRentalsList.reduce((sum, c) => sum + (Number(c.rent_price) || 0), 0);
  const totalRentalsComm = monthlyRentalsList.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);
  const totalRentalsCount = monthlyRentalsList.length;

  const dynamicRevenueGenerated = totalDepositsRent + totalRentalsRent;
  const dynamicSuccessfulDeals = totalDepositsCount + totalRentalsCount;
  const dynamicCommissionEarned = totalDepositsComm + totalRentalsComm;

  // Hợp đồng cọc trong tháng (dùng danh sách đầy đủ của tháng này thay vì danh sách bị giới hạn 10 bản ghi gần nhất)
  const totalDepositRevenue = monthlyDepositsList.reduce((sum: number, c: any) => sum + (Number(c.deposit_amount) || 0), 0);

  // Merge real-time dynamic stats vào đối tượng KPI trả về
  const finalKpi = employeeKpis.data ? {
    ...employeeKpis.data,
    revenue_generated: dynamicRevenueGenerated,
    successful_deals: dynamicSuccessfulDeals,
    commission_earned: dynamicCommissionEarned,
  } : {
    company_id: companyId,
    employee_id: employeeIdFromTable || saleId,
    employee_name: profile?.full_name || profile?.email || '',
    period: currentPeriod,
    total_leads: leadsData.length,
    total_appointments: appointmentsData.length,
    successful_deals: dynamicSuccessfulDeals,
    conversion_rate: 0,
    revenue_generated: dynamicRevenueGenerated,
    target_revenue: 0,
    score: 75,
    status: 'on_track' as const,
    commission_earned: dynamicCommissionEarned,
  };

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
    monthlyContracts: contractsData.filter(c => c.created_at >= startOfMonth),
    totalDepositRevenue,
    recentContracts: contractsData.slice(0, 5),
    // Available rooms to pitch
    availableRooms: roomsData,
    // Notifications
    unreadNotifications: notifications.count ?? 0,
    // KPI
    employeeKpis: finalKpi,
    // Expiring contracts
    expiringContracts: expiringContractsData,
    roomsEndingSoon,
  };
}

