import { supabase } from '@/lib/supabase/client';

export function subscribeToUserNotifications(
  userId: string,
  onNotificationReceived: (notification: any) => void
) {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`user_notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload: any) => {
        if (payload.new) {
          onNotificationReceived(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
