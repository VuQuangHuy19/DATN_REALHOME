import { supabase } from '../client';
import { getKPIConfiguration, calculateSaleCommissionInfo } from '@/src/features/staff/services/kpi_configurations';

export async function getDashboardStats(companyId: string, landlordId?: string, timeframe: string = 'current_month') {
  if (landlordId) {
    let filterLandlordCode = landlordId;
    if (landlordId && landlordId.includes('-')) {
      const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
      filterLandlordCode = landlord?.code || landlordId;
    }

    // Determine date ranges and period strings according to timeframe filter
    const now = new Date();
    let startDateISO = '';
    let endDateISO = '';
    let periods: string[] = [];
    
    if (timeframe === 'current_month') {
      const currentPeriod = now.toISOString().substring(0, 7); // 'YYYY-MM'
      startDateISO = `${currentPeriod}-01T00:00:00.000Z`;
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDateISO = `${currentPeriod}-${String(endMonth.getDate()).padStart(2, '0')}T23:59:59.999Z`;
      periods = [currentPeriod];
    } else if (timeframe === 'last_month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthPeriod = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
      startDateISO = `${lastMonthPeriod}-01T00:00:00.000Z`;
      const endMonth = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0);
      endDateISO = `${lastMonthPeriod}-${String(endMonth.getDate()).padStart(2, '0')}T23:59:59.999Z`;
      periods = [lastMonthPeriod];
    } else if (timeframe === 'this_quarter') {
      const currentMonth = now.getMonth(); // 0-indexed
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
      const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      startDateISO = quarterStart.toISOString();
      endDateISO = `${quarterEnd.getFullYear()}-${String(quarterEnd.getMonth() + 1).padStart(2, '0')}-${String(quarterEnd.getDate()).padStart(2, '0')}T23:59:59.999Z`;
      
      for (let m = 0; m < 3; m++) {
        const pDate = new Date(now.getFullYear(), quarterStartMonth + m, 1);
        periods.push(`${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`);
      }
    } else if (timeframe === 'this_year') {
      const year = now.getFullYear();
      startDateISO = `${year}-01-01T00:00:00.000Z`;
      endDateISO = `${year}-12-31T23:59:59.999Z`;
      for (let m = 1; m <= 12; m++) {
        periods.push(`${year}-${String(m).padStart(2, '0')}`);
      }
    } else if (timeframe === 'all_time') {
      startDateISO = '1970-01-01T00:00:00.000Z';
      endDateISO = '2099-12-31T23:59:59.999Z';
      periods = [];
    } else if (/^\d{4}-\d{2}$/.test(timeframe)) {
      // Custom YYYY-MM selected
      const [yStr, mStr] = timeframe.split('-');
      const customYear = parseInt(yStr, 10);
      const customMonth = parseInt(mStr, 10);
      startDateISO = `${timeframe}-01T00:00:00.000Z`;
      const endMonth = new Date(customYear, customMonth, 0);
      endDateISO = `${timeframe}-${String(endMonth.getDate()).padStart(2, '0')}T23:59:59.999Z`;
      periods = [timeframe];
    } else {
      const currentPeriod = now.toISOString().substring(0, 7);
      startDateISO = `${currentPeriod}-01T00:00:00.000Z`;
      endDateISO = `${currentPeriod}-31T23:59:59.999Z`;
      periods = [currentPeriod];
    }

    // 1. Fetch landlord's buildings
    const { data: landlordBuildings } = await supabase
      .from('buildings')
      .select('id, name, code, area, address, total_rooms, total_floors')
      .eq('company_id', companyId)
      .or(`landlord_id.eq.${filterLandlordCode},landlord_id.eq.${landlordId}`);

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
        grossRevenue: 0,
        netRentRevenue: 0,
        laggedRevenueHistory: [],
        expiringContractsGrouped: [],
        overdueInvoicesGrouped: [],
        monthlyTransactionStats: { appointmentsCount: 0, depositCount: 0, rentalCount: 0, cancelDepositCount: 0 },
        areaPerformanceList: [],
      };
    }

    // 2. Fetch rooms in those buildings
    const { data: landlordRooms } = await supabase
      .from('rooms')
      .select('id, building_id, status, code, floor, price, bedrooms, bathrooms, has_private_balcony, max_occupants, max_vehicles_per_room, min_contract_months, reserved_until')
      .eq('company_id', companyId)
      .in('building_id', buildingCodes);

    const rawRoomRows = landlordRooms ?? [];
    const rawRoomIds = rawRoomRows.map((r: any) => r.id);

    // Fetch active/signed deposit contracts to verify valid deposit locks
    let validDepositRoomIds = new Set<string>();
    if (rawRoomIds.length > 0) {
      const { data: activeDeposits } = await supabase
        .from('deposit_contracts')
        .select('room_id')
        .in('room_id', rawRoomIds)
        .in('status', ['active', 'signed']);
      validDepositRoomIds = new Set((activeDeposits ?? []).map((d: any) => d.room_id).filter(Boolean));
    }

    const nowTime = new Date().getTime();
    const roomRows = rawRoomRows.map((r: any) => {
      if (r.status === 'reserved') {
        const isExpired = r.reserved_until ? new Date(r.reserved_until).getTime() < nowTime : true;
        const hasDeposit = validDepositRoomIds.has(r.id);
        if (isExpired && !hasDeposit) {
          return { ...r, status: 'available' };
        }
      }
      return r;
    });

    const totalRooms = roomRows.length;
    const availableRooms = roomRows.filter((r: any) => r.status === 'available').length;
    const rentedRooms = roomRows.filter((r: any) => r.status === 'rented').length;
    const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

    // 3. Fetch active rental contracts & expiring contracts (within 30 days)
    const roomIds = roomRows.map((r: any) => r.id);
    let activeContractsCount = 0;
    let activeContractsList: any[] = [];
    let expiringContractsGrouped: any[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().slice(0, 10);

    if (roomIds.length > 0) {
      const { data: contracts, count } = await supabase
        .from('rental_contracts')
        .select('id, contract_code, tenant_count, start_date, end_date, rent_price, party_b_name, room_id, party_b_phone')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('room_id', roomIds);
      activeContractsCount = count ?? 0;
      activeContractsList = contracts ?? [];

      // Expiring contracts
      const expiring = (contracts ?? []).filter((c: any) => c.end_date >= todayStr && c.end_date <= in30DaysStr);
      expiringContractsGrouped = expiring.map((c: any) => {
        const room = roomRows.find((r: any) => r.id === c.room_id);
        const bld = (landlordBuildings ?? []).find((b: any) => b.code === room?.building_id);
        return {
          ...c,
          room_code: room?.code || '—',
          building_name: bld?.name || 'Tòa nhà',
          building_code: bld?.code || '—',
        };
      });
    }

    // 4. Calculate revenue based on selected timeframe
    let landlordRevenue = 0;
    let companyRevenue = 0;
    let totalCollectedAmount = 0;
    let grossRevenue = 0;
    let netRentRevenue = 0;

    // Fetch deposit contracts in timeframe
    let depQuery = supabase
      .from('deposit_contracts')
      .select('id, deposit_amount, created_at, status, room_id')
      .eq('company_id', companyId)
      .in('room_id', roomIds);
    
    if (timeframe !== 'all_time') {
      depQuery = depQuery.gte('created_at', startDateISO).lte('created_at', endDateISO);
    }
    const { data: timeframeDeposits } = await depQuery;
    const monthlyDepositsList = (timeframeDeposits ?? []) as any[];

    // Fetch rental contracts in timeframe
    let rentQuery = supabase
      .from('rental_contracts')
      .select('id, deposit_amount, rent_price, deposit_contract_id, created_at, status, room_id')
      .eq('company_id', companyId)
      .in('room_id', roomIds);

    if (timeframe !== 'all_time') {
      rentQuery = rentQuery.gte('created_at', startDateISO).lte('created_at', endDateISO);
    }
    const { data: timeframeRentals } = await rentQuery;
    const validRentals = ((timeframeRentals ?? []) as any[]).filter((r: any) => r.status !== 'cancelled');

    // Deduplicate deposit contracts that have been converted or belong to a room with an active rental contract
    const rentalDepositIds = new Set(validRentals.map((r: any) => r.deposit_contract_id).filter(Boolean));
    const rentalRoomIds = new Set(validRentals.map((r: any) => r.room_id).filter(Boolean));

    const activeStandaloneDeposits = monthlyDepositsList.filter((d: any) => {
      if (d.status === 'cancelled' || d.status === 'converted' || d.status === 'converted_to_rental') return false;
      if (rentalDepositIds.has(d.id)) return false;
      if (d.room_id && rentalRoomIds.has(d.room_id)) return false;
      return true;
    });

    const standaloneDepositsSum = activeStandaloneDeposits.reduce((sum: number, d: any) => sum + Number(d.deposit_amount || 0), 0);
    const rentalDepositsSum = validRentals.reduce((sum: number, r: any) => sum + Number(r.deposit_amount || 0), 0);
    const totalDepositsSum = standaloneDepositsSum + rentalDepositsSum;

    const firstMonthRentSum = validRentals.reduce((sum: number, r: any) => sum + Number(r.rent_price || 0), 0);

    // Fetch invoices in timeframe
    let invQuery = supabase
      .from('invoices')
      .select('total_amount, rent_amount, management_fee_amount, landlord_payout_amount, room_id, period, status')
      .eq('company_id', companyId)
      .in('room_id', roomIds);

    if (timeframe !== 'all_time' && periods.length > 0) {
      invQuery = invQuery.in('period', periods);
    }
    const { data: timeframeInvoices } = await invQuery;
    const paidInvoices = (timeframeInvoices ?? []).filter((inv: any) => inv.status === 'paid');

    landlordRevenue = paidInvoices.reduce((sum: number, inv: any) => {
      const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
        ? Number(inv.landlord_payout_amount)
        : Number(inv.rent_amount || 0);
      return sum + payout;
    }, 0);

    const paidInvoicesRent = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.rent_amount || 0), 0);
    companyRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.management_fee_amount) || 0), 0);
    totalCollectedAmount = paidInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);

    // Doanh thu gộp = Tổng tiền cọc thực tế (không trùng) + 1 tháng tiền nhà HĐT mới + Tiền nhà từ hóa đơn paid
    grossRevenue = totalDepositsSum + firstMonthRentSum + paidInvoicesRent;

    // Doanh thu thực = 1 tháng tiền nhà HĐT mới + Tiền nhà từ hóa đơn paid
    netRentRevenue = firstMonthRentSum + paidInvoicesRent;

    // 5. Fetch appointments & transaction stats in timeframe
    let recentAppointments: any[] = [];
    let appointmentsCountMonth = 0;

    const orClauses: string[] = [];
    if (roomIds.length > 0) orClauses.push(`room_id.in.(${roomIds.join(',')})`);
    if (buildingCodes.length > 0) orClauses.push(`building_id.in.(${buildingCodes.join(',')})`);
    orClauses.push(`landlord_id.eq.${filterLandlordCode}`);
    if (landlordId && landlordId !== filterLandlordCode) orClauses.push(`landlord_id.eq.${landlordId}`);

    const { data: appts } = await supabase
      .from('appointments')
      .select('id, status, customer_name, room_title, date, time, building_id, room_id, landlord_id')
      .eq('company_id', companyId)
      .or(orClauses.join(','))
      .order('date', { ascending: false });
    
    const allAppts = appts ?? [];
    recentAppointments = allAppts.slice(0, 5);

    const startDateStr = startDateISO.substring(0, 10);
    const endDateStr = endDateISO.substring(0, 10);

    if (timeframe === 'all_time') {
      appointmentsCountMonth = allAppts.length;
    } else {
      appointmentsCountMonth = allAppts.filter((a: any) => a.date >= startDateStr && a.date <= endDateStr).length;
    }

    const depositCountMonth = activeStandaloneDeposits.length + validRentals.length;
    const cancelDepositCountMonth = (timeframeDeposits ?? []).filter((d: any) => d.status === 'cancelled').length;
    const rentalCountMonth = validRentals.length;

    // 6. Overdue invoices grouped by building
    let overdueInvoicesGrouped: any[] = [];
    if (roomIds.length > 0) {
      const { data: overdueInvs } = await supabase
        .from('invoices')
        .select('id, invoice_code, total_amount, period, room_id, rooms(code, building_id)')
        .eq('company_id', companyId)
        .in('room_id', roomIds)
        .eq('status', 'overdue');
      
      overdueInvoicesGrouped = (overdueInvs ?? []).map((inv: any) => {
        const roomCode = inv.rooms?.code || '—';
        const bCode = inv.rooms?.building_id;
        const bld = (landlordBuildings ?? []).find((b: any) => b.code === bCode);
        return {
          ...inv,
          room_code: roomCode,
          building_name: bld?.name || 'Tòa nhà',
        };
      });
    }

    // 7. Area performance analysis for expansion
    const areaPerformanceMap = new Map<string, { area: string; buildingsCount: number; totalRooms: number; rentedRooms: number }>();
    (landlordBuildings ?? []).forEach((b: any) => {
      const areaName = b.area || 'Khác';
      if (!areaPerformanceMap.has(areaName)) {
        areaPerformanceMap.set(areaName, { area: areaName, buildingsCount: 0, totalRooms: 0, rentedRooms: 0 });
      }
      const item = areaPerformanceMap.get(areaName)!;
      item.buildingsCount += 1;
      const bRooms = roomRows.filter((r: any) => r.building_id === b.code);
      item.totalRooms += bRooms.length;
      item.rentedRooms += bRooms.filter((r: any) => r.status === 'rented').length;
    });

    const areaPerformanceList = Array.from(areaPerformanceMap.values()).map(item => ({
      ...item,
      occupancyRate: item.totalRooms > 0 ? Math.round((item.rentedRooms / item.totalRooms) * 100) : 0,
      potentialTag: item.totalRooms > 0 && Math.round((item.rentedRooms / item.totalRooms) * 100) >= 90 ? '🔥 Nên thầu thêm nhà' : 'Tiềm năng'
    }));

    // 8. Calculate building details with revenue & occupancy
    const buildingsList = [];
    for (const building of landlordBuildings ?? []) {
      const bRooms = roomRows.filter((r: any) => r.building_id === building.code);
      const bRoomsCount = bRooms.length;
      const bRentedCount = bRooms.filter((r: any) => r.status === 'rented').length;
      const bRoomIds = bRooms.map((r: any) => r.id);
      
      let bRevenue = 0;
      if (bRoomIds.length > 0) {
        let bInvQuery = supabase
          .from('invoices')
          .select('total_amount, rent_amount, landlord_payout_amount')
          .eq('company_id', companyId)
          .in('room_id', bRoomIds);

        if (timeframe !== 'all_time' && periods.length > 0) {
          bInvQuery = bInvQuery.in('period', periods);
        }
        const { data: bInvoices } = await bInvQuery;
        
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
      grossRevenue,
      netRentRevenue,
      totalCollectedAmount,
      activeContractsCount,
      occupancyRate,
      buildingsList,
      roomsList: roomRows,
      contractsList: activeContractsList,
      recentInvoices,
      landlordRevenueHistory,
      expiringContractsGrouped,
      overdueInvoicesGrouped,
      monthlyTransactionStats: {
        appointmentsCount: appointmentsCountMonth,
        depositCount: depositCountMonth,
        rentalCount: rentalCountMonth,
        cancelDepositCount: cancelDepositCountMonth,
      },
      areaPerformanceList,
    };
  }

  // ─── ADMIN DASHBOARD SECTION ────────────────────────────────────────────────
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
    allAppointmentsRes,
  ] = await Promise.all([
    supabase.from('buildings').select('id, name, code, area, address, total_rooms, total_floors').eq('company_id', companyId),
    supabase.from('rooms').select('id, building_id, landlord_id, status, code, floor, price, bedrooms, bathrooms, has_private_balcony, max_occupants, max_vehicles_per_room, min_contract_months, reserved_until').eq('company_id', companyId),
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
    supabase.from('deposit_contracts').select('id, room_id, rent_price, commission_amount, sales_agent_id, created_by, created_at, status').eq('company_id', companyId).gte('created_at', `${currentPeriod}-01T00:00:00.000Z`).in('status', ['active', 'signed']),
    supabase.from('rental_contracts').select('id, room_id, deposit_contract_id, rent_price, commission_amount, sales_agent_id, created_by, created_at, status').eq('company_id', companyId).gte('created_at', `${currentPeriod}-01T00:00:00.000Z`).neq('status', 'cancelled'),
    supabase.from('rental_contracts').select('commission_amount, created_at').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', startOf6MonthsAgoStr),
    supabase.from('appointments').select('id, date, status, room_id').eq('company_id', companyId),
  ]);

  const buildingRows = buildingsRes.data ?? [];
  const rawAdminRoomRows = (roomsRes.data ?? []) as any[];
  const activeDepositRoomIds = new Set(
    (dynamicDepositsRes.data ?? [])
      .filter((d: any) => ['active', 'signed'].includes(d.status))
      .map((d: any) => d.room_id)
      .filter(Boolean)
  );

  const nowAdminTime = new Date().getTime();
  const roomRows = rawAdminRoomRows.map((r: any) => {
    if (r.status === 'reserved') {
      const isExpired = r.reserved_until ? new Date(r.reserved_until).getTime() < nowAdminTime : true;
      const hasDeposit = activeDepositRoomIds.has(r.id);
      if (isExpired && !hasDeposit) {
        return { ...r, status: 'available' };
      }
    }
    return r;
  });
  const leadRows = (leadsRes.data ?? []) as any[];
  const recentAppointments = (appointmentsRes.data ?? []) as any[];
  const activeContractsList = (activeContractsRes.data ?? []) as any[];
  const paidInvoicesList = paidInvoicesRes.data ?? [];
  const allAppointmentsList = (allAppointmentsRes.data ?? []) as any[];

  const totalRooms = roomRows.length;
  const rentedRooms = roomRows.filter((r) => r.status === 'rented').length;
  const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0;

  const totalCollectedAmount = paidInvoicesList.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);

  // Khử trùng lặp giữa HĐ cọc và HĐ thuê chính thức trong tháng
  const monthlyDepositsList = (dynamicDepositsRes.data ?? []) as any[];
  const monthlyRentalsList = (dynamicRentalsRes.data ?? []) as any[];
  const validRentals = monthlyRentalsList.filter((r: any) => r.status !== 'cancelled');
  const rentalDepositIds = new Set(validRentals.map((r: any) => r.deposit_contract_id).filter(Boolean));
  const rentalRoomIds = new Set(validRentals.map((r: any) => r.room_id).filter(Boolean));

  const activeStandaloneDeposits = monthlyDepositsList.filter((d: any) => {
    if (d.status === 'cancelled' || d.status === 'converted' || d.status === 'converted_to_rental') return false;
    if (rentalDepositIds.has(d.id)) return false;
    if (d.room_id && rentalRoomIds.has(d.room_id)) return false;
    return true;
  });

  const depositCommission = activeStandaloneDeposits.reduce((sum: number, c: any) => sum + (Number(c.commission_amount) || 0), 0);
  const rentalCommission = validRentals.reduce((sum: number, c: any) => sum + (Number(c.commission_amount) || 0), 0);
  const companyRevenue = depositCommission + rentalCommission;

  const landlordRevenue = paidInvoicesList.reduce((sum: number, inv: any) => {
    const payout = inv.landlord_payout_amount !== null && inv.landlord_payout_amount !== undefined
      ? Number(inv.landlord_payout_amount)
      : Number(inv.rent_amount || 0);
    return sum + payout;
  }, 0);

  // Conversion rates calculation
  const totalLeadsCount = leadRows.length;
  const totalClosedDeals = activeStandaloneDeposits.length + validRentals.length;
  const totalApptsCount = allAppointmentsList.length;

  const leadToClosedConversionRate = totalLeadsCount > 0 ? Math.round((totalClosedDeals / totalLeadsCount) * 100) : 0;
  const apptToClosedConversionRate = totalApptsCount > 0 ? Math.round((totalClosedDeals / totalApptsCount) * 100) : 0;

  // Appointments filterable stats by day, week, month
  const todayApptsCount = allAppointmentsList.filter((a: any) => a.date === todayStr).length;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
  const weekApptsCount = allAppointmentsList.filter((a: any) => a.date >= startOfWeekStr).length;

  const monthApptsCount = allAppointmentsList.filter((a: any) => a.date >= `${currentPeriod}-01`).length;

  // Hot Zone Analytics (Areas & Buildings performance)
  const zoneMap = new Map<string, { area: string; closedDeals: number; revenue: number }>();
  (dynamicRentalsRes.data ?? []).concat(dynamicDepositsRes.data ?? []).forEach((contract: any) => {
    const comm = Number(contract.commission_amount || 0);
    const area = 'Đống Đa'; // Default fallback
    if (!zoneMap.has(area)) zoneMap.set(area, { area, closedDeals: 0, revenue: 0 });
    const z = zoneMap.get(area)!;
    z.closedDeals += 1;
    z.revenue += comm;
  });

  const hotZoneList = buildingRows.map((b: any) => {
    const bRooms = roomRows.filter((r: any) => r.building_id === b.code);
    const rented = bRooms.filter((r: any) => r.status === 'rented').length;
    const occ = bRooms.length > 0 ? Math.round((rented / bRooms.length) * 100) : 0;
    return {
      name: b.name,
      area: b.area || 'Hà Nội',
      occupancy: occ,
      statusTag: occ >= 80 ? '🔥 KHU VỰC HOT' : '💎 TIỀM NĂNG'
    };
  });

  // revenueHistory logic
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

  const revenueHistory = last6Months.map(period => ({
    period,
    amount: periodMap.get(period) || 0,
    totalCollected: 0
  }));

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
    closedRoomsCount: totalClosedDeals,
    conversionRates: {
      leadToClosedRate: leadToClosedConversionRate,
      apptToClosedRate: apptToClosedConversionRate,
    },
    appointmentsTimeframe: {
      today: todayApptsCount,
      week: weekApptsCount,
      month: monthApptsCount,
    },
    hotZoneList,
  };
}

