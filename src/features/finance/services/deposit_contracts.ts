import { supabase } from '@/lib/supabase/client';
import type { DBDepositContract, Database } from '@/lib/supabase/types';

export type DepositContractInsert = Database['public']['Tables']['deposit_contracts']['Insert'];
export type DepositContractUpdate = Database['public']['Tables']['deposit_contracts']['Update'];

export type DepositContractWithRoom = DBDepositContract & {
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
 * Lấy danh sách hợp đồng đặt cọc theo company_id.
 */
export async function getDepositContracts(companyId?: string, landlordId?: string): Promise<DepositContractWithRoom[]> {
  let filterLandlordCode = landlordId;
  if (landlordId && landlordId.includes('-')) {
    const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
    filterLandlordCode = landlord?.code || landlordId;
  }

  const selectQuery = filterLandlordCode
    ? '*, rooms!inner(code, price, rose, buildings!inner(name, address, area, landlord_id))'
    : '*, rooms(code, price, rose, buildings(name, address, area))';

  let q = supabase
    .from('deposit_contracts')
    .select(selectQuery)
    .order('created_at', { ascending: false });

  if (companyId) {
    q = q.eq('company_id', companyId);
  }
  if (filterLandlordCode) {
    q = q.eq('rooms.buildings.landlord_id', filterLandlordCode);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DepositContractWithRoom[];
}

/**
 * Lấy thông tin chi tiết một hợp đồng đặt cọc theo id.
 */
export async function getDepositContract(id: string): Promise<DepositContractWithRoom | null> {
  const { data, error } = await supabase
    .from('deposit_contracts')
    .select('*, rooms(code, price, rose, buildings(name, address, area))')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DepositContractWithRoom | null;
}

/**
 * Tạo mới hợp đồng đặt cọc.
 */
export async function createDepositContract(contract: DepositContractInsert): Promise<DBDepositContract> {
  const { data, error } = await supabase
    .from('deposit_contracts')
    .insert(contract as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBDepositContract;
}

/**
 * Cập nhật thông tin hợp đồng đặt cọc.
 */
export async function updateDepositContract(id: string, updates: DepositContractUpdate): Promise<DBDepositContract> {
  const { data, error } = await supabase
    .from('deposit_contracts')
    .update({ ...(updates as any), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBDepositContract;
}

/**
 * Xóa hợp đồng đặt cọc.
 */
export async function deleteDepositContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('deposit_contracts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
