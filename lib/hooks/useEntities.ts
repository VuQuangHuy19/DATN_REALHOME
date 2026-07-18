import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getBuildings, createBuilding, updateBuilding, deleteBuilding } from '@/src/features/properties/services/buildings';
import { getLandlords, createLandlord, updateLandlord, deleteLandlord } from '@/lib/supabase/repositories/landlords';
import { getRooms, getRoomsByBuilding, createRoom, updateRoom, deleteRoom, type RoomWithBuilding } from '@/src/features/rooms/services/rooms';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, type AppointmentWithRelations } from '@/src/features/staff/services/appointments';
import { getContractTemplates, createContractTemplate, updateContractTemplate, deleteContractTemplate } from '@/lib/supabase/repositories/contracts';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/src/features/staff/services/employees';
import { getDepositContracts, createDepositContract, updateDepositContract, deleteDepositContract, type DepositContractWithRoom } from '@/src/features/finance/services/deposit_contracts';
import { getRentalContracts, createRentalContract, updateRentalContract, deleteRentalContract, type RentalContractWithRoom } from '@/src/features/finance/services/rental_contracts';
import { getRoomImages, addRoomImage, deleteRoomImage, setRoomThumbnail, updateRoomImagePriority } from '@/lib/supabase/repositories/room_images';
import { getBuildingServices, createBuildingService, updateBuildingService, deleteBuildingService } from '@/lib/supabase/repositories/building-services';
import { getPriceRanges, createPriceRange, updatePriceRange, deletePriceRange, getAmenities, createAmenity, updateAmenity, deleteAmenity, getRoomTypes, createRoomType, updateRoomType, deleteRoomType, type DBPriceRange, type DBAmenity, type DBRoomType } from '@/lib/supabase/repositories/categories';
import { getProvinces, getDistricts, getWards, type VnProvince, type VnDistrict, type VnWard } from '@/lib/supabase/repositories/vn_locations';
import { getProfiles } from '@/src/features/staff/services/profiles';
import type { DBBuilding, DBLandlord, DBRoom, DBAppointment, DBContractTemplate, DBEmployee, DBDepositContract, DBRentalContract, DBRoomImage, DBBuildingService } from '@/lib/supabase/types';


function makeHook<T>(
  fetcher: (companyId?: string, landlordId?: string) => Promise<T[]>,
  creator: (item: any) => Promise<T>,
  updater: (id: string, item: any) => Promise<T>,
  remover: (id: string, companyId?: string) => Promise<void>
) {
  return function useEntity(companyId?: string) {
    const { role, profile } = useAuth();
    const landlordId = role === 'landlord' ? profile?.landlord_id ?? '00000000-0000-0000-0000-000000000000' : undefined;
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetcher(companyId, landlordId);

        setItems(res);
      } catch (e: any) {

        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, [companyId, landlordId, role]);

    useEffect(() => { fetch(); }, [fetch]);

    const add = async (item: any): Promise<T | null> => {
      try {
        const created = await creator(item);
        setItems((prev) => [created, ...prev]);
        return created;
      } catch (e: any) { setError(e.message); return null; }
    };

    const update = async (id: string, patch: any): Promise<T | null> => {
      try {
        const updated = await updater(id, patch);
        setItems((prev) => prev.map((i: any) => i.id === id ? { ...i, ...updated } : i));
        return updated;
      } catch (e: any) { setError(e.message); return null; }
    };

    const remove = async (id: string) => {
      try {
        await remover(id, companyId);
        setItems((prev) => (prev as any[]).filter((i) => i.id !== id));
      } catch (e: any) { setError(e.message); }
    };

    return { items, loading, error, refetch: fetch, add, update, remove };
  };
}

export const useBuildings = makeHook<DBBuilding>(getBuildings, createBuilding, updateBuilding, deleteBuilding);
export const useLandlords = makeHook<DBLandlord>(getLandlords, createLandlord, updateLandlord, deleteLandlord);

