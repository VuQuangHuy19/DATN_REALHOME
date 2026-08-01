'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { LandlordDashboardView } from '@/components/admin/LandlordDashboardView';
import { Loader2, AlertCircle } from 'lucide-react';

export default function LandlordDashboardPage() {
  const { company, profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<string>('last_month'); // Default to last_month (07/2026) for instant demo data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id || !profile?.landlord_id) return;
    setLoading(true);
    getDashboardStats(company.id, profile.landlord_id, timeframe)
      .then((data) => { setStats(data); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [company?.id, profile?.landlord_id, timeframe]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
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

  if (!stats) return null;

  return (
    <LandlordDashboardView
      stats={stats}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
      isFetching={loading}
    />
  );
}
