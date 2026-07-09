import {
  getRooms,
  getRoomsByBuilding,
  createRoom,
  updateRoom,
  deleteRoom,
} from '@/lib/supabase/repositories/rooms';
import type { DBRoom } from '@/lib/supabase/types';

export async function getRoomsClient(companyId?: string) {
  return getRooms(companyId);
}

export async function getRoomsByBuildingClient(buildingId: string, companyId?: string): Promise<DBRoom[]> {
  return getRoomsByBuilding(buildingId, companyId);
}

export async function createRoomClient(payload: Partial<DBRoom>) {
  const normalizedPayload = {
    ...payload,
    company_id: payload.company_id ?? null,
    building_id: payload.building_id ?? null,
    code: payload.code ?? '',
    floor: payload.floor ?? 0,
    room_type: payload.room_type ?? null,
    size: payload.size ?? null,
    price: payload.price ?? 0,
    status: payload.status ?? 'available',
    bedrooms: payload.bedrooms ?? 0,
    bathrooms: payload.bathrooms ?? 0,
    description: payload.description ?? null,
    has_private_balcony: payload.has_private_balcony ?? false,
    max_occupants: payload.max_occupants ?? 2,
    max_vehicles_per_room: payload.max_vehicles_per_room ?? 2,
    min_contract_months: payload.min_contract_months ?? 12,
  };

  return createRoom(normalizedPayload as any);
}

export async function updateRoomClient(id: string, payload: Partial<DBRoom>) {
  return updateRoom(id, payload as any);
}

export async function deleteRoomClient(id: string) {
  return deleteRoom(id);
}