export async function getSalesDashboardStats(companyId: string, saleId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentPeriod = now.toISOString().slice(0, 7); // 'YYYY-MM'
  
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

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
    supabase
      .from('leads')
      .select('id, status, full_name, phone, created_at, assigned_to, source, last_contacted_at')
      .eq('company_id', companyId)
      .eq('assigned_to', saleId)
      .order('created_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id, status, customer_name, room_title, date, time, room_id')
      .eq('company_id', companyId)
      .eq('assigned_to', saleId)
      .order('date', { ascending: false })
      .limit(20),
    supabase
      .from('deposit_contracts')
      .select('id, contract_code, party_b_name, party_b_phone, deposit_amount, created_at, status, deadline_sign_contract')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('rooms')
      .select('id, code, status, price, building_id, buildings(name)')
      .eq('company_id', companyId)
      .eq('status', 'available')
      .limit(20),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('recipient_id', saleId)
      .eq('is_read', false),
    supabase
      .from('employee_kpis')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employeeIdFromTable || saleId)
      .eq('period', currentPeriod)
      .maybeSingle(),
    supabase
      .from('rental_contracts')
      .select('id, contract_code, party_b_name, party_b_phone, end_date, room_id, rooms(id, code, building_id, buildings(name))')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
      .eq('status', 'active')
      .gte('end_date', todayStr)
      .lte('end_date', in30DaysStr)
      .order('end_date', { ascending: true }),
    supabase
      .from('deposit_contracts')
      .select('id, room_id, rent_price, commission_amount, deposit_amount, status')
      .eq('company_id', companyId)
      .or(`created_by.eq.${saleId},sales_agent_id.eq.${saleId}`)
      .gte('created_at', startOfMonthISO)
      .lt('created_at', endOfMonthISO)
      .neq('status', 'cancelled'),
    supabase
      .from('rental_contracts')
      .select('id, room_id, deposit_contract_id, rent_price, commission_amount, status')
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
  const expiringContractsData = (expiringContracts?.data ?? []) as any[];
  const roomsEndingSoon = expiringContractsData.map((c: any) => c.rooms).filter(Boolean);

  const monthlyDepositsList = (monthlyDeposits.data ?? []) as any[];
  const monthlyRentalsList = (monthlyRentals.data ?? []) as any[];

  // Khử trùng lặp giữa HĐ đặt cọc và HĐ thuê chính thức
  const validRentals = monthlyRentalsList.filter((r: any) => r.status !== 'cancelled');
  const rentalDepositIds = new Set(validRentals.map((r: any) => r.deposit_contract_id).filter(Boolean));
  const rentalRoomIds = new Set(validRentals.map((r: any) => r.room_id).filter(Boolean));

  // Chỉ đếm hợp đồng cọc chưa chuyển thành HĐ thuê và chưa có HĐ thuê cho phòng đó
  const activeStandaloneDeposits = monthlyDepositsList.filter((d: any) => {
    if (d.status === 'cancelled' || d.status === 'converted') return false;
    if (rentalDepositIds.has(d.id)) return false;
    if (d.room_id && rentalRoomIds.has(d.room_id)) return false;
    return true;
  });

  const totalDepositsComm = activeStandaloneDeposits.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);
  const totalDepositsCount = activeStandaloneDeposits.length;

  const totalRentalsComm = validRentals.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);
  const totalRentalsCount = validRentals.length;

  const totalGrossCommEarned = totalDepositsComm + totalRentalsComm;
  const dynamicRevenueGenerated = totalGrossCommEarned; // Doanh số của Sale = Tổng Hoa Hồng thu từ Chủ nhà về cho Công ty
  const dynamicSuccessfulDeals = totalDepositsCount + totalRentalsCount;

  // Tính Hoa hồng thực nhận (Chủ nhà đã chuyển tiền/thanh toán hóa đơn)
  const roomIdsClosed = [
    ...validRentals.map((r: any) => r.room_id),
    ...activeStandaloneDeposits.map((d: any) => d.room_id)
  ].filter(Boolean);

  let collectedGrossCommission = 0;
  if (roomIdsClosed.length > 0) {
    const { data: paidRoomInvoices } = await supabase
      .from('invoices')
      .select('room_id')
      .eq('company_id', companyId)
      .eq('status', 'paid')
      .in('room_id', roomIdsClosed);

    const paidRoomSet = new Set((paidRoomInvoices ?? []).map((i: any) => i.room_id));

    const collectedDepositsComm = activeStandaloneDeposits
      .filter((d: any) => paidRoomSet.has(d.room_id) || d.status === 'signed')
      .reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);

    const collectedRentalsComm = validRentals
      .filter((r: any) => paidRoomSet.has(r.room_id))
      .reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);

    collectedGrossCommission = collectedDepositsComm + collectedRentalsComm;
  }

  // Read company KPI / commission config dynamically from DB
  const kpiConfig = await getKPIConfiguration(companyId);
  const commInfo = calculateSaleCommissionInfo(dynamicRevenueGenerated, totalGrossCommEarned, kpiConfig, collectedGrossCommission);
  const dynamicCommissionEarned = commInfo.calculatedCommission;
  const dynamicCollectedCommission = commInfo.collectedCommission;

  const totalLeadsCount = leadsData.length;
  const totalApptsCount = appointmentsData.length;

  const conversionRateApptToClosed = totalApptsCount > 0 ? Math.round((dynamicSuccessfulDeals / totalApptsCount) * 100) : 0;
  const conversionRateLeadToClosed = totalLeadsCount > 0 ? Math.round((dynamicSuccessfulDeals / totalLeadsCount) * 100) : 0;

  const funnelData = [
    { stage: 'Khách hàng (Leads)', count: totalLeadsCount, fill: '#3b82f6' },
    { stage: 'Lịch hẹn xem phòng', count: totalApptsCount, fill: '#8b5cf6' },
    { stage: 'Phòng đã chốt', count: dynamicSuccessfulDeals, fill: '#10b981' },
  ];

  let kpiTier = commInfo.currentTierLabel || 'Đồng';

  const finalKpi = employeeKpis.data ? {
    ...employeeKpis.data,
    revenue_generated: dynamicRevenueGenerated,
    successful_deals: dynamicSuccessfulDeals,
    commission_earned: dynamicCommissionEarned,
    collected_commission: dynamicCollectedCommission,
  } : {
    company_id: companyId,
    employee_id: employeeIdFromTable || saleId,
    employee_name: profile?.full_name || profile?.email || '',
    period: currentPeriod,
    total_leads: leadsData.length,
    total_appointments: appointmentsData.length,
    successful_deals: dynamicSuccessfulDeals,
    conversion_rate: conversionRateApptToClosed,
    revenue_generated: dynamicRevenueGenerated,
    target_revenue: 10000000,
    score: 85,
    status: 'on_track' as const,
    commission_earned: dynamicCommissionEarned,
    collected_commission: dynamicCollectedCommission,
  };

  return {
    totalLeads: leadsData.length,
    recentLeads: leadsData.slice(0, 8),
    totalAppointments: appointmentsData.length,
    todayAppointments: appointmentsData.filter(a => a.date === todayStr),
    upcomingAppointments: appointmentsData.filter(a => a.date > todayStr && a.status !== 'cancelled').slice(0, 5),
    pendingAppointments: appointmentsData.filter(a => a.status === 'pending'),
    totalContracts: contractsData.length,
    totalDepositRevenue: monthlyDepositsList.reduce((sum: number, c: any) => sum + (Number(c.deposit_amount) || 0), 0),
    recentContracts: contractsData.slice(0, 5),
    availableRooms: roomsData,
    unreadNotifications: notifications.count ?? 0,
    employeeKpis: finalKpi,
    expiringContracts: expiringContractsData,
    roomsEndingSoon,
    conversionRates: {
      apptToClosedRate: conversionRateApptToClosed,
      leadToClosedRate: conversionRateLeadToClosed,
    },
    funnelData,
    kpiTier,
    tierInfo: commInfo,
  };
}
