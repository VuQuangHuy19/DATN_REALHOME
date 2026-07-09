'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DBRoom } from '@/lib/supabase/types';
import {
  getRoomsByBuildingClient,
  createRoomClient,
  updateRoomClient,
  deleteRoomClient,
} from '../services/rooms.client';

export function useRoomsFeature(buildingId?: string, companyId?: string) {
  const [items, setItems] = useState<DBRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!buildingId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setItems(await getRoomsByBuildingClient(buildingId, companyId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [buildingId, companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (item: Partial<DBRoom>) => {
    try {
      const created = await createRoomClient(item as any);
      await fetch();
      return created;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: Partial<DBRoom>) => {
    try {
      const updated = await updateRoomClient(id, patch);
      await fetch();
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoomClient(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}
