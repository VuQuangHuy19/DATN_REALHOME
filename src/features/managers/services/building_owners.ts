import { supabase } from '@/lib/supabase/client';
import type { DBBuildingOwner, DBLandlord } from '@/lib/supabase/types';

export async function getBuildingOwners(buildingId: string) {
  const { data, error } = await supabase
    .from('building_owners')
    .select('*, landlords(*)')
    .eq('building_id', buildingId);

  if (error) throw error;
  return data || [];
}

export async function addOwnerToBuilding(buildingId: string, landlordId: string, percent: number = 100): Promise<void> {
  const { error } = await supabase
    .from('building_owners')
    .insert([{ 
      building_id: buildingId, 
      landlord_id: landlordId, 
      ownership_percent: percent 
    }]);

  if (error) throw error;
}

export async function updateOwnerPercent(buildingId: string, landlordId: string, percent: number): Promise<void> {
  const { error } = await supabase
    .from('building_owners')
    .update({ ownership_percent: percent })
    .eq('building_id', buildingId)
    .eq('landlord_id', landlordId);

  if (error) throw error;
}

export async function removeOwnerFromBuilding(buildingId: string, landlordId: string): Promise<void> {
  const { error } = await supabase
    .from('building_owners')
    .delete()
    .eq('building_id', buildingId)
    .eq('landlord_id', landlordId);

  if (error) throw error;
}
