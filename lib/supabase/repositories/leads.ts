import { supabase } from '../client';
import type { DBLead, DBLeadActivity } from '../types';

export type LeadInsert = Omit<DBLead, 'id' | 'created_at' | 'updated_at'>;
export type LeadUpdate = Partial<LeadInsert>;
export type LeadActivityInsert = Omit<DBLeadActivity, 'id' | 'created_at'>;

export async function getLeads(companyId?: string): Promise<DBLead[]> {
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DBLead[];
}

export async function getLead(id: string): Promise<DBLead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DBLead | null;
}

export async function createLead(lead: LeadInsert): Promise<DBLead> {
  const { data, error } = await supabase.from('leads').insert(lead as any).select().single();
  if (error) throw error;
  return data as unknown as DBLead;
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<DBLead> {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...(updates as any), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DBLead;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function getLeadActivities(leadId: string): Promise<DBLeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DBLeadActivity[];
}

export async function createLeadActivity(activity: LeadActivityInsert): Promise<DBLeadActivity> {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert(activity as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DBLeadActivity;
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: DBLead['status'],
  userId: string,
  userName: string
): Promise<DBLead> {
  const lead = await getLead(leadId);
  if (!lead) throw new Error('Lead not found');

  const updated = await updateLead(leadId, { status: newStatus });

  await createLeadActivity({
    lead_id: leadId,
    company_id: lead.company_id,
    type: 'status_change',
    content: `Chuyển trạng thái từ "${lead.status}" sang "${newStatus}"`,
    old_status: lead.status,
    new_status: newStatus,
    created_by: userId,
    created_by_name: userName,
  });

  return updated;
}
