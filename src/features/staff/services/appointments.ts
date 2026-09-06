import { supabase } from '@/lib/supabase/client';
import type { DBAppointment } from '@/lib/supabase/types';

export type AppointmentWithRelations = DBAppointment & {
  sale_name: string | null;
  sale_phone: string | null;
  company_name: string | null;
  company_phone: string | null;
  building_address: string | null;
  building_code: string | null;
};

type AppointmentInsert = Omit<DBAppointment, 'id' | 'created_at' | 'updated_at' | 'landlord_code' | 'landlord_name'>;
type AppointmentUpdate = Partial<AppointmentInsert>;

export async function getAppointments(
  companyId?: string,
  landlordId?: string,
  userProfile?: any
): Promise<AppointmentWithRelations[]> {
  const isLandlordRole = userProfile?.role === 'landlord' || Boolean(landlordId);

  // 1. Fetch appointments
  let appointments: DBAppointment[] = [];
  let fetchErr: any = null;
  try {
    let q = supabase.from('appointments').select('*').order('date', { ascending: false });
    if (companyId && !isLandlordRole) {
      q = q.or(`company_id.eq.${companyId},company_id.is.null`);
    }
    const { data, error } = await q;
    if (error) fetchErr = error;
    else appointments = (data ?? []) as unknown as DBAppointment[];
  } catch (e) {
    fetchErr = e;
  }

  // Fallback to API if client-side query produced an error or empty (e.g. Postgres RLS 42501 permission denied)
  if (fetchErr || !appointments || appointments.length === 0) {
    try {
      const res = await fetch('/api/appointments', { credentials: 'same-origin' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        appointments = json.data as DBAppointment[];
      }
    } catch (apiErr) {
      if (fetchErr && (!appointments || appointments.length === 0)) {
        console.error('Lỗi khi tải lịch hẹn từ client & API fallback:', fetchErr, apiErr);
      }
    }
  }

  // 2. Fetch rooms
  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id, building_id');
  if (roomsError) throw roomsError;

  // 3. Fetch buildings
  const { data: buildings, error: buildingsError } = await supabase.from('buildings').select('id, code, address, landlord_id, manager_ids');
  if (buildingsError) throw buildingsError;

  // 4. Fetch landlords
  const { data: landlords, error: landlordsError } = await supabase.from('landlords').select('id, code, name, phone, email');
  if (landlordsError) throw landlordsError;

  // 4.5. Fetch building managers
  const { data: managers } = await supabase.from('managers').select('id, name, phone');

  // 5. Fetch profiles
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name, phone, email');
  if (profilesError) throw profilesError;

  // 6. Fetch companies
  const { data: companies, error: companiesError } = await supabase.from('companies').select('id, name, phone');
  if (companiesError) throw companiesError;

  // 7. Fetch active deposit & rental contracts to auto-sync 'Dealed' status
  const { data: activeDeposits } = await supabase
    .from('deposit_contracts')
    .select('id, contract_code, room_id, party_b_phone')
    .in('status', ['active', 'converted', 'signed']);

  const { data: activeRentals } = await supabase
    .from('rental_contracts')
    .select('id, contract_code, room_id, party_b_phone')
    .eq('status', 'active');

  // Map client-side
  const roomsMap = new Map<string, string | null>((rooms ?? []).map((r: { id: string; building_id: string | null }) => [r.id, r.building_id]));
  
  const buildingsMap = new Map<string, { id: string; code: string | null; address: string | null; landlord_id: string | null; manager_ids: string[] | null }>();
  (buildings ?? []).forEach((b: any) => {
    const val = { id: b.id, code: b.code || b.id, address: b.address, landlord_id: b.landlord_id, manager_ids: b.manager_ids };
    if (b.code) buildingsMap.set(b.code, val);
    if (b.id) buildingsMap.set(b.id, val);
  });

  const landlordsMap = new Map<string, { id: string; code: string | null; name: string | null; phone: string | null; email: string | null }>();
  (landlords ?? []).forEach((l: any) => {
    const val = { id: l.id, code: l.code, name: l.name, phone: l.phone, email: l.email };
    if (l.id) landlordsMap.set(l.id, val);
    if (l.code) landlordsMap.set(l.code, val);
  });

  const managersMap = new Map<string, { name: string; phone: string | null }>(
    (managers ?? []).map((m: any) => [m.id, { name: m.name, phone: m.phone }])
  );

  const profilesMap = new Map<string, { name: string; phone: string | null }>(
    (profiles ?? []).map((p: any) => [p.id, { name: p.full_name || p.email || '', phone: p.phone }])
  );

  const companiesMap = new Map<string, { name: string; phone: string | null }>(
    (companies ?? []).map((c: { id: string; name: string; phone: string | null }) => [c.id, { name: c.name, phone: c.phone }])
  );

  const mapped = (appointments ?? []).map((row: DBAppointment) => {
    const roomId = row.room_id;
    const buildingKey = row.building_id || (roomId ? roomsMap.get(roomId) : null);
    const building = buildingKey ? buildingsMap.get(buildingKey) : null;
    const landlordIdVal = building?.landlord_id || row.landlord_id || null;
    const landlord = landlordIdVal ? landlordsMap.get(landlordIdVal) : null;

    // Check manager assigned directly to this building (e.g. Bảo Chấn, Kiên)
    const primaryManagerId = building?.manager_ids?.[0];
    const buildingManager = primaryManagerId ? managersMap.get(primaryManagerId) : null;
    const buildingManagerPhone = buildingManager?.phone || null;

    // Sale Info
    const saleInfo = row.assigned_to ? profilesMap.get(row.assigned_to) : null;
    const saleName = saleInfo?.name || row.assigned_to_name || null;
    const salePhone = saleInfo?.phone || null;

    // Company Info
    const companyInfo = row.company_id ? companiesMap.get(row.company_id) : null;
    const companyName = companyInfo?.name || null;
    const companyPhone = companyInfo?.phone || null;

    // Ràng buộc chính xác theo bộ 4 yếu tố: [Mã/ID phòng + Mã/ID tòa + Hợp đồng hợp lệ + SĐT khách]
    const matchedContract = (activeDeposits || []).find((d: any) => {
      if (!d.id || !d.room_id || !d.party_b_phone) return false;
      const contractBuildingId = roomsMap.get(d.room_id);
      const isRoomMatch = d.room_id === row.room_id;
      const isPhoneMatch = d.party_b_phone === row.customer_phone;
      const isBuildingMatch = !buildingKey || !contractBuildingId || buildingKey === contractBuildingId;
      return isRoomMatch && isPhoneMatch && isBuildingMatch;
    }) || (activeRentals || []).find((r: any) => {
      if (!r.id || !r.room_id || !r.party_b_phone) return false;
      const contractBuildingId = roomsMap.get(r.room_id);
      const isRoomMatch = r.room_id === row.room_id;
      const isPhoneMatch = r.party_b_phone === row.customer_phone;
      const isBuildingMatch = !buildingKey || !contractBuildingId || buildingKey === contractBuildingId;
      return isRoomMatch && isPhoneMatch && isBuildingMatch;
    });

    const isDealed = !!matchedContract;
    const finalStatus = isDealed ? 'Dealed' : row.status;

    // Effective contact phone: Building Manager > Landlord > Company
    const effectiveLandlordPhone = buildingManagerPhone || landlord?.phone || null;

    const buildingCode = building?.code || (buildingKey && !buildingKey.includes('-') ? buildingKey : row.building_id || null);
    const landlordCode = landlord?.code || row.landlord_id || (landlordIdVal && !landlordIdVal.includes('-') ? landlordIdVal : null);

    return {
      ...row,
      status: finalStatus,
      landlord_code: landlordCode,
      landlord_name: buildingManager?.name ? `${buildingManager.name} (Quản lý - ${landlord?.name || 'TH03'})` : (landlord?.name || null),
      landlord_phone: effectiveLandlordPhone,
      building_address: building?.address || null,
      building_code: buildingCode,
      // sale info mapped
      sale_name: saleName,
      sale_phone: salePhone,
      // company info mapped
      company_name: companyName,
      company_phone: companyPhone,
    };
  });

  if (isLandlordRole) {
    const validLandlordKeys = new Set<string>();
    if (landlordId) validLandlordKeys.add(landlordId);
    if (userProfile?.landlord_id) validLandlordKeys.add(userProfile.landlord_id);

    // 1. Check building managers & building landlord_ids
    (buildings ?? []).forEach((b: any) => {
      const isManager = b.manager_ids && Array.isArray(b.manager_ids) && (
        (userProfile?.id && b.manager_ids.includes(userProfile.id)) ||
        (landlordId && b.manager_ids.includes(landlordId))
      );
      if (isManager) {
        if (b.landlord_id) validLandlordKeys.add(b.landlord_id);
        if (b.id) validLandlordKeys.add(b.id);
        if (b.code) validLandlordKeys.add(b.code);
      }
    });

    // 2. Find matching landlords from landlords table
    const matchedLandlords = (landlords ?? []).filter((l: any) => {
      if (landlordId && (l.id === landlordId || l.code === landlordId)) return true;
      if (userProfile?.landlord_id && (l.id === userProfile.landlord_id || l.code === userProfile.landlord_id)) return true;
      if (validLandlordKeys.has(l.id) || validLandlordKeys.has(l.code)) return true;

      const cleanProfilePhone = userProfile?.phone?.replace(/\D/g, '');
      const cleanLandlordPhone = l.phone?.replace(/\D/g, '');
      if (cleanProfilePhone && cleanLandlordPhone && cleanProfilePhone === cleanLandlordPhone) return true;

      const profileEmail = userProfile?.email?.toLowerCase().trim();
      const landlordEmail = l.email?.toLowerCase().trim();
      if (profileEmail && landlordEmail && profileEmail === landlordEmail) return true;

      const profileName = userProfile?.full_name?.toLowerCase().trim();
      const landlordName = l.name?.toLowerCase().trim();
      if (profileName && landlordName && (profileName === landlordName || profileName.includes(landlordName) || landlordName.includes(profileName))) return true;

      return false;
    });

    matchedLandlords.forEach((l: any) => {
      if (l.id) validLandlordKeys.add(l.id);
      if (l.code) validLandlordKeys.add(l.code);
    });

    // 3. Find associated buildings
    const landlordBuildingKeys = new Set<string>();
    (buildings ?? []).forEach((b: any) => {
      const isMatch =
        (b.landlord_id && validLandlordKeys.has(b.landlord_id)) ||
        (b.id && validLandlordKeys.has(b.id)) ||
        (b.code && validLandlordKeys.has(b.code)) ||
        (b.manager_ids && Array.isArray(b.manager_ids) && userProfile?.id && b.manager_ids.includes(userProfile.id));

      if (isMatch) {
        if (b.id) landlordBuildingKeys.add(b.id);
        if (b.code) landlordBuildingKeys.add(b.code);
        if (b.landlord_id) validLandlordKeys.add(b.landlord_id);
      }
    });

    // Re-add any landlord code/id from newly added landlord_id in buildings
    (landlords ?? []).forEach((l: any) => {
      if (validLandlordKeys.has(l.id) || validLandlordKeys.has(l.code)) {
        if (l.id) validLandlordKeys.add(l.id);
        if (l.code) validLandlordKeys.add(l.code);
      }
    });

    // 4. Fallback if no specific landlord keys matched (other than userProfile.id)
    const hasSpecificKeys = Array.from(validLandlordKeys).some(k => k !== userProfile?.id);
    const allowAllForRole = !hasSpecificKeys && (landlordBuildingKeys.size === 0);

    return mapped.filter((item: any) => {
      if (allowAllForRole) return true;

      const bKey = item.building_id || (item.room_id ? roomsMap.get(item.room_id) : null);
      const b = bKey ? buildingsMap.get(bKey) : null;
      const bLandlord = b?.landlord_id || null;

      const isMatch =
        (item.landlord_code && validLandlordKeys.has(item.landlord_code)) ||
        (item.landlord_id && validLandlordKeys.has(item.landlord_id)) ||
        (bLandlord && validLandlordKeys.has(bLandlord)) ||
        (item.building_id && (landlordBuildingKeys.has(item.building_id) || validLandlordKeys.has(item.building_id))) ||
        (item.building_code && (landlordBuildingKeys.has(item.building_code) || validLandlordKeys.has(item.building_code))) ||
        (bKey && (landlordBuildingKeys.has(bKey) || validLandlordKeys.has(bKey)));

      return Boolean(isMatch);
    }) as AppointmentWithRelations[];
  }

  return mapped as AppointmentWithRelations[];
}

export async function createAppointment(a: AppointmentInsert): Promise<DBAppointment> {
  const { data, error } = await supabase.from('appointments').insert(a as any).select().single();
  if (error) throw error;
  return data as unknown as DBAppointment;
}

export async function updateAppointment(id: string, a: AppointmentUpdate): Promise<DBAppointment> {
  const { data, error } = await supabase
    .from('appointments').update({ ...(a as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;

  // Sync to Leads table (by matching customer phone number)
  try {
    const { data: apt } = await supabase
      .from('appointments')
      .select('customer_phone, company_id, assigned_to, status')
      .eq('id', id)
      .maybeSingle();

    if (apt && apt.customer_phone && apt.company_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, assigned_to, status')
        .eq('company_id', apt.company_id)
        .eq('phone', apt.customer_phone)
        .maybeSingle();

      if (lead) {
        const leadPatch: any = {};
        
        // Sync assigned_to
        if ('assigned_to' in a && lead.assigned_to !== apt.assigned_to) {
          leadPatch.assigned_to = apt.assigned_to;
        }

        // Sync status: map appointment status to lead status
        if ('status' in a) {
          let mappedStatus: string | null = null;
          if (apt.status === 'confirmed' || apt.status === 'pending') {
            mappedStatus = 'appointment';
          } else if (apt.status === 'completed') {
            mappedStatus = 'viewed';
          } else if (apt.status === 'cancelled') {
            mappedStatus = 'lost';
          }

          if (mappedStatus && lead.status !== mappedStatus) {
            leadPatch.status = mappedStatus;
          }
        }

        if (Object.keys(leadPatch).length > 0) {
          await supabase
            .from('leads')
            .update({ ...leadPatch, updated_at: new Date().toISOString() })
            .eq('id', lead.id);
        }
      }
    }
  } catch (syncErr) {
    console.error('Error syncing appointment to lead:', syncErr);
  }

  // Trigger thông báo nếu cập nhật trạng thái thành confirmed/Confirm
  if ('status' in a && (a.status === 'confirmed' || a.status === 'Confirm')) {
    try {
      fetch('/api/appointments/notify-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id, newStatus: a.status }),
      }).catch(err => console.error('Lỗi khi gọi API notify-status:', err));
    } catch (e) {
      console.error('Lỗi try-catch API notify-status:', e);
    }
  }

  return data as unknown as DBAppointment;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}
