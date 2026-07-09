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

    const buildingIds = (landlordBuildings ?? []).map((b: any) => b.id);

    if (buildingIds.length === 0) {
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
      .in('building_id', buildingIds);

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
    let monthlyRevenue = 0;
    if (roomIds.length > 0) {
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .eq('period', currentPeriod)
        .in('room_id', roomIds);
      monthlyRevenue = (paidInvoices ?? []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
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
      const bRooms = roomRows.filter((r: any) => r.building_id === building.id);
      const bRoomsCount = bRooms.length;
      const bRentedCount = bRooms.filter((r: any) => r.status === 'rented').length;
      const bRoomIds = bRooms.map((r: any) => r.id);
      
      let bRevenue = 0;
      if (bRoomIds.length > 0) {
        const { data: bInvoices } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .eq('period', currentPeriod)
          .in('room_id', bRoomIds);
        bRevenue = (bInvoices ?? []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
      }

      buildingsList.push({
        ...building,
        totalRooms: bRoomsCount,
        rentedRooms: bRentedCount,
        revenue: bRevenue,
      });
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
      // Landlord specific fields
      isLandlord: true,
      monthlyRevenue,
      activeContractsCount,
      occupancyRate,
      buildingsList,
      roomsList: roomRows,
      contractsList: activeContractsList,
    };
  }

  const [buildings, rooms, leads, appointments, consultations, notifications, landlords] = await Promise.all([
    supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('rooms').select('id, status', { count: 'exact' }).eq('company_id', companyId),
    supabase.from('leads').select('id, status', { count: 'exact' }).eq('company_id', companyId),
    supabase.from('appointments').select('id, status, customer_name, room_title, date, time').eq('company_id', companyId).order('date', { ascending: false }).limit(5),
    supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'new'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_read', false),
    supabase.from('landlords').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);

  const roomRows = (rooms.data ?? []) as { id: string; status: string }[];
  const leadRows = (leads.data ?? []) as { id: string; status: string }[];
  const recentAppointments = (appointments.data ?? []) as any[];

  return {
    totalBuildings: buildings.count ?? 0,
    totalRooms: roomRows.length,
    availableRooms: roomRows.filter((r) => r.status === 'available').length,
    rentedRooms: roomRows.filter((r) => r.status === 'rented').length,
    totalLeads: leadRows.length,
    newLeads: leadRows.filter((l) => ['new', 'contacted', 'consulting'].includes(l.status)).length,
    newConsultations: consultations.count ?? 0,
    unreadNotifications: notifications.count ?? 0,
    recentAppointments,
    recentLeads: leadRows.slice(0, 5),
    totalLandlords: landlords.count ?? 0,
    isLandlord: false,
    monthlyRevenue: 0,
    activeContractsCount: 0,
    occupancyRate: 0,
    buildingsList: [],
    roomsList: [],
    contractsList: [],
  };
}

export async function getSalesDashboardStats(companyId: string, saleId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const startOfMonth = now.toISOString().slice(0, 7) + '-01';

  const [
    myLeads,
    myAppointments,
    myContracts,
    availableRooms,
    notifications,
  ] = await Promise.all([
    // Leads được giao cho sale này
    supabase
      .from('leads')
      .select('id, status, full_name, phone, created_at, assigned_to, source')
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
  };
}

