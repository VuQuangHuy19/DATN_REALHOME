import { useState, useEffect, useCallback } from 'react';
import { getConsultations, createConsultation, updateConsultation, deleteConsultation } from '@/lib/supabase/repositories/consultations';
import type { Database } from '@/lib/supabase/types';

type DBConsultation = Database['public']['Tables']['consultations']['Row'];

export function useConsultations(companyId?: string) {
  const [consultations, setConsultations] = useState<DBConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConsultations(companyId);
      setConsultations(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: Parameters<typeof createConsultation>[0]) => {
    try {
      const data = await createConsultation(item);
      setConsultations((prev) => [data, ...prev]);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    try {
      const data = await updateConsultation(id, patch);
      setConsultations((prev) => prev.map((c) => c.id === id ? data : c));
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteConsultation(id);
      setConsultations((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { consultations, loading, error, refetch: fetch, add, update, remove };
}