export function useAppointments(companyId?: string) {
  const { role, profile } = useAuth();
  const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef<string[]>([]);
  useEffect(() => {
    itemsRef.current = items.map(i => i.id);
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
        playNote(587.33, now, 0.4); // D5
        playNote(880.00, now + 0.12, 0.6); // A5
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
          // Tải lại danh sách từ DB để cập nhật đầy đủ (bao gồm cả map chủ nhà)
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
            // Nếu người dùng hiện tại là sale và vừa được chỉ định lịch hẹn này
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

export const useContractTemplates = makeHook<DBContractTemplate>(getContractTemplates, createContractTemplate, updateContractTemplate, deleteContractTemplate);
export const useEmployees = makeHook<DBEmployee>(getEmployees, createEmployee, updateEmployee, deleteEmployee);

export function useRooms(companyId?: string) {
  const { role, profile } = useAuth();
  const landlordId = role === 'landlord' ? profile?.landlord_id ?? '00000000-0000-0000-0000-000000000000' : undefined;
  const [items, setItems] = useState<RoomWithBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getRooms(companyId, landlordId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, landlordId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: any) => {
    try {
      const created = await createRoom(item);
      await fetch();
      return created;
    } catch (e: any) { setError(e.message); return null; }
  };

  const update = async (id: string, patch: any) => {
    try {
      const updated = await updateRoom(id, patch);
      await fetch();
      return updated;
    } catch (e: any) { setError(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoom(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

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

  // Realtime subscription for deposit_contracts
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


export function useRoomsByBuilding(buildingId: string | undefined, companyId?: string) {
  const [items, setItems] = useState<import('@/lib/supabase/types').DBRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!buildingId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setItems(await getRoomsByBuilding(buildingId, companyId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [buildingId, companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: any) => {
    try {
      const created = await createRoom(item);
      await fetch();
      return created;
    } catch (e: any) { setError(e.message); return null; }
  };

  const update = async (id: string, patch: any) => {
    try {
      const updated = await updateRoom(id, patch);
      await fetch();
      return updated;
    } catch (e: any) { setError(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoom(id);
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

  // Realtime subscription for rental_contracts
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

export function useRoomImages(roomId?: string) {
  const [images, setImages] = useState<DBRoomImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      setImages(await getRoomImages(roomId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (img: Omit<DBRoomImage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await addRoomImage(img);
      setImages((prev) => [...prev, created]);
      return created;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoomImage(id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const makeThumbnail = async (id: string) => {
    if (!roomId) return;
    try {
      await setRoomThumbnail(roomId, id);
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_thumbnail: img.id === id,
        }))
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updatePriority = async (id: string, priority: number) => {
    try {
      await updateRoomImagePriority(id, priority);
      setImages((prev) =>
        prev
          .map((img) => (img.id === id ? { ...img, priority } : img))
          .sort((a, b) => a.priority - b.priority || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { images, loading, error, refetch: fetch, add, remove, makeThumbnail, updatePriority };
}

export function useBuildingServices(buildingId?: string) {
  const [services, setServices] = useState<DBBuildingService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!buildingId) return;
    setLoading(true);
    setError(null);
    try {
      setServices(await getBuildingServices(buildingId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (s: Omit<DBBuildingService, 'id' | 'created_at'>) => {
    try {
      const created = await createBuildingService(s);
      setServices((prev) => [...prev, created]);
      return created;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: Partial<DBBuildingService>) => {
    try {
      const updated = await updateBuildingService(id, patch);
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteBuildingService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { services, loading, error, refetch: fetch, add, update, remove };
}

// ─── Categories Hooks ────────────────────────────────────────────────────────

export function usePriceRanges(companyId?: string) {
  const [items, setItems] = useState<DBPriceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getPriceRanges(companyId));
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createPriceRange(payload);
      setItems(prev => [...prev, item].sort((a, b) => a.min - b.min));
      toast.success('Đã thêm khoảng giá');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const update = async (id: string, payload: Partial<Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const item = await updatePriceRange(id, payload);
      setItems(prev => prev.map(i => i.id === id ? item : i));
      toast.success('Đã cập nhật khoảng giá');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deletePriceRange(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Đã xóa khoảng giá');
    } catch (e: any) { toast.error(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useAmenities(companyId?: string) {
  const [items, setItems] = useState<DBAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getAmenities(companyId));
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createAmenity(payload);
      setItems(prev => [...prev, item]);
      toast.success('Đã thêm tiện ích');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const update = async (id: string, payload: Partial<Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const item = await updateAmenity(id, payload);
      setItems(prev => prev.map(i => i.id === id ? item : i));
      toast.success('Đã cập nhật tiện ích');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteAmenity(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Đã xóa tiện ích');
    } catch (e: any) { toast.error(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useRoomTypesCatalog(companyId?: string) {
  const [items, setItems] = useState<DBRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getRoomTypes(companyId));
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createRoomType(payload);
      setItems(prev => [...prev, item]);
      toast.success('Đã thêm loại phòng');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const update = async (id: string, payload: Partial<Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const item = await updateRoomType(id, payload);
      setItems(prev => prev.map(i => i.id === id ? item : i));
      toast.success('Đã cập nhật loại phòng');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoomType(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Đã xóa loại phòng');
    } catch (e: any) { toast.error(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

// ─── Vietnamese Administrative Location Hooks ────────────────────────────────

export function useVnProvinces() {
  const [items, setItems] = useState<VnProvince[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProvinces().then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  return { items, loading };
}

export function useVnDistricts(provinceId?: string) {
  const [items, setItems] = useState<VnDistrict[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDistricts(provinceId).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [provinceId]);

  return { items, loading };
}

export function useVnWards(districtId?: string) {
  const [items, setItems] = useState<VnWard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!districtId) { setItems([]); return; }
    setLoading(true);
    getWards(districtId).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [districtId]);

  return { items, loading };
}

export function useProfiles(companyId?: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    // Dùng API route server-side để bypass RLS (anon key bị chặn với bảng profiles)
    fetch(`/api/profiles?company_id=${companyId}`, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  return { items, loading };
}
