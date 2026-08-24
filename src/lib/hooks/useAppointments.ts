import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  type AppointmentWithRelations,
} from '@/src/features/staff/services/appointments';
import type { DBAppointment } from '@/lib/supabase/types';

export function useAppointments(companyId?: string) {
  const { role, profile } = useAuth();
  const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef<string[]>([]);
  useEffect(() => {
    itemsRef.current = items.map((i) => i.id);
  }, [items]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getAppointments(companyId, landlordId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, landlordId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playNote = (frequency: number, startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, startTime);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        const now = audioCtx.currentTime;
        playNote(587.33, now, 0.4);
        playNote(880.00, now + 0.12, 0.6);
      } catch (e) {
        console.error('Không thể phát âm thanh thông báo:', e);
      }
    };

    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '—';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return dateStr;
    };

    const channel = supabase
      .channel(`appointments-realtime:${companyId}:${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { eventType: string; new?: DBAppointment }) => {
          fetch();

          if (payload.eventType === 'INSERT') {
            const newApt = payload.new as DBAppointment;
            playNotificationSound();
            toast.success(`📅 Lịch hẹn mới!`, {
              description: `Khách hàng ${newApt.customer_name} vừa đặt lịch xem phòng ${newApt.room_title || ''} vào lúc ${newApt.time} ngày ${formatDate(newApt.date)}`,
              duration: 8000,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedApt = payload.new as DBAppointment;
            if (role === 'sales_agent' && profile?.id && updatedApt.assigned_to === profile.id) {
              const wasAlreadyAssigned = itemsRef.current.includes(updatedApt.id);
              if (!wasAlreadyAssigned) {
                playNotificationSound();
                toast.success(`📅 Bạn được phân công lịch hẹn mới!`, {
                  description: `Khách hàng ${updatedApt.customer_name} xem phòng ${updatedApt.room_title || ''} vào lúc ${updatedApt.time} ngày ${formatDate(updatedApt.date)}`,
                  duration: 8000,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetch, role, profile?.id]);

  const add = async (item: any): Promise<DBAppointment | null> => {
    try {
      const created = await createAppointment(item);
      const createdWithRelations: AppointmentWithRelations = {
        ...created,
        sale_name: null,
        sale_phone: null,
        company_name: null,
        company_phone: null,
        building_address: null,
      };
      setItems((prev) => [createdWithRelations, ...prev]);
      return created;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: any): Promise<DBAppointment | null> => {
    try {
      const updated = await updateAppointment(id, patch);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i) as AppointmentWithRelations));
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAppointment(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}
