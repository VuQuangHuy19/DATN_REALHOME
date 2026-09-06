'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Building2, Home, CalendarDays, Users, DollarSign,
  MessageSquare, Bell, AlertCircle, Loader2,
  Activity, PlusCircle, Pencil, Trash2, ShieldAlert,
  Sparkles, CalendarRange, Clock, CheckCircle2, ChevronRight,
  TrendingUp, Award, Flame, Percent, MapPin, Compass, Calculator,
  Handshake, Wallet, SlidersHorizontal, ChevronDown, DoorOpen
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getDashboardStats, getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { useActivityLogs } from '@/hooks/useNotifications';
import { LandlordDashboardView } from '@/components/admin/LandlordDashboardView';
import { SalesDashboardView } from '@/components/admin/SalesDashboardView';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

import { useAdminModule } from '@/features/admin/context/admin-module-context';
import { SupplyOperationsHub } from '@/components/admin/hubs/SupplyOperationsHub';
import { SalesDealFlowHub } from '@/components/admin/hubs/SalesDealFlowHub';
import { FinancialCommissionHub } from '@/components/admin/hubs/FinancialCommissionHub';
import { OrganizationSystemHub } from '@/components/admin/hubs/OrganizationSystemHub';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function AdminDashboardPage() {
  const { company, role, profile } = useAuth();
  const { activeModule, setActiveModule } = useAdminModule();
  const [stats, setStats] = useState<any | null>(null);
  const [salesStats, setSalesStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { logs: activityLogs } = useActivityLogs(company?.id);

  const [activeTab, setActiveTab] = useState<'kpi' | 'growth' | 'area' | 'revenue'>('kpi');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [apptFilter, setApptFilter] = useState<'today' | 'week' | 'month'>('month');
  const [timeframe, setTimeframe] = useState<string>('current_month');
  const [isFetching, setIsFetching] = useState(false);

  const [presetTimeframe, setPresetTimeframe] = useState<'1_week' | 'today' | '30_days' | 'all' | 'custom'>('1_week');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const handlePresetChange = (preset: '1_week' | 'today' | '30_days' | 'all') => {
    setPresetTimeframe(preset);
    setIsFetching(true);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === '1_week') {
      const future = new Date(now);
      future.setDate(now.getDate() + 7);
      setStartDate(todayStr);
      setEndDate(future.toISOString().slice(0, 10));
      setTimeframe('current_month');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setTimeframe('current_month');
    } else if (preset === '30_days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setTimeframe('current_month');
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(todayStr);
      setTimeframe('all_time');
    }
  };

  // 1. Phân tích Tăng trưởng Khách hàng (Leads)
  const leadGrowthData = useMemo(() => {
    if (!stats?.leadsList) return [];

    const leads = stats.leadsList as any[];
    const now = new Date();
    const dataMap = new Map<string, number>();

    leads.forEach((l) => {
      const createdDate = new Date(l.created_at);
      if (isNaN(createdDate.getTime())) return;

      let key = '';
      if (timeRange === 'day') {
        if (createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()) {
          key = createdDate.getDate().toString().padStart(2, '0') + '/' + String(createdDate.getMonth() + 1).padStart(2, '0');
        }
      } else if (timeRange === 'week') {
        const startOfYear = new Date(createdDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (createdDate.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        if (createdDate.getFullYear() === now.getFullYear()) {
          key = `Tuần ${weekNum}`;
        }
      } else if (timeRange === 'month') {
        if (createdDate.getFullYear() === now.getFullYear()) {
          key = `T${createdDate.getMonth() + 1}`;
        }
      } else if (timeRange === 'quarter') {
        if (createdDate.getFullYear() === now.getFullYear()) {
          const q = Math.floor(createdDate.getMonth() / 3) + 1;
          key = `Quý ${q}`;
        }
      } else if (timeRange === 'year') {
        key = createdDate.getFullYear().toString();
      }

      if (key) {
        dataMap.set(key, (dataMap.get(key) || 0) + 1);
      }
    });

    let sortedKeys = Array.from(dataMap.keys());
    if (timeRange === 'day') {
      sortedKeys.sort((a, b) => {
        const [da, ma] = a.split('/').map(Number);
        const [db, mb] = b.split('/').map(Number);
        return ma !== mb ? ma - mb : da - db;
      });
    } else if (timeRange === 'week') {
      sortedKeys.sort((a, b) => Number(a.replace('Tuần ', '')) - Number(b.replace('Tuần ', '')));
    } else if (timeRange === 'month') {
      sortedKeys.sort((a, b) => Number(a.replace('T', '')) - Number(b.replace('T', '')));
    } else if (timeRange === 'quarter') {
      sortedKeys.sort((a, b) => Number(a.replace('Quý ', '')) - Number(b.replace('Quý ', '')));
    } else if (timeRange === 'year') {
      sortedKeys.sort((a, b) => Number(a) - Number(b));
    }

    return sortedKeys.map(key => ({
      name: key,
      count: dataMap.get(key) || 0
    }));
  }, [stats?.leadsList, timeRange]);

  // 2. Phân bổ Khách hàng theo Khu vực
  const areaData = useMemo(() => {
    if (!stats?.leadsList) return [];
    const leads = stats.leadsList as any[];
    const areaMap = new Map<string, number>();

    leads.forEach((l) => {
      const area = l.interested_area || l.preferred_area || 'Chưa xác định';
      areaMap.set(area, (areaMap.get(area) || 0) + 1);
    });

    return Array.from(areaMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [stats?.leadsList]);

  // 3. Hiệu suất KPI của Sale
  const salesPerformanceData = useMemo(() => {
    if (!stats?.topEmployees) return [];
    return stats.topEmployees.map((emp: any) => ({
      name: emp.employee_name || 'Nhân viên',
      deals: emp.successful_deals || 0,
      revenue: (emp.revenue_generated || 0) / 1000000,
      score: emp.score || 0
    }));
  }, [stats?.topEmployees]);

  const isSale = role === 'sales_agent';

  useEffect(() => {
    setMounted(true);
    if (!company?.id) return;
    setLoading(true);

    if (isSale && profile?.id) {
      const fetchSalesStats = () => {
        getSalesDashboardStats(company.id, profile.id)
          .then((data) => { setSalesStats(data); setError(null); })
          .catch((e) => setError(e.message))
          .finally(() => setLoading(false));
      };
      fetchSalesStats();

      const channel = supabase.channel('sales_realtime_dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${company.id}` },
          (payload: any) => {
            if (payload.eventType === 'INSERT' && payload.new.assigned_to === profile.id) {
              toast.info('🚀 Có lead mới được giao cho bạn!', {
                description: `Tên khách: ${payload.new.full_name || 'Khách mới'}`
              });
              fetchSalesStats();
            } else if (payload.eventType === 'UPDATE' && payload.new.assigned_to === profile.id) {
              fetchSalesStats();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'appointments', filter: `company_id=eq.${company.id}` },
          (payload: any) => {
            if (payload.eventType === 'INSERT' && payload.new.assigned_to === profile.id) {
              toast.info('📅 Có lịch hẹn mới được giao cho bạn!', {
                description: `Tên khách: ${payload.new.customer_name || 'Khách xem phòng'}`
              });
              fetchSalesStats();
            } else if (payload.eventType === 'UPDATE' && payload.new.assigned_to === profile.id) {
              fetchSalesStats();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const landlordId = role === 'landlord' ? (profile?.landlord_id ?? undefined) : undefined;
    getDashboardStats(company.id, landlordId, timeframe)
      .then((data) => { setStats(data); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setIsFetching(false); });
  }, [company?.id, role, profile?.id, profile?.landlord_id, isSale, timeframe]);

  // Data cho Biểu đồ 1 (Cột chồng): Phân bổ Trạng thái phòng theo Khu vực
  const areaStackedBarData = useMemo(() => {
    if (!stats?.buildingsList || !stats?.roomsList) return [];

    const buildings = stats.buildingsList as any[];
    const rooms = stats.roomsList as any[];

    const areaMap = new Map<string, { area: string; available: number; soonAvailable: number; rented: number; total: number }>();

    buildings.forEach((b) => {
      const area = b.area || 'Khác';
      if (!areaMap.has(area)) {
        areaMap.set(area, { area, available: 0, soonAvailable: 0, rented: 0, total: 0 });
      }

      const bRooms = rooms.filter((r) => r.building_id === b.code || r.building_id === b.id);
      const item = areaMap.get(area)!;

      bRooms.forEach((r) => {
        item.total += 1;
        const isSoon = Boolean(r.available_date || (r.description && typeof r.description === 'string' && r.description.includes('[Sắp trống:')));

        if (r.status === 'available') {
          item.available += 1;
        } else if (isSoon) {
          item.soonAvailable += 1;
        } else {
          item.rented += 1;
        }
      });
    });

    return Array.from(areaMap.values()).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [stats?.buildingsList, stats?.roomsList]);

  // Data cho Biểu đồ 2 (Mạng nhện / Radar Chart): Chỉ số Sức hút 360° các Khu vực
  const areaRadarData = useMemo(() => {
    if (!stats?.buildingsList || !stats?.roomsList) return { radarData: [], topAreas: [] };

    const buildings = stats.buildingsList as any[];
    const rooms = stats.roomsList as any[];
    const leads = (stats.leadsList as any[]) || [];

    const areaMetricsMap = new Map<string, {
      area: string;
      leadsCount: number;
      totalRooms: number;
      rentedRooms: number;
      availableRooms: number;
    }>();

    buildings.forEach((b) => {
      const area = b.area || 'Khác';
      if (!areaMetricsMap.has(area)) {
        areaMetricsMap.set(area, { area, leadsCount: 0, totalRooms: 0, rentedRooms: 0, availableRooms: 0 });
      }
      const m = areaMetricsMap.get(area)!;
      const bRooms = rooms.filter((r) => r.building_id === b.code || r.building_id === b.id);

      bRooms.forEach((r) => {
        m.totalRooms += 1;
        if (r.status === 'rented') m.rentedRooms += 1;
        if (r.status === 'available') m.availableRooms += 1;
      });
    });

    leads.forEach((l) => {
      const area = l.interested_area || l.preferred_area || 'Khác';
      if (areaMetricsMap.has(area)) {
        areaMetricsMap.get(area)!.leadsCount += 1;
      }
    });

    const topAreas = Array.from(areaMetricsMap.values())
      .filter((a) => a.totalRooms > 0)
      .sort((a, b) => b.totalRooms - a.totalRooms)
      .slice(0, 3);

    if (topAreas.length === 0) return { radarData: [], topAreas: [] };

    const maxLeads = Math.max(...topAreas.map((a) => a.leadsCount), 1);
    const maxRooms = Math.max(...topAreas.map((a) => a.totalRooms), 1);

    const dimensions = [
      { key: 'Nhu cầu Lead', getVal: (a: any) => Math.round((a.leadsCount / maxLeads) * 100) },
      { key: 'Tỷ lệ Lấp đầy', getVal: (a: any) => (a.totalRooms > 0 ? Math.round((a.rentedRooms / a.totalRooms) * 100) : 0) },
      { key: 'Phòng Trống Ready', getVal: (a: any) => (a.totalRooms > 0 ? Math.round((a.availableRooms / a.totalRooms) * 100) : 0) },
      { key: 'Quy mô Nguồn hàng', getVal: (a: any) => Math.round((a.totalRooms / maxRooms) * 100) },
      { key: 'Chỉ số Sức hút', getVal: (a: any) => Math.min(100, Math.round(((a.leadsCount * 2 + a.rentedRooms) / (maxLeads + maxRooms)) * 100)) },
    ];

    const radarData = dimensions.map((dim) => {
      const row: any = { subject: dim.key };
      topAreas.forEach((areaObj) => {
        row[areaObj.area] = dim.getVal(areaObj);
      });
      return row;
    });

    return { radarData, topAreas };
  }, [stats?.buildingsList, stats?.roomsList, stats?.leadsList]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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

  if (isSale && salesStats) {
    return <SalesDashboardView stats={salesStats} saleName={profile?.full_name ?? undefined} />;
  }

  if (role === 'landlord' && stats) {
    return <LandlordDashboardView stats={stats as any} />;
  }

  // Render specialized hubs for Admin according to activeModule selection
  if (activeModule === 'supply') {
    return <SupplyOperationsHub />;
  }
  if (activeModule === 'sales') {
    return <SalesDealFlowHub />;
  }
  if (activeModule === 'finance') {
    return <FinancialCommissionHub />;
  }
  if (activeModule === 'governance') {
    return <OrganizationSystemHub />;
  }

  const apptDisplayCount = apptFilter === 'today'
    ? stats?.appointmentsTimeframe?.today ?? 0
    : apptFilter === 'week'
      ? stats?.appointmentsTimeframe?.week ?? 0
      : stats?.appointmentsTimeframe?.month ?? 0;

  // Compute human-readable label for active timeframe
  const now = new Date();
  const timeframeLabels: Record<string, string> = {
    current_month: `Tháng ${now.getMonth() + 1}/${now.getFullYear()} (Hiện tại)`,
    last_month: (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return `Tháng ${d.getMonth() + 1}/${d.getFullYear()} (Kỳ trước)`; })(),
    this_quarter: `Quý ${Math.floor(now.getMonth() / 3) + 1}/${now.getFullYear()}`,
    this_year: `Cả năm ${now.getFullYear()}`,
    all_time: 'Toàn bộ thời gian',
  };
  const activeTimeframeLabel = timeframeLabels[timeframe] || (timeframe.includes('-') ? `Tháng ${timeframe.split('-')[1]}/${timeframe.split('-')[0]}` : timeframe);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-ink tracking-tight">
              Quản trị &amp; Kinh doanh
            </h1>
          </div>
          <p className="text-ink-muted mt-1 text-xs sm:text-sm">
            Doanh thu hoa hồng, hiệu suất chốt phòng và phân bổ nhân sự
          </p>
        </div>

        {/* ─── Timeframe Filter Matching Image 2 ─── */}
        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
          {/* Preset Buttons Row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handlePresetChange('1_week')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${presetTimeframe === '1_week'
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              1 Tuần
            </button>
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${presetTimeframe === 'today'
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handlePresetChange('30_days')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${presetTimeframe === '30_days'
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              30 ngày
            </button>
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${presetTimeframe === 'all'
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              Tất cả
            </button>
          </div>

          {/* Date Range Input Row */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPresetTimeframe('custom');
                setIsFetching(true);
              }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-500 text-xs font-semibold px-1">đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPresetTimeframe('custom');
                setIsFetching(true);
              }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ─── Urgent Actions — Lên đầu, nổi bật nhất ─── */}
      {stats && (
        <div className={`rounded-2xl border-2 p-4 sm:p-5 ${(stats.pendingAppointmentsToday > 0 || stats.unassignedConsultations > 0 || stats.overdueInvoices > 0)
            ? 'border-rose-200 bg-gradient-to-r from-rose-50/80 via-amber-50/40 to-sky-50/40'
            : 'border-border bg-white'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${(stats.pendingAppointmentsToday > 0 || stats.unassignedConsultations > 0 || stats.overdueInvoices > 0)
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
                }`}>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm text-ink">Việc cần xử lý ngay hôm nay</span>
              {(stats.pendingAppointmentsToday + stats.unassignedConsultations + stats.overdueInvoices) > 0 && (
                <span className="animate-pulse inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {stats.pendingAppointmentsToday + stats.unassignedConsultations + stats.overdueInvoices} việc
                </span>
              )}
            </div>
            {(stats.pendingAppointmentsToday + stats.unassignedConsultations + stats.overdueInvoices) === 0 && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Tất cả đã xong!
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/admin/customers/appointments" className="flex items-center gap-3 p-3.5 bg-white/80 hover:bg-amber-50 rounded-xl border border-amber-200/60 hover:border-amber-300 transition-all cursor-pointer group shadow-sm">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-ink group-hover:text-amber-800 transition-colors truncate">Lịch hẹn chờ duyệt</p>
                <p className="text-[10px] text-ink-muted mt-0.5">Hôm nay</p>
              </div>
              <span className={`text-lg font-extrabold font-mono tabular-nums px-2 py-0.5 rounded-lg ${stats.pendingAppointmentsToday > 0 ? 'text-amber-700 bg-amber-100' : 'text-ink-muted bg-bg-subtle'
                }`}>
                {stats.pendingAppointmentsToday}
              </span>
            </Link>

            <Link href="/admin/customers/consultations" className="flex items-center gap-3 p-3.5 bg-white/80 hover:bg-sky-50 rounded-xl border border-sky-200/60 hover:border-sky-300 transition-all cursor-pointer group shadow-sm">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-ink group-hover:text-sky-800 transition-colors truncate">Tư vấn chưa phân công</p>
                <p className="text-[10px] text-ink-muted mt-0.5">Từ trang public</p>
              </div>
              <span className={`text-lg font-extrabold font-mono tabular-nums px-2 py-0.5 rounded-lg ${stats.unassignedConsultations > 0 ? 'text-sky-700 bg-sky-100' : 'text-ink-muted bg-bg-subtle'
                }`}>
                {stats.unassignedConsultations}
              </span>
            </Link>

            <Link href="/admin/services/invoices" className="flex items-center gap-3 p-3.5 bg-white/80 hover:bg-rose-50 rounded-xl border border-rose-200/60 hover:border-rose-300 transition-all cursor-pointer group shadow-sm">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-ink group-hover:text-rose-800 transition-colors truncate">Hóa đơn quá hạn</p>
                <p className="text-[10px] text-ink-muted mt-0.5">Cần nhắc nợ hoặc xử lý</p>
              </div>
              <span className={`text-lg font-extrabold font-mono tabular-nums px-2 py-0.5 rounded-lg ${stats.overdueInvoices > 0 ? 'text-rose-700 bg-rose-100' : 'text-ink-muted bg-bg-subtle'
                }`}>
                {stats.overdueInvoices}
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Metrics: Số phòng chốt, Doanh thu hoa hồng, Cuộc hẹn */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Số phòng chốt được */}
          <Card className="border-border shadow-sm rounded-2xl bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <Award className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Chốt phòng</span>
              </div>
              <p className="text-3xl font-extrabold font-heading text-emerald-600 tracking-tight">
                {stats.closedRoomsCount ?? 0}
              </p>
              <p className="text-xs font-medium text-ink-muted mt-1">phòng đã chốt</p>
              <p className="text-[10px] text-emerald-600/70 mt-0.5 truncate">{activeTimeframeLabel}</p>
            </CardContent>
          </Card>

          {/* Doanh thu hoa hồng */}
          <Card className="border-border shadow-sm rounded-2xl bg-gradient-to-br from-accent-soft/50 to-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-accent-soft text-accent">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full">Doanh thu</span>
              </div>
              <p className="text-base sm:text-lg font-bold font-mono text-accent tracking-tight truncate tabular-nums">
                {formatCurrency(stats.companyRevenue !== undefined ? stats.companyRevenue : stats.monthlyRevenue)}
              </p>
              <p className="text-xs font-medium text-ink-muted mt-1">hoa hồng công ty</p>
              <p className="text-[10px] text-accent/70 mt-0.5 truncate">{activeTimeframeLabel}</p>
            </CardContent>
          </Card>

          {/* Cuộc hẹn xem phòng */}
          <Card className="border-border shadow-sm rounded-2xl bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                {/* Mini filter inline */}
                <div className="flex bg-indigo-50 p-0.5 rounded-lg border border-indigo-100">
                  {(['today', 'week', 'month'] as const).map((f, i) => (
                    <button key={f} onClick={() => setApptFilter(f)}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition-all ${apptFilter === f ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:text-indigo-700'
                        }`}
                    >
                      {['Ngày', 'Tuần', 'Tháng'][i]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-3xl font-extrabold font-heading text-indigo-600 tracking-tight">{apptDisplayCount}</p>
              <p className="text-xs font-medium text-ink-muted mt-1">cuộc hẹn xem phòng</p>
            </CardContent>
          </Card>

          {/* Tỷ lệ chuyển đổi */}
          <Card className="border-border shadow-sm rounded-2xl bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <Percent className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Chuyển đổi</span>
              </div>
              <p className="text-3xl font-extrabold font-heading text-blue-600 tracking-tight">
                {stats.conversionRates?.apptToClosedRate ?? 0}%
              </p>
              <p className="text-xs font-medium text-ink-muted mt-1">chốt / lịch hẹn</p>
              <p className="text-[10px] text-blue-600/70 mt-0.5">Lead→chốt: {stats.conversionRates?.leadToClosedRate ?? 0}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* secondary KPI Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link href="/admin/realhome/buildings">
            <Card className="hover:shadow-sm hover:bg-bg-subtle/50 transition-all border-border shadow-none rounded-xl cursor-pointer h-full">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-ink-muted uppercase">🏢 Tòa nhà</p>
                  <p className="text-xl sm:text-2xl font-bold font-heading text-ink mt-0.5">{stats.totalBuildings}</p>
                </div>
                <Building2 className="h-5 w-5 text-indigo-500 hidden sm:block" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/realhome/rooms">
            <Card className="hover:shadow-sm hover:bg-bg-subtle/50 transition-all border-border shadow-none rounded-xl cursor-pointer h-full">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-ink-muted uppercase">🏠 Tổng phòng</p>
                  <p className="text-xl sm:text-2xl font-bold font-heading text-ink mt-0.5">
                    {stats.totalRooms} <span className="text-xs sm:text-sm font-semibold text-emerald-600">({stats.occupancyRate}% lấp đầy)</span>
                  </p>
                </div>
                <Home className="h-5 w-5 text-emerald-500 hidden sm:block" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/realhome/rooms">
            <Card className="hover:shadow-sm hover:bg-bg-subtle/50 transition-all border-border shadow-none rounded-xl cursor-pointer h-full">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs font-bold text-ink-muted uppercase">🔑 Phòng trống &amp; Sắp trống</p>
                  <p className="text-xl sm:text-2xl font-bold font-heading text-amber-600 mt-0.5">
                    {(stats.vacantRooms ?? 0) + (stats.soonAvailableRooms ?? 0)} <span className="text-xs font-medium text-ink-muted">phòng</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-semibold">
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Trống: <strong>{stats.vacantRooms ?? 0}</strong> ({stats.vacantRate ?? 0}%)
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Sắp trống: <strong>{stats.soonAvailableRooms ?? 0}</strong> ({stats.soonAvailableRate ?? 0}%)
                    </span>
                  </div>
                </div>
                <DoorOpen className="h-5 w-5 text-amber-500 hidden sm:block shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/contracts">
            <Card className="hover:shadow-sm hover:bg-bg-subtle/50 transition-all border-border shadow-none rounded-xl cursor-pointer h-full">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-ink-muted uppercase">📋 HĐ hết hạn</p>
                  <p className="text-xl sm:text-2xl font-bold font-heading text-rose-600 mt-0.5">{stats.expiringContractsCount}</p>
                </div>
                <CalendarRange className="h-5 w-5 text-rose-500 hidden sm:block" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Sức hút Khu vực Hot & Phân tích Trực quan (Stacked Bar + Radar Chart ẩn mobile) */}
      {stats && (
        <Card className="border-border shadow-none rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold font-heading text-ink flex items-center gap-2">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                Sức hút Khu vực &amp; Tòa nhà Hot
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                Phân bổ trạng thái phòng &amp; chỉ số sức hút 360° để điều phối Sale hiệu quả
              </p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold shrink-0">
              📊 Realtime
            </Badge>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Biểu đồ Stacked Bar — hiện cả mobile */}
              <div className="lg:col-span-7 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Trạng thái phòng theo Khu vực
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Trống</span>
                    <span className="flex items-center gap-1 text-amber-700"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Sắp trống</span>
                    <span className="flex items-center gap-1 text-rose-700"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /> Đã thuê</span>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full pt-2">
                  {areaStackedBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={areaStackedBarData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="area" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'white', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(val: any, name: any) => {
                            if (name === 'available') return [`${val} phòng`, '🟢 Còn trống'];
                            if (name === 'soonAvailable') return [`${val} phòng`, '🟡 Sắp trống'];
                            if (name === 'rented') return [`${val} phòng`, '🔴 Đã cho thuê'];
                            return [val, name];
                          }}
                        />
                        <Bar dataKey="available" name="available" stackId="status" fill="#10b981" radius={[0, 0, 0, 0]} barSize={28} />
                        <Bar dataKey="soonAvailable" name="soonAvailable" stackId="status" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={28} />
                        <Bar dataKey="rented" name="rented" stackId="status" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                      Chưa có dữ liệu phân bổ phòng theo khu vực
                    </div>
                  )}
                </div>
              </div>

              {/* Radar Chart — CHỈ hiện trên desktop (lg+), ẩn trên mobile */}
              <div className="hidden lg:flex lg:col-span-5 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-3 flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Sức hút 360° Các Khu vực
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold">Scale 0–100</span>
                </div>

                <div className="h-72 w-full">
                  {areaRadarData.radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={areaRadarData.radarData}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" stroke="#334155" fontSize={10} tickLine={false} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={9} />
                        {areaRadarData.topAreas.map((aObj, idx) => {
                          const colors = [
                            { stroke: '#8b5cf6', fill: '#8b5cf6' },
                            { stroke: '#06b6d4', fill: '#06b6d4' },
                            { stroke: '#f59e0b', fill: '#f59e0b' },
                          ];
                          const col = colors[idx % colors.length];
                          return (
                            <Radar
                              key={aObj.area}
                              name={aObj.area}
                              dataKey={aObj.area}
                              stroke={col.stroke}
                              fill={col.fill}
                              fillOpacity={0.25}
                              strokeWidth={2}
                            />
                          );
                        })}
                        <Tooltip contentStyle={{ backgroundColor: 'white', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '11px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                      Chưa có đủ dữ liệu sức hút 360°
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Charts / Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cụm biểu đồ phân tích trung tâm */}
          <Card className="lg:col-span-8 border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'kpi', label: 'Hiệu suất Sale' },
                  { id: 'growth', label: 'Tăng trưởng khách' },
                  { id: 'area', label: 'Khu vực khách' },
                  { id: 'revenue', label: 'Dòng tiền công ty' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-ink-muted hover:text-ink hover:bg-bg-subtle'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'growth' && (
                <div className="flex items-center gap-1.5 bg-bg-subtle p-0.5 rounded-lg border border-border">
                  {[
                    { id: 'day', label: 'Ngày' },
                    { id: 'week', label: 'Tuần' },
                    { id: 'month', label: 'Tháng' },
                    { id: 'quarter', label: 'Quý' },
                    { id: 'year', label: 'Năm' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setTimeRange(r.id as any)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all uppercase ${timeRange === r.id
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-ink-muted hover:text-ink'
                        }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {mounted && (
                <div className="h-72 w-full">
                  {activeTab === 'kpi' && (
                    salesPerformanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesPerformanceData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }}
                            formatter={(value: any, name: any) => {
                              if (name === 'revenue') return [`${value.toFixed(2)}M VNĐ`, 'Doanh số (Hoa hồng)'];
                              if (name === 'deals') return [value, 'Số phòng chốt'];
                              if (name === 'score') return [`${value}đ`, 'Điểm KPI'];
                              return [value, name];
                            }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="deals" name="Số phòng chốt" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="revenue" name="Doanh số Hoa hồng (Triệu VNĐ)" fill="hsl(142,52%,42%)" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="score" name="Điểm KPI" fill="hsl(38,90%,55%)" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-ink-muted text-sm">
                        Chưa có dữ liệu hiệu suất của sale tháng này.
                      </div>
                    )
                  )}

                  {activeTab === 'growth' && (
                    leadGrowthData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={leadGrowthData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }}
                            formatter={(value: any) => [`${value} khách`, 'Lượng khách mới']}
                          />
                          <Line type="monotone" dataKey="count" name="Lượng khách mới" stroke="hsl(var(--accent))" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-ink-muted text-sm">
                        Không có dữ liệu khách hàng trong khoảng thời gian đã chọn.
                      </div>
                    )
                  )}

                  {activeTab === 'area' && (
                    areaData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={areaData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis dataKey="name" type="category" stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }}
                            formatter={(value: any) => [`${value} khách quan tâm`, 'Số lượng']}
                          />
                          <Bar dataKey="count" name="Số lượng khách quan tâm" fill="hsl(262,80%,60%)" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-ink-muted text-sm">
                        Chưa có dữ liệu khu vực quan tâm của khách hàng.
                      </div>
                    )
                  )}

                  {activeTab === 'revenue' && (
                    stats.revenueHistory?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.revenueHistory} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis
                            stroke="hsl(var(--ink-muted))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="p-2.5 bg-white border border-border rounded-lg shadow-sm space-y-1">
                                    <p className="text-xs font-bold text-ink">{data.period}</p>
                                    <p className="text-xs text-emerald-600 font-semibold">Doanh thu hoa hồng: {formatCurrency(data.amount)}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-ink-muted text-sm">
                        Chưa có dữ liệu doanh thu của công ty.
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vinh danh Sale xuất sắc */}
          <Card className="lg:col-span-4 border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-accent" />
                Vinh danh Sale xuất sắc
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {stats.topEmployees && stats.topEmployees.length > 0 ? (
                <div className="space-y-4">
                  {stats.topEmployees.map((emp: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-bg-subtle text-ink-muted'
                          }`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-ink truncate">{emp.employee_name}</p>
                          <p className="text-[10px] text-ink-muted flex items-center gap-1">
                            <span>Chốt: {emp.successful_deals} phòng</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold font-mono text-accent bg-accent-soft px-2 py-0.5 rounded-full tabular-nums">
                          {emp.score}đ
                        </span>
                        <p className="text-[9px] text-ink-muted font-semibold mt-0.5 tabular-nums">
                          {formatCurrency(emp.revenue_generated)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-ink-muted text-xs">
                  Chưa có xếp hạng KPI nhân viên tháng này.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
