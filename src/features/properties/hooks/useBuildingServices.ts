import { useState, useCallback, useEffect } from 'react';
import { getBuildingServices, createBuildingService, updateBuildingService, deleteBuildingService } from '@/lib/supabase/repositories/building-services';
import type { DBBuildingService } from '@/lib/supabase/types';

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
