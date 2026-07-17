import { supabase } from '@/lib/supabase/client';
import type { DBRoom } from '@/lib/supabase/types';

type RoomInsert = Omit<DBRoom, 'id' | 'created_at' | 'updated_at'>;
type RoomUpdate = Partial<RoomInsert>;

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
  let filterLandlordCode = landlordId;
  if (landlordId && landlordId.includes('-')) {
    const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
    filterLandlordCode = landlord?.code || landlordId;
  }

  const selectQuery = filterLandlordCode 
    ? '*, buildings!inner(id, name, area, address, landlord_id, electricity_price, water_price, internet_price, common_service_price, washing_machine_type, dryer_type)' 
    : '*, buildings(id, name, area, address, landlord_id, electricity_price, water_price, internet_price, common_service_price, washing_machine_type, dryer_type)';

  let q = supabase
    .from('rooms')
    .select(selectQuery)
    .order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (filterLandlordCode) q = q.eq('buildings.landlord_id', filterLandlordCode);
  const { data, error } = await q;
  if (error) throw error;

  const roomsWithLandlord = (data ?? []).map((room: any) => {
    return {
      ...room,
      landlord_code: room.landlord_id ?? '—',
    };
  });

  return roomsWithLandlord as unknown as RoomWithBuilding[];
}

export async function getRoomsByBuilding(buildingId: string, companyId?: string): Promise<DBRoom[]> {
  let q = supabase
    .from('rooms')
    .select('*')
    .eq('building_id', buildingId)
    .order('floor', { ascending: true })
    .order('code', { ascending: true });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBRoom[];
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
  const { data, error } = await supabase.from('rooms').insert(r as any).select().single();
  if (error) throw error;
  return data as unknown as DBRoom;
}

export async function updateRoom(id: string, r: RoomUpdate): Promise<DBRoom> {
  const { data, error } = await supabase
    .from('rooms').update({ ...(r as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as DBRoom;
}

export async function deleteRoom(id: string) {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}
