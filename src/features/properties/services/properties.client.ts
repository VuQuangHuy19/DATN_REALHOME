import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from '@/lib/supabase/repositories/buildings';
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
  return deleteBuilding(id);
}
