import { supabase } from '../client';
import type { DBBuildingService } from '../types';

type ServiceInsert = Omit<DBBuildingService, 'id' | 'created_at'>;
type ServiceUpdate = Partial<ServiceInsert>;

export async function getBuildingServices(buildingId: string): Promise<DBBuildingService[]> {
  try {
    const res = await fetch(`/api/buildings/services?buildingId=${encodeURIComponent(buildingId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.services)) {
        return data.services;
      }
    }
  } catch (err) {
    console.warn('[getBuildingServices] API fallback to client:', err);
  }

  const { data, error } = await supabase
    .from('building_services')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DBBuildingService[];
}

export async function createBuildingService(s: ServiceInsert): Promise<DBBuildingService> {
  try {
    const res = await fetch('/api/buildings/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi tạo dịch vụ bổ sung');
    }
    if (data.service) {
      return data.service as DBBuildingService;
    }
  } catch (err: any) {
    console.warn('[createBuildingService] API error, fallback to client:', err.message);
  }

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
  try {
    const res = await fetch(`/api/buildings/services?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      return;
    }
  } catch (err) {
    console.warn('[deleteBuildingService] API fallback to client:', err);
  }

  const { error } = await supabase
    .from('building_services')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
