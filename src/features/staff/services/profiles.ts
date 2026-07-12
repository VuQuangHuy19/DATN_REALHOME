import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type DBProfile = Database['public']['Tables']['profiles']['Row'];

const SELECT_COLUMNS = 'id, company_id, full_name, email, phone, role, avatar_url, is_active, created_at, updated_at, landlord_id';

export async function getProfiles(companyId?: string): Promise<DBProfile[]> {
  let q = supabase.from('profiles').select(SELECT_COLUMNS).order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBProfile[];
}

export async function updateProfile(id: string, patch: Partial<DBProfile>): Promise<DBProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...(patch as any), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as DBProfile;
}
