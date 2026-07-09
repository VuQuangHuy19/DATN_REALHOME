import { supabase } from '../client';
import type { Database } from '../types';

type DBConsultation = Database['public']['Tables']['consultations']['Row'];

export async function getConsultations(companyId?: string): Promise<DBConsultation[]> {
  let query = supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DBConsultation[];
}

export async function createConsultation(consultation: {
  company_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  message: string;
  property_id?: string;
  property_title?: string;
  source: 'website' | 'phone' | 'email' | 'walk_in';
}): Promise<DBConsultation> {
  const { data, error } = await supabase
    .from('consultations')
    .insert({ ...consultation, status: 'new' } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DBConsultation;
}

export async function updateConsultation(id: string, updates: Record<string, unknown>): Promise<DBConsultation> {
  const { data, error } = await supabase
    .from('consultations')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DBConsultation;
}

export async function deleteConsultation(id: string) {
  const { error } = await supabase.from('consultations').delete().eq('id', id);
  if (error) throw error;
}
