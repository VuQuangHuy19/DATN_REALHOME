import { supabase } from '@/lib/supabase/client';

export function subscribeToUserNotifications(
  userId: string,
  onNotificationReceived: (notification: any) => void
) {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`user_notifications_${userId}_${Math.random().toString(36).substring(2, 7)}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload: any) => {
        const newRow = payload.new;
        if (newRow) {
          if (!newRow.recipient_id || newRow.recipient_id === userId) {
            onNotificationReceived(newRow);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
