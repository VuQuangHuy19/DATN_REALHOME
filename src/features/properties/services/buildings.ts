import { supabase } from '@/lib/supabase/client';
import type { DBBuilding } from '@/lib/supabase/types';

type BuildingInsert = Omit<DBBuilding, 'id' | 'created_at' | 'updated_at'>;
type BuildingUpdate = Partial<BuildingInsert>;

export async function getBuildings(companyId?: string, landlordId?: string): Promise<DBBuilding[]> {
  let validLandlordKeys: string[] = [];
  if (landlordId) {
    validLandlordKeys.push(landlordId);
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id, code')
      .or(`id.eq.${landlordId},code.eq.${landlordId}`)
      .maybeSingle();
    if (landlord) {
      if (landlord.id && !validLandlordKeys.includes(landlord.id)) validLandlordKeys.push(landlord.id);
      if (landlord.code && !validLandlordKeys.includes(landlord.code)) validLandlordKeys.push(landlord.code);
    }
  }

  let q = supabase.from('buildings').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
  if (validLandlordKeys.length > 0) {
    q = q.in('landlord_id', validLandlordKeys);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBBuilding[];
}

export async function getBuilding(id: string): Promise<DBBuilding | null> {
  const { data, error } = await supabase.from('buildings').select('*').or(`id.eq.${id},code.eq.${id}`).maybeSingle();
  if (error) throw error;
  return data as unknown as DBBuilding | null;
}

export async function createBuilding(b: BuildingInsert): Promise<DBBuilding> {
  // Anti-duplication check: Check if building with same code or name exists in company
  if (b.company_id) {
    let checkQuery = supabase.from('buildings').select('id, code, name').eq('company_id', b.company_id);
    if (b.code && b.name) {
      checkQuery = checkQuery.or(`code.eq.${b.code},name.ilike.${b.name.trim()}`);
    } else if (b.code) {
      checkQuery = checkQuery.eq('code', b.code);
    } else if (b.name) {
      checkQuery = checkQuery.ilike('name', b.name.trim());
    }

    const { data: existing } = await checkQuery.limit(1).maybeSingle();
    if (existing) {
      // Update existing building instead of creating duplicate
      return updateBuilding(existing.id, b);
    }
  }

  const { data, error } = await supabase.from('buildings').insert(b as any).select().single();
  if (error) throw error;

  return data as unknown as DBBuilding;
}

export async function updateBuilding(id: string, b: BuildingUpdate): Promise<DBBuilding> {
  const { data, error } = await supabase
    .from('buildings').update({ ...(b as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as DBBuilding;
}

export async function deleteBuilding(id: string) {
  const { error } = await supabase.from('buildings').delete().eq('id', id);
  if (error) throw error;
}
