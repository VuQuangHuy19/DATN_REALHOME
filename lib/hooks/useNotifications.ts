import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getActivityLogs } from '@/lib/supabase/repositories/notifications';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type DBNotification = Database['public']['Tables']['notifications']['Row'];
type DBActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export function useNotifications(userId?: string, companyId?: string) {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications(userId, companyId);
      setNotifications(data);
    } catch {}
    setLoading(false);
  }, [userId, companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime subscription: prepend new notifications as they arrive
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`notifications:${companyId}:${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { new?: DBNotification }) => {
          const newRow = payload.new as DBNotification;
          // Only prepend if matches recipient filter (or no filter)
          if (!userId || newRow.recipient_id === null || newRow.recipient_id === userId) {
            setNotifications((prev) => [newRow, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { new?: DBNotification }) => {
          const updated = payload.new as DBNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetch };
}

export function useActivityLogs(companyId?: string) {
  const [logs, setLogs] = useState<DBActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getActivityLogs(companyId)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [companyId]);

  // Realtime subscription: prepend new activity logs
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`activity_logs:${companyId}:${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { new?: DBActivityLog }) => {
          const newRow = payload.new as DBActivityLog;
          setLogs((prev) => [newRow, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return { logs, loading };
}
