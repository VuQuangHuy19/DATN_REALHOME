import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { makeHook } from '@/src/lib/hooks/makeHook';
import { getDepositContracts, createDepositContract, updateDepositContract, deleteDepositContract, type DepositContractWithRoom } from '@/src/features/finance/services/deposit_contracts';
import { getRentalContracts, createRentalContract, updateRentalContract, deleteRentalContract, type RentalContractWithRoom } from '@/src/features/finance/services/rental_contracts';
import { getContractTemplates, createContractTemplate, updateContractTemplate, deleteContractTemplate } from '@/lib/supabase/repositories/contracts';
import type { DBContractTemplate } from '@/lib/supabase/types';

export const useContractTemplates = makeHook<DBContractTemplate>(getContractTemplates, createContractTemplate, updateContractTemplate, deleteContractTemplate);

export function useDepositContracts(companyId?: string) {
  const { role, profile } = useAuth();
  const landlordId = role === 'landlord' ? profile?.landlord_id ?? '00000000-0000-0000-0000-000000000000' : undefined;
  const [items, setItems] = useState<DepositContractWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getDepositContracts(companyId, landlordId);
      if (role === 'sales_agent' && profile?.id) {
        setItems(all.filter((c) => c.created_by === profile.id || c.sales_agent_id === profile.id));
      } else {
        setItems(all);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, landlordId, role, profile?.id]);

  useEffect(() => { fetch(); }, [fetch]);

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
        playNote(523.25, now, 0.25); // C5
        playNote(659.25, now + 0.1, 0.25); // E5
        playNote(783.99, now + 0.2, 0.5); // G5
      } catch (e) {
        console.error('Không thể phát âm thanh thông báo:', e);
      }
    };

    const statusLabelsLocal: Record<string, string> = {
      draft: 'Bản nháp',
      active: 'Chờ xác nhận',
      signed: 'Đã xác nhận cọc',
      converted: 'Đã thuê',
      cancelled: 'Đã hủy',
      forfeited: 'Mất cọc',
      refunded: 'Trả cọc',
    };

    const channel = supabase
      .channel(`deposit-contracts-realtime:${companyId}:${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposit_contracts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { eventType: string; new?: any }) => {
          fetch();

          if (payload.eventType === 'UPDATE') {
            const updatedContract = payload.new;
            const isMyContract = updatedContract.created_by === profile?.id;
            const isAdminOrManager = role === 'company_admin' || role === 'manager';

            if (isMyContract || isAdminOrManager) {
              playNotificationSound();
              toast.success(`📝 Hợp đồng cọc thay đổi!`, {
                description: `Hợp đồng cọc #${updatedContract.contract_code} (khách ${updatedContract.party_b_name}) đã chuyển trạng thái thành: "${statusLabelsLocal[updatedContract.status] || updatedContract.status}"`,
                duration: 8000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetch, role, profile?.id]);

  const add = async (item: any) => {
    try {
      const created = await createDepositContract(item);
      await fetch();
      return created;
    } catch (e: any) { setError(e.message); return null; }
  };

  const update = async (id: string, patch: any) => {
    try {
      const updated = await updateDepositContract(id, patch);
      await fetch();
      return updated;
    } catch (e: any) { setError(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteDepositContract(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useRentalContracts(companyId?: string) {
  const { role, profile } = useAuth();
  const landlordId = role === 'landlord' ? profile?.landlord_id ?? '00000000-0000-0000-0000-000000000000' : undefined;
  const [items, setItems] = useState<RentalContractWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getRentalContracts(companyId, landlordId);
      if (role === 'sales_agent' && profile?.id) {
        setItems(all.filter((c) => c.created_by === profile.id || c.sales_agent_id === profile.id));
      } else {
        setItems(all);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, landlordId, role, profile?.id]);

  useEffect(() => { fetch(); }, [fetch]);

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
        playNote(523.25, now, 0.25); // C5
        playNote(659.25, now + 0.1, 0.25); // E5
        playNote(783.99, now + 0.2, 0.5); // G5
      } catch (e) {
        console.error('Không thể phát âm thanh thông báo:', e);
      }
    };

    const statusLabelsLocal: Record<string, string> = {
      draft: 'Bản nháp',
      active: 'Hiệu lực',
      ended: 'Đã hết hạn',
      terminated: 'Kết thúc sớm',
      cancelled: 'Đã hủy',
    };

    const channel = supabase
      .channel(`rental-contracts-realtime:${companyId}:${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_contracts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: { eventType: string; new?: any }) => {
          fetch();

          if (payload.eventType === 'UPDATE') {
            const updatedContract = payload.new;
            const isMyContract = updatedContract.created_by === profile?.id;
            const isAdminOrManager = role === 'company_admin' || role === 'manager';

            if (isMyContract || isAdminOrManager) {
              playNotificationSound();
              toast.success(`📝 Hợp đồng thuê thay đổi!`, {
                description: `Hợp đồng thuê #${updatedContract.contract_code} (khách ${updatedContract.party_b_name}) đã chuyển trạng thái thành: "${statusLabelsLocal[updatedContract.status] || updatedContract.status}"`,
                duration: 8000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetch, role, profile?.id]);

  const add = async (item: any) => {
    try {
      const created = await createRentalContract(item);
      await fetch();
      return created;
    } catch (e: any) { setError(e.message); return null; }
  };

  const update = async (id: string, patch: any) => {
    try {
      const updated = await updateRentalContract(id, patch);
      await fetch();
      return updated;
    } catch (e: any) { setError(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteRentalContract(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}
