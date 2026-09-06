import { supabase } from '@/lib/supabase/client';
import type { DBRoom } from '@/lib/supabase/types';

type RoomInsert = Omit<DBRoom, 'id' | 'created_at' | 'updated_at'>;
type RoomUpdate = Partial<RoomInsert>;

const isUuidStr = (val?: string | null): boolean =>
  !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

export type RoomWithBuilding = DBRoom & { 
  buildings: {
    id: string;
    name: string;
    area: string;
    address: string | null;
    landlord_id: string | null;
    electricity_price?: number | null;
    water_price?: number | null;
    internet_price?: number | null;
    common_service_price?: number | null;
    washing_machine_type?: string | null;
    dryer_type?: string | null;
  } | null;
  landlord_code?: string | null;
};

export async function getRooms(companyId?: string, landlordId?: string): Promise<RoomWithBuilding[]> {
  // Tự động kích hoạt giải phóng phòng hết hạn giữ chỗ (15 phút) ở background
  fetch('/api/rooms/auto-release-expired', { method: 'POST' }).catch(() => {});

  let validLandlordCodes: string[] = [];
  if (landlordId) {
    validLandlordCodes.push(landlordId);
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id, code')
      .or(`id.eq.${landlordId},code.eq.${landlordId}`)
      .maybeSingle();
    if (landlord) {
      if (landlord.id && !validLandlordCodes.includes(landlord.id)) validLandlordCodes.push(landlord.id);
      if (landlord.code && !validLandlordCodes.includes(landlord.code)) validLandlordCodes.push(landlord.code);
    }
  }

  const selectQuery = validLandlordCodes.length > 0 
    ? '*, buildings!inner(id, name, area, address, landlord_id, electricity_price, water_price, internet_price, common_service_price, washing_machine_type, dryer_type)' 
    : '*, buildings(id, name, area, address, landlord_id, electricity_price, water_price, internet_price, common_service_price, washing_machine_type, dryer_type)';

  let q = supabase
    .from('rooms')
    .select(selectQuery)
    .order('created_at', { ascending: false });
  if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
  if (validLandlordCodes.length > 0) {
    q = q.in('buildings.landlord_id', validLandlordCodes);
  }
  const { data, error } = await q;
  if (error) throw error;

  const now = new Date();
  const roomsWithLandlord = (data ?? []).map((room: any) => {
    // Nếu phòng ở trạng thái 'reserved' nhưng đã quá hạn (hoặc ko có reserved_until) -> tự nhả về 'available'
    let status = room.status;
    let reserved_until = room.reserved_until;
    if (status === 'reserved') {
      const isExpired = !reserved_until || new Date(reserved_until) < now;
      if (isExpired) {
        status = 'available';
        reserved_until = null;
      }
    }

    return {
      ...room,
      status,
      reserved_until,
      landlord_code: room.buildings?.landlord_id ?? room.landlord_id ?? '—',
    };
  });

  return roomsWithLandlord as unknown as RoomWithBuilding[];
}

export async function getRoomsByBuilding(buildingId: string, companyId?: string): Promise<DBRoom[]> {
  if (!buildingId) return [];

  let targetBuildingId: string | null = isUuidStr(buildingId) ? buildingId : null;

  if (!targetBuildingId) {
    const { data: buildingData } = await supabase
      .from('buildings')
      .select('id, code')
      .eq('code', buildingId)
      .maybeSingle();
    targetBuildingId = buildingData?.id ?? null;
  }

  if (!targetBuildingId) return [];

  let q = supabase
    .from('rooms')
    .select('*')
    .eq('building_id', targetBuildingId)
    .order('floor', { ascending: true })
    .order('code', { ascending: true });

  if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
  const { data, error } = await q;
  if (error) throw error;

  const now = new Date();
  const roomsList = (data ?? []).map((room: any) => {
    let status = room.status;
    let reserved_until = room.reserved_until;
    if (status === 'reserved') {
      const isExpired = !reserved_until || new Date(reserved_until) < now;
      if (isExpired) {
        status = 'available';
        reserved_until = null;
      }
    }
    return { ...room, status, reserved_until };
  });
  return roomsList as unknown as DBRoom[];
}

export async function getRoom(id: string): Promise<DBRoom | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as DBRoom | null;
}

export async function getRoomWithBuilding(id: string): Promise<RoomWithBuilding | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, buildings(id, name, area, address, landlord_id, electricity_price, water_price, internet_price, common_service_price, washing_machine_type, dryer_type)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as RoomWithBuilding | null;
}

export async function createRoom(r: RoomInsert): Promise<DBRoom> {
  let payload = { ...r };
  if (payload.building_id && !isUuidStr(payload.building_id)) {
    const { data: bld } = await supabase
      .from('buildings')
      .select('id')
      .eq('code', payload.building_id)
      .maybeSingle();
    if (bld?.id) {
      payload.building_id = bld.id;
    }
  }
  const { data, error } = await supabase.from('rooms').insert(payload as any).select().single();
  if (error) throw error;
  return data as unknown as DBRoom;
}

export async function updateRoom(id: string, r: RoomUpdate): Promise<DBRoom> {
  let payload = { ...r };
  if (payload.building_id && !isUuidStr(payload.building_id)) {
    const { data: bld } = await supabase
      .from('buildings')
      .select('id')
      .eq('code', payload.building_id)
      .maybeSingle();
    if (bld?.id) {
      payload.building_id = bld.id;
    } else {
      delete (payload as any).building_id;
    }
  }
  const { data, error } = await supabase
    .from('rooms').update({ ...(payload as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as DBRoom;
}

export async function deleteRoom(id: string) {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}
