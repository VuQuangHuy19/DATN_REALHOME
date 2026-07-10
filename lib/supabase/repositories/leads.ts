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

  // Sync to appointments table (by matching customer phone number)
  try {
    const lead = data as unknown as DBLead;
    if (lead && lead.phone && lead.company_id) {
      const aptPatch: any = {};

      // 1. Sync assigned_to and assigned_to_name
      if ('assigned_to' in updates) {
        aptPatch.assigned_to = lead.assigned_to;
        if (lead.assigned_to) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', lead.assigned_to)
            .maybeSingle();
          aptPatch.assigned_to_name = profile?.full_name || profile?.email || null;
        } else {
          aptPatch.assigned_to_name = null;
        }
      }

      // 2. Sync status: map lead status to appointment status
      if ('status' in updates) {
        let mappedStatus: string | null = null;
        if (lead.status === 'appointment') {
          mappedStatus = 'Confirm';
        } else if (lead.status === 'viewed') {
          mappedStatus = 'Viewed';
        } else if (lead.status === 'rented') {
          mappedStatus = 'Dealed';
        } else if (lead.status === 'cancelled') {
          mappedStatus = 'Cancel';
        }

        if (mappedStatus) {
          aptPatch.status = mappedStatus;
        }
      }

      if (Object.keys(aptPatch).length > 0) {
        await supabase
          .from('appointments')
          .update({ ...aptPatch, updated_at: new Date().toISOString() })
          .eq('company_id', lead.company_id)
          .eq('customer_phone', lead.phone);
      }
    }
  } catch (syncErr) {
    console.error('Error syncing lead to appointments:', syncErr);
  }

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
