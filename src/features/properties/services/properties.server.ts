import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DBBuilding } from '@/lib/supabase/types';

export async function getBuildingsServer(companyId?: string): Promise<DBBuilding[]> {
  let query = supabaseAdmin.from('buildings').select('*');
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DBBuilding[];
}

export async function syncBuildingCountsServer(buildingId: string): Promise<{ buildingId: string; synced: boolean }> {
  return { buildingId, synced: true };
}
