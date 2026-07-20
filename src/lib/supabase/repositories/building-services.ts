import { supabase } from '../client';
import type { DBBuildingService } from '../types';

type ServiceInsert = Omit<DBBuildingService, 'id' | 'created_at'>;
type ServiceUpdate = Partial<ServiceInsert>;

export async function getBuildingServices(buildingId: string): Promise<DBBuildingService[]> {
  const { data, error } = await supabase
    .from('building_services')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DBBuildingService[];
}

export async function createBuildingService(s: ServiceInsert): Promise<DBBuildingService> {
  const { data, error } = await supabase
    .from('building_services')
    .insert(s as any)
    .select()
    .single();
  if (error) throw error;
  return data as DBBuildingService;
}

export async function updateBuildingService(id: string, s: ServiceUpdate): Promise<DBBuildingService> {
  const { data, error } = await supabase
    .from('building_services')
    .update(s as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DBBuildingService;
}

export async function deleteBuildingService(id: string): Promise<void> {
  const { error } = await supabase
    .from('building_services')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
