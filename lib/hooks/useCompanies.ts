import { useState, useEffect, useCallback } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany, getCompanyStats, type CompanyInsert, type CompanyUpdate } from '@/src/features/staff/services/companies';
import type { DBCompany } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';

export function useCompanies() {
  const [companies, setCompanies] = useState<DBCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanies();
      setCompanies(data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();

    // Lắng nghe Realtime từ Supabase cho bảng companies
    const channel = supabase
      .channel('realtime-companies-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
        },
        (payload: { eventType: string; new?: DBCompany; old?: { id: string } }) => {
          if (payload.eventType === 'INSERT') {
            const newCompany = payload.new as DBCompany;
            setCompanies((prev) => {
              if (prev.some((c) => c.id === newCompany.id)) return prev;
              return [newCompany, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCompany = payload.new as DBCompany;
            setCompanies((prev) =>
              prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setCompanies((prev) => prev.filter((c) => c.id !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetch]);

  const add = async (company: CompanyInsert) => {
    try {
      const data = await createCompany(company);
      setCompanies((prev) => [data, ...prev]);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: CompanyUpdate) => {
    try {
      const data = await updateCompany(id, patch);
      setCompanies((prev) => prev.map((c) => c.id === id ? data : c));
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteCompany(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { companies, loading, error, refetch: fetch, add, update, remove };
}

export function useCompanyStats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getCompanyStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompanyStats();
      setStats(data);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Lắng nghe Realtime để cập nhật Stats khi bảng companies thay đổi
    const channel = supabase
      .channel('realtime-company-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
        },
        () => {
          getCompanyStats().then((data) => {
            setStats(data);
          }).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
