import { supabase } from '../client';
import type { Database } from '../types';

type DBNotification = Database['public']['Tables']['notifications']['Row'];
type DBActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export async function getNotifications(recipientId?: string, companyId?: string): Promise<DBNotification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (recipientId) query = query.eq('recipient_id', recipientId);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DBNotification[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(recipientId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function createNotification(notification: {
  company_id?: string;
  title: string;
  body: string;
  type: string;
  recipient_id?: string;
  link?: string;
}): Promise<DBNotification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DBNotification;
}

export async function getActivityLogs(companyId?: string, limit = 50): Promise<DBActivityLog[]> {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DBActivityLog[];
}

export async function createActivityLog(log: {
  company_id?: string;
  user_id?: string;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  entity: string;
  entity_id: string;
  entity_label: string;
  detail?: string;
  ip_address?: string;
}): Promise<DBActivityLog> {
  const { data, error } = await supabase.from('activity_logs').insert(log as any).select().single();
  if (error) throw error;
  return data as unknown as DBActivityLog;
}
