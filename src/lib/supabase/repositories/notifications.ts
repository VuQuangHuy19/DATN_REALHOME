import { supabase } from '../client';
import type { Database } from '../types';

type DBNotification = Database['public']['Tables']['notifications']['Row'];
type DBActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export async function getNotifications(recipientId?: string, companyId?: string): Promise<DBNotification[]> {
  try {
    const params = new URLSearchParams();
    if (recipientId && recipientId !== 'undefined' && recipientId !== 'null') {
      params.set('userId', recipientId);
    }
    if (companyId && companyId !== 'undefined' && companyId !== 'null') {
      params.set('companyId', companyId);
    }
    const res = await fetch(`/api/notifications?${params.toString()}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data as DBNotification[];
    }
  } catch (err) {
    console.error('Error fetching notifications via API:', err);
  }

  // Fallback direct supabase query
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  if (recipientId) {
    query = query.or(`recipient_id.eq.${recipientId},recipient_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DBNotification[];
}

export async function markNotificationRead(id: string) {
  try {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  } catch {}
}

export async function markAllNotificationsRead(recipientId: string) {
  try {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: recipientId }),
    });
  } catch {}
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

export async function getActivityLogs(companyId?: string, limit = 100): Promise<DBActivityLog[]> {
  try {
    const params = new URLSearchParams();
    if (companyId && companyId !== 'undefined' && companyId !== 'null') {
      params.set('companyId', companyId);
    }
    params.set('limit', String(limit));
    const res = await fetch(`/api/activity-logs?${params.toString()}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data as DBActivityLog[];
    }
  } catch (err) {
    console.error('Error fetching activity logs via API:', err);
  }

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
