import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from '@/src/features/properties/services/buildings';
import type { DBBuilding } from '@/lib/supabase/types';

export async function getBuildingsClient(companyId?: string, landlordId?: string): Promise<DBBuilding[]> {
  return getBuildings(companyId, landlordId);
}

export async function createBuildingClient(payload: Omit<DBBuilding, 'id' | 'created_at' | 'updated_at'>): Promise<DBBuilding> {
  return createBuilding(payload);
}

export async function updateBuildingClient(id: string, payload: Partial<DBBuilding>): Promise<DBBuilding> {
  return updateBuilding(id, payload);
}

export async function deleteBuildingClient(id: string, companyId?: string): Promise<void> {
  void companyId;
  const res = await fetch(`/api/buildings/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Lỗi khi xóa tòa nhà');
  }
}
