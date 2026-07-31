import { supabase } from '@/lib/supabase/client';
import type { DBRentalContract, Database } from '@/lib/supabase/types';

export type RentalContractInsert = Database['public']['Tables']['rental_contracts']['Insert'];
export type RentalContractUpdate = Database['public']['Tables']['rental_contracts']['Update'];

export type RentalContractWithRoom = DBRentalContract & {
  rooms: {
    code: string;
    price: number;
    rose?: string | null;
    buildings: {
      name: string;
      address: string | null;
      area: string;
    } | null;
  } | null;
};

/**
 * Lấy danh sách hợp đồng thuê theo company_id.
 */
export async function getRentalContracts(companyId?: string, landlordId?: string): Promise<RentalContractWithRoom[]> {
  let landlordRoomIds: string[] | null = null;
  if (landlordId) {
    let filterLandlordCode = landlordId;
    if (landlordId.includes('-')) {
      const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
      filterLandlordCode = landlord?.code || landlordId;
    }
    const { data: landlordRooms } = await supabase
      .from('rooms')
      .select('id')
      .or(`landlord_id.eq.${filterLandlordCode},landlord_id.eq.${landlordId}`);
    landlordRoomIds = (landlordRooms ?? []).map((r: any) => r.id);
  }

  let q = supabase
    .from('rental_contracts')
    .select('*, rooms(code, price, rose, buildings(name, address, area))')
    .order('created_at', { ascending: false });

  if (companyId) {
    q = q.eq('company_id', companyId);
  }
  if (landlordRoomIds !== null) {
    if (landlordRoomIds.length === 0) return [];
    q = q.in('room_id', landlordRoomIds);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as RentalContractWithRoom[];
}

/**
 * Lấy chi tiết hợp đồng thuê theo id.
 */
export async function getRentalContract(id: string): Promise<RentalContractWithRoom | null> {
  const { data, error } = await supabase
    .from('rental_contracts')
    .select('*, rooms(code, price, rose, buildings(name, address, area))')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as RentalContractWithRoom | null;
}

/**
 * Tạo hợp đồng thuê mới.
 */
export async function createRentalContract(contract: RentalContractInsert): Promise<DBRentalContract> {
  const { data, error } = await supabase
    .from('rental_contracts')
    .insert(contract as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBRentalContract;
}

/**
 * Cập nhật thông tin hợp đồng thuê.
 */
export async function updateRentalContract(id: string, updates: RentalContractUpdate): Promise<DBRentalContract> {
  const { data, error } = await supabase
    .from('rental_contracts')
    .update({ ...(updates as any), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBRentalContract;
}

/**
 * Xóa hợp đồng thuê.
 */
export async function deleteRentalContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('rental_contracts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
