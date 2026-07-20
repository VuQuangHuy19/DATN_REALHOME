import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export function makeHook<T>(
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
