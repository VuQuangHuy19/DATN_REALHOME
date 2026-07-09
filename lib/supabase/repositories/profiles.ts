import { supabase } from '../client';
import type { Database } from '../types';

type DBProfile = Database['public']['Tables']['profiles']['Row'];

export async function getProfiles(companyId?: string): Promise<DBProfile[]> {
  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBProfile[];
}

export async function updateProfile(id: string, patch: Partial<DBProfile>): Promise<DBProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...(patch as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as DBProfile;
}
