import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getLeads, getLead, createLead, updateLead, deleteLead, getLeadActivities, createLeadActivity, updateLeadStatus, type LeadInsert, type LeadUpdate, type LeadActivityInsert } from '@/lib/supabase/repositories/leads';
import type { DBLead, DBLeadActivity } from '@/lib/supabase/types';

export function useLeads(companyId?: string) {
  const { role, profile } = useAuth();
  const [leads, setLeads] = useState<DBLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leadsRef = useRef<string[]>([]);
  useEffect(() => {
    leadsRef.current = leads.map((l) => l.id);
  }, [leads]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeads(companyId);
      setLeads(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

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
        playNote(587.33, now, 0.4); // D5
        playNote(880.00, now + 0.12, 0.6); // A5
      } catch (e) {
        console.error('Không thể phát âm thanh thông báo:', e);
      }
    };

    const channel = supabase
      .channel(`leads-realtime:${companyId}:${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { eventType: string; new?: DBLead }) => {
          fetch();

          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as DBLead;
            const isAssignedToMe = newLead.assigned_to === profile?.id;
            const isAdminOrManager = role === 'company_admin' || role === 'manager';

            if (isAssignedToMe || isAdminOrManager) {
              playNotificationSound();
              toast.success(isAssignedToMe ? `💼 Bạn có Lead mới được phân công!` : `💼 Lead mới vừa đăng ký!`, {
                description: `Khách hàng ${newLead.full_name} (${newLead.phone})` + (newLead.interest ? ` quan tâm: ${newLead.interest}` : ''),
                duration: 8000,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as DBLead;
            if (role === 'sales_agent' && profile?.id && updatedLead.assigned_to === profile.id) {
              const wasAlreadyAssigned = leadsRef.current.includes(updatedLead.id);
              if (!wasAlreadyAssigned) {
                playNotificationSound();
                toast.success(`💼 Bạn được phân công Lead mới!`, {
                  description: `Khách hàng ${updatedLead.full_name} (${updatedLead.phone})` + (updatedLead.interest ? ` quan tâm: ${updatedLead.interest}` : ''),
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

  const add = async (lead: LeadInsert) => {
    try {
      const data = await createLead(lead);
      setLeads((prev) => [data, ...prev]);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: LeadUpdate) => {
    try {
      const data = await updateLead(id, patch);
      setLeads((prev) => prev.map((l) => l.id === id ? data : l));
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { leads, loading, error, refetch: fetch, add, update, remove };
}

export function useLeadDetail(leadId: string) {
  const [lead, setLead] = useState<DBLead | null>(null);
  const [activities, setActivities] = useState<DBLeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    Promise.all([getLead(leadId), getLeadActivities(leadId)]).then(([ld, acts]) => {
      setLead(ld);
      setActivities(acts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [leadId]);

  const addActivity = async (activity: LeadActivityInsert) => {
    const data = await createLeadActivity(activity);
    setActivities((prev) => [...prev, data]);
    return data;
  };

  const changeStatus = async (newStatus: DBLead['status'], userId: string, userName: string) => {
    if (!lead) return null;
    const data = await updateLeadStatus(leadId, newStatus, userId, userName);
    setLead((prev) => prev ? { ...prev, status: newStatus } : prev);
    return data;
  };

  return { lead, activities, loading, addActivity, changeStatus };
}
