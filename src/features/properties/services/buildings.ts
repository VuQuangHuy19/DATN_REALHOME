import { supabase } from '@/lib/supabase/client';
import type { DBBuilding } from '@/lib/supabase/types';

type BuildingInsert = Omit<DBBuilding, 'id' | 'created_at' | 'updated_at'>;
type BuildingUpdate = Partial<BuildingInsert>;

export async function getBuildings(companyId?: string, landlordId?: string): Promise<DBBuilding[]> {
  let filterLandlordCode = landlordId;
  if (landlordId && landlordId.includes('-')) {
    const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
    filterLandlordCode = landlord?.code || landlordId;
  }

  let q = supabase.from('buildings').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (filterLandlordCode) q = q.eq('landlord_id', filterLandlordCode);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBBuilding[];
}

export async function getBuilding(id: string): Promise<DBBuilding | null> {
  const { data, error } = await supabase.from('buildings').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as DBBuilding | null;
}

export async function createBuilding(b: BuildingInsert): Promise<DBBuilding> {
  const { data, error } = await supabase.from('buildings').insert(b as any).select().single();
  if (error) throw error;

  if (b.landlord_id) {
    const { data: landlord } = await supabase
      .from('landlords')
      .select('properties_count')
      .eq('code', b.landlord_id)
      .maybeSingle();

    if (landlord) {
      await supabase
        .from('landlords')
        .update({ properties_count: (landlord.properties_count || 0) + 1 })
        .eq('code', b.landlord_id);
    }
  }

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
