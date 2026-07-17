import { supabase } from '@/lib/supabase/client';
import type { DBAppointment } from '@/lib/supabase/types';

export type AppointmentWithRelations = DBAppointment & {
  sale_name: string | null;
  sale_phone: string | null;
  company_name: string | null;
  company_phone: string | null;
  building_address: string | null;
};

type AppointmentInsert = Omit<DBAppointment, 'id' | 'created_at' | 'updated_at' | 'landlord_code' | 'landlord_name'>;
type AppointmentUpdate = Partial<AppointmentInsert>;

export async function getAppointments(companyId?: string, landlordId?: string): Promise<AppointmentWithRelations[]> {
  // 1. Fetch appointments
  let q = supabase.from('appointments').select('*').order('date', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data: appointments, error: appointmentsError } = await q;
  if (appointmentsError) throw appointmentsError;

  // 2. Fetch rooms
  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id, building_id');
  if (roomsError) throw roomsError;

  // 3. Fetch buildings
  const { data: buildings, error: buildingsError } = await supabase.from('buildings').select('id, code, address, landlord_id');
  if (buildingsError) throw buildingsError;

  // 4. Fetch landlords
  const { data: landlords, error: landlordsError } = await supabase.from('landlords').select('id, code, name');
  if (landlordsError) throw landlordsError;

  // 5. Fetch profiles
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name, phone, email');
  if (profilesError) throw profilesError;

  // 6. Fetch companies
  const { data: companies, error: companiesError } = await supabase.from('companies').select('id, name, phone');
  if (companiesError) throw companiesError;

  // Map client-side
  const roomsMap = new Map<string, string | null>((rooms ?? []).map((r: { id: string; building_id: string | null }) => [r.id, r.building_id]));
  
  const buildingsMap = new Map<string, { address: string | null; landlord_id: string | null }>();
  (buildings ?? []).forEach((b: any) => {
    const val = { address: b.address, landlord_id: b.landlord_id };
    if (b.code) buildingsMap.set(b.code, val);
    if (b.id) buildingsMap.set(b.id, val);
  });

  const landlordsMap = new Map<string, { code: string | null; name: string | null }>(
    (landlords ?? []).map((l: { id: string; code: string | null; name: string | null }) => [l.id, { code: l.code, name: l.name }])
  );

  const profilesMap = new Map<string, { name: string; phone: string | null }>(
    (profiles ?? []).map((p: any) => [p.id, { name: p.full_name || p.email || '', phone: p.phone }])
  );

  const companiesMap = new Map<string, { name: string; phone: string | null }>(
    (companies ?? []).map((c: { id: string; name: string; phone: string | null }) => [c.id, { name: c.name, phone: c.phone }])
  );

  // Get filter codes if landlordId is provided
  let filterLandlordCode: string | null = null;
  if (landlordId) {
    if (landlordId.includes('-')) {
      const landlord = (landlords ?? []).find((l: any) => l.id === landlordId);
      filterLandlordCode = landlord?.code || null;
    } else {
      filterLandlordCode = landlordId;
    }
  }

  const mapped = (appointments ?? []).map((row: DBAppointment) => {
    const roomId = row.room_id;
    const buildingKey = row.building_id || (roomId ? roomsMap.get(roomId) : null);
    const building = buildingKey ? buildingsMap.get(buildingKey) : null;
    const landlordIdVal = building?.landlord_id ?? null;
    const landlord = landlordIdVal ? landlordsMap.get(landlordIdVal) : null;

    // Sale Info
    const saleInfo = row.assigned_to ? profilesMap.get(row.assigned_to) : null;
    const saleName = saleInfo?.name || row.assigned_to_name || null;
    const salePhone = saleInfo?.phone || null;

    // Company Info
    const companyInfo = row.company_id ? companiesMap.get(row.company_id) : null;
    const companyName = companyInfo?.name || null;
    const companyPhone = companyInfo?.phone || null;

    return {
      ...row,
      landlord_code: row.landlord_id || landlord?.code || null,
      landlord_name: landlord?.name || null,
      building_address: building?.address || null,
      // sale info mapped
      sale_name: saleName,
      sale_phone: salePhone,
      // company info mapped
      company_name: companyName,
      company_phone: companyPhone,
    };
  });

  if (landlordId) {
    return mapped.filter((item: any) => {
      const matchByCode = filterLandlordCode && item.landlord_code === filterLandlordCode;
      const buildingKey = item.room_id ? roomsMap.get(item.room_id) : null;
      const building = buildingKey ? buildingsMap.get(buildingKey) : null;
      const matchByBuilding = landlordId && building?.landlord_id === landlordId;
      return matchByCode || matchByBuilding;
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
