'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { SalesDashboardView } from '@/components/admin/SalesDashboardView';
import { Loader2, AlertCircle } from 'lucide-react';

export default function BrokerPage() {
  const { company, profile, user } = useAuth();
  const [salesStats, setSalesStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    const saleId = profile?.id || user?.id || '';

    const fetchStats = () => {
      setLoading(true);
      getSalesDashboardStats(company.id, saleId)
        .then((data) => {
          setSalesStats(data);
          setError(null);
        })
        .catch((err) => {
          console.error('Error loading broker stats:', err);
          setError(err.message || 'Lỗi tải dữ liệu phân hệ môi giới');
        })
        .finally(() => {
          setLoading(false);
        });
    };

    fetchStats();

    const channel = supabase
      .channel('broker_realtime_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${company.id}` },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `company_id=eq.${company.id}` },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, profile?.id, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <SalesDashboardView
        stats={salesStats}
        saleName={profile?.full_name || user?.user_metadata?.full_name || 'Môi giới / Sales Partner'}
      />
    </div>
  );
}
