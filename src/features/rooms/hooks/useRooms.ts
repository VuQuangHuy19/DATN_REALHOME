import { useState, useCallback, useEffect } from 'react';
import { getRooms, getRoomsByBuilding, createRoom, updateRoom, deleteRoom, type RoomWithBuilding } from '@/src/features/rooms/services/rooms';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBRoom } from '@/lib/supabase/types';

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

export function useRoomsByBuilding(buildingId: string | undefined, companyId?: string) {
  const [items, setItems] = useState<DBRoom[]>([]);
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
