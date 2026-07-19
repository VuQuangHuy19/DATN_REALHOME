import { supabase } from '@/lib/supabase/client';
import type { DBManager, DBBuildingManager, DBBuildingOwner } from '@/lib/supabase/types';

export async function getManagers(companyId?: string): Promise<DBManager[]> {
  let q = supabase.from('managers').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  
  const { data, error } = await q;

  if (error) throw error;
  return data || [];
}

export async function createManager(manager: Omit<DBManager, 'id' | 'created_at' | 'updated_at'>): Promise<DBManager> {
  const response = await fetch('/api/managers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manager),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Lỗi khi tạo quản lý');
  }

  const { data } = await response.json();
  return data;
}

export async function updateManager(id: string, updates: Partial<DBManager>): Promise<DBManager> {
  const response = await fetch('/api/managers', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Lỗi khi cập nhật quản lý');
  }

  const { data } = await response.json();
  return data;
}

export async function deleteManager(id: string): Promise<void> {
  const { error } = await supabase
    .from('managers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getBuildingManagers(buildingId: string) {
  const { data, error } = await supabase
    .from('building_managers')
    .select('*, managers(*)')
    .eq('building_id', buildingId);

  if (error) throw error;
  return data || [];
}

export async function assignManagerToBuilding(buildingId: string, managerId: string): Promise<void> {
  const { error } = await supabase
    .from('building_managers')
    .insert([{ building_id: buildingId, manager_id: managerId }]);

  if (error) throw error;
}

export async function removeManagerFromBuilding(buildingId: string, managerId: string): Promise<void> {
  const { error } = await supabase
    .from('building_managers')
    .delete()
    .eq('building_id', buildingId)
    .eq('manager_id', managerId);

  if (error) throw error;
}
