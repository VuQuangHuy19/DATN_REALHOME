import { supabase } from '@/lib/supabase/client';
import type { DBManager, DBBuildingManager, DBBuildingOwner } from '@/lib/supabase/types';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bds_auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getManagers(companyId?: string, landlordId?: string): Promise<DBManager[]> {
  try {
    const queryParams = new URLSearchParams();
    if (companyId) queryParams.set('companyId', companyId);
    if (landlordId) queryParams.set('landlordId', landlordId);

    const res = await fetch(`/api/managers?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (res.ok) {
      const { data } = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('API getManagers failed, falling back to Supabase client query:', err);
  }

  // Fallback to client-side Supabase query
  let q = supabase.from('managers').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (landlordId) q = q.eq('landlord_id', landlordId);
  
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createManager(manager: Omit<DBManager, 'id' | 'created_at' | 'updated_at'>): Promise<DBManager> {
  const response = await fetch('/api/managers', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
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
    headers: getAuthHeaders(),
    credentials: 'include',
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
  const response = await fetch(`/api/managers?id=${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Lỗi khi xóa quản lý');
  }
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
