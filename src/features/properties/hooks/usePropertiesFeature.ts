'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DBBuilding } from '@/lib/supabase/types';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getBuildingsClient,
  createBuildingClient,
  updateBuildingClient,
  deleteBuildingClient,
} from '../services/properties.client';

export function usePropertiesFeature(companyId?: string) {
  const { role, profile } = useAuth();
  const landlordId = role === 'landlord' ? profile?.landlord_id ?? '00000000-0000-0000-0000-000000000000' : undefined;
  const [items, setItems] = useState<DBBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBuildingsClient(companyId, landlordId);

      setItems(res);
    } catch (e: any) {

      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, landlordId, role, profile?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (item: Partial<DBBuilding>) => {
    try {
      const created = await createBuildingClient(item as any);
      setItems((prev) => [created, ...prev]);
      return created;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: Partial<DBBuilding>) => {
    try {
      const updated = await updateBuildingClient(id, patch);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteBuildingClient(id, companyId);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}
