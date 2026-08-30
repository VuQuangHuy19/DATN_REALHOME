'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  TrendingUp, TrendingDown, Minus, Search, Loader2, AlertCircle, Settings, 
  Sparkles, Check, Percent, Edit3, Layers, Plus, Trash2, Calendar, Filter, 
  RotateCcw, BarChart3, PieChart as PieChartIcon, UserCheck, Target, Award 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { getKPIs, createKPI, updateKPI, computeAutoKPI } from '@/features/staff/services/kpis';
import { getProfiles } from '@/features/staff/services/profiles';
import { useEmployees } from '@/features/staff/hooks/useStaff';
import { useAuth } from '@/lib/auth/AuthContext';
import { getKPIConfiguration, saveKPIConfiguration } from '@/features/staff/services/kpi_configurations';
import type { DBEmployeeKPI, DBKPIConfiguration } from '@/lib/supabase/types';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  exceeded: { label: 'Vượt chỉ tiêu', color: 'bg-green-100 text-green-700', icon: TrendingUp },
  on_track: { label: 'Đúng tiến độ',  color: 'bg-blue-100 text-blue-700',  icon: Minus },
  behind:   { label: 'Chậm tiến độ',  color: 'bg-red-100 text-red-700',    icon: TrendingDown },
};

const formatNumberWithDots = (num: number | string): string => {
  if (!num && num !== 0) return '';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
};

const parseNumberWithDots = (str: string): number => {
  const clean = str.replace(/\./g, '').replace(/,/g, '');
  return clean ? Number(clean) : 0;
};

function formatVND(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + ' triệu';
  return n.toLocaleString('vi-VN') + 'đ';
}

export function KpiPage() {
  const { company } = useAuth();
  const { items: employees } = useEmployees(company?.id);
  const [kpiList, setKpiList] = useState<DBEmployeeKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterQuarter, setFilterQuarter] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [viewItem, setViewItem] = useState<DBEmployeeKPI | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DBEmployeeKPI | null>(null);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPeriod, setPreviewPeriod] = useState('');
  const [autoKpiPreview, setAutoKpiPreview] = useState<any[]>([]);
  const [savingAuto, setSavingAuto] = useState(false);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [kpiConfig, setKpiConfig] = useState<DBKPIConfiguration | null>(null);
  const [selectedCommMode, setSelectedCommMode] = useState<'fixed' | 'tier' | 'custom'>('fixed');
  const [commissionTiers, setCommissionTiers] = useState<any[]>([
    { minRevenue: 0, maxRevenue: 12500000, rate: 0.30, label: 'Dưới 12.5 triệu' },
    { minRevenue: 12500000, maxRevenue: 25000000, rate: 0.34, label: 'Từ 12.5tr - 25 triệu' },
    { minRevenue: 25000000, maxRevenue: 999999999, rate: 0.40, label: 'Trên 25 triệu' },
  ]);
  const [targetRevenueFormatted, setTargetRevenueFormatted] = useState<string>('50.000.000');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (company?.id) {
      getKPIConfiguration(company.id)
        .then((cfg) => {
          setKpiConfig(cfg);
          setTargetRevenueFormatted(formatNumberWithDots(cfg.default_target_revenue ?? 50000000));
          if ((cfg as any).sale_commission_mode) {
            setSelectedCommMode((cfg as any).sale_commission_mode);
          }
          if ((cfg as any).sale_commission_tiers) {
            setCommissionTiers((cfg as any).sale_commission_tiers);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi lấy cấu hình KPI, sử dụng cấu hình mặc định:', err);
          setKpiConfig({
            id: '',
            company_id: company.id,
            revenue_weight: 0.50,
            appointment_weight: 0.30,
            lead_weight: 0.20,
            default_target_revenue: 50000000,
            default_target_appointments: 10,
            default_target_leads: 20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: null,
            updated_by: null,
          });
        });
    }
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      getProfiles(company.id).then(setProfiles).catch(console.error);
    }
  }, [company?.id]);

  useEffect(() => {
    // Tự động xác định preview period từ bộ lọc
    if (filterYear && filterMonth) {
      setPreviewPeriod(`${filterYear}-${filterMonth.padStart(2, '0')}`);
    } else {
      setPreviewPeriod(new Date().toISOString().substring(0, 7));
    }
  }, [filterYear, filterMonth]);

  const loadKPIs = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const data = await getKPIs(company.id);
      setKpiList(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  const filtered = kpiList.filter((k) => {
    const [year, month] = k.period.split('-');
    if (filterEmployeeId && k.employee_id !== filterEmployeeId) return false;

    if (filterFromDate || filterToDate) {
      const kpiDateStr = `${k.period}-01`;
      if (filterFromDate && kpiDateStr < filterFromDate.substring(0, 7) + '-01') return false;
      if (filterToDate && kpiDateStr > filterToDate.substring(0, 7) + '-31') return false;
    } else {
      if (filterYear && year !== filterYear) return false;
      if (filterMonth && month !== filterMonth) return false;
      if (filterQuarter) {
        const m = parseInt(month, 10);
        const q = Math.ceil(m / 3).toString();
        if (q !== filterQuarter) return false;
      }
    }
    return true;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const emp = employees.find((emp) => emp.id === fd.get('employeeId'));
    const revenue = Number(fd.get('revenue_generated') || 0);
    const target = Number(fd.get('target_revenue') || 0);
    const score = Number(fd.get('score') || 0);
    let status: DBEmployeeKPI['status'] = 'on_track';
    if (score >= 90 || revenue > target) status = 'exceeded';
    else if (score < 70 || revenue < target * 0.8) status = 'behind';

    const payload = {
      company_id: company?.id ?? '',
      employee_id: fd.get('employeeId') as string || null,
      employee_name: (emp?.full_name || (emp as any)?.name || ''),
      period: fd.get('period') as string,
      total_leads: Number(fd.get('total_leads') || 0),
      total_appointments: Number(fd.get('total_appointments') || 0),
      successful_deals: Number(fd.get('successful_deals') || 0),
      conversion_rate: 0,
      revenue_generated: revenue,
      target_revenue: target,
      score,
      status,
      auto_calculated: false,
      commission_earned: editItem?.commission_earned ?? 0,
    };

    try {
      if (editItem) {
        const updated = await updateKPI(editItem.id, payload);
        setKpiList((prev) => prev.map((k) => k.id === editItem.id ? updated : k));
      } else {
        const created = await createKPI(payload);
        setKpiList((prev) => [created, ...prev]);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
    setIsFormOpen(false);
    setEditItem(null);
  };

  const avgScore = filtered.length ? Math.round(filtered.reduce((s, k) => s + k.score, 0) / filtered.length) : 0;
  const totalRevenue = filtered.reduce((s, k) => s + k.revenue_generated, 0);
  const totalTarget = filtered.reduce((s, k) => s + k.target_revenue, 0);

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    setSavingConfig(true);
    const fd = new FormData(e.currentTarget);
    
    const revWeightPercent = Number(fd.get('revenue_weight') || 0);
    const appWeightPercent = Number(fd.get('appointment_weight') || 0);
    const leadWeightPercent = Number(fd.get('lead_weight') || 0);
    
    if (revWeightPercent + appWeightPercent + leadWeightPercent !== 100) {
      toast.error('Lỗi: Tổng các trọng số phải bằng 100%!');
      setSavingConfig(false);
      return;
    }

    const saleCommMode = selectedCommMode;
    const fixedRatePercent = Number(fd.get('sale_commission_fixed_rate') || 60);

    const payload: any = {
      revenue_weight: revWeightPercent / 100,
      appointment_weight: appWeightPercent / 100,
      lead_weight: leadWeightPercent / 100,
      default_target_revenue: parseNumberWithDots(targetRevenueFormatted || '0'),
      default_target_appointments: Number(fd.get('default_target_appointments') || 0),
      default_target_leads: Number(fd.get('default_target_leads') || 0),
      sale_commission_mode: saleCommMode,
      sale_commission_fixed_rate: fixedRatePercent / 100,
      sale_commission_tiers: commissionTiers,
    };

    try {
      const updated = await saveKPIConfiguration(company.id, payload);
      setKpiConfig(updated);
      toast.success('Lưu cấu hình KPI thành công!');
      setIsConfigOpen(false);
    } catch (err: any) {
      toast.error(`Lỗi khi lưu: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunAutoKPI = async () => {
    if (!company?.id) return;
    if (!previewPeriod) {
      toast.error('Vui lòng chọn hoặc nhập kỳ (YYYY-MM)');
      return;
    }
    setLoadingPreview(true);
    try {
      const list = [];
      const activeEmployees = employees.filter((e) => e.status === 'active');
      
      for (const emp of activeEmployees) {
        const profile = profiles.find((p) => p.email && p.email.toLowerCase() === emp.email?.toLowerCase());
        
        let revenue = 0;
        let deals = 0;
        let comm = 0;
        let convertedLeadsCount = 0;
        
        let score = 75;
        let target = kpiConfig?.default_target_revenue ?? 50000000;
        let apptsCount = kpiConfig?.default_target_appointments ?? 10;
        let leadsCount = kpiConfig?.default_target_leads ?? 20;

        if (profile) {
          const autoStats = await computeAutoKPI(company.id, profile.id, previewPeriod);
          revenue = autoStats.revenue_generated;
          deals = autoStats.successful_deals;
          comm = autoStats.commission_earned;
          convertedLeadsCount = autoStats.converted_leads_count || 0;
          if (autoStats.score !== undefined) {
            score = autoStats.score;
          }
          if (autoStats.target_revenue !== undefined) {
            target = autoStats.target_revenue;
          }
          if (autoStats.total_appointments !== undefined) {
            apptsCount = autoStats.total_appointments;
          }
        }
        
        const existing = kpiList.find((k) => k.employee_id === emp.id && k.period === previewPeriod);
        if (existing) {
          target = existing.target_revenue;
          leadsCount = existing.total_leads;
        }
        
        let status: DBEmployeeKPI['status'] = 'on_track';
        if (score >= 90 || revenue > target) status = 'exceeded';
        else if (score < 70 || revenue < target * 0.8) status = 'behind';

        list.push({
          id: existing?.id,
          company_id: company.id,
          employee_id: emp.id,
          employee_name: emp.full_name || (emp as any).name || '',
          period: previewPeriod,
          total_leads: leadsCount,
          total_appointments: apptsCount,
          successful_deals: deals,
          conversion_rate: 0,
          revenue_generated: revenue,
          target_revenue: target,
          score,
          status,
          auto_calculated: true,
          commission_earned: comm,
          converted_leads_count: convertedLeadsCount,
          existingRecord: existing,
        });
      }
      
      setAutoKpiPreview(list);
      setIsPreviewOpen(true);
      toast.success('Đã tính toán xong KPI tự động, vui lòng xem bảng preview!');
    } catch (e: any) {
      toast.error(`Lỗi tính toán: ${e.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveAutoKPIs = async () => {
    setSavingAuto(true);
    try {
      for (const item of autoKpiPreview) {
        const { existingRecord, ...payload } = item;
        if (item.id) {
          await updateKPI(item.id, payload);
        } else {
          await createKPI(payload);
        }
      }
      toast.success('Đã lưu dữ liệu KPI tự động thành công!');
      setIsPreviewOpen(false);
      loadKPIs();
    } catch (e: any) {
      toast.error(`Lỗi khi lưu KPI: ${e.message}`);
    } finally {
      setSavingAuto(false);
    }
  };

  const chartData = useMemo(() => {
    return filtered.map((item) => ({
      name: item.employee_name || 'Sales',
      'Doanh thu thực': Math.round(item.revenue_generated / 1_000_000),
      'Mục tiêu': Math.round(item.target_revenue / 1_000_000),
      score: item.score,
    }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const exceeded = filtered.filter((f) => f.status === 'exceeded').length;
    const onTrack = filtered.filter((f) => f.status === 'on_track').length;
    const behind = filtered.filter((f) => f.status === 'behind').length;

    return [
      { name: 'Vượt chỉ tiêu', value: exceeded, color: '#22c55e' },
      { name: 'Đúng tiến độ', value: onTrack, color: '#3b82f6' },
      { name: 'Chậm tiến độ', value: behind, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [filtered]);

  const totalDeals = filtered.reduce((s, k) => s + k.successful_deals, 0);
  const totalLeads = filtered.reduce((s, k) => s + k.total_leads, 0);
  const totalAppointments = filtered.reduce((s, k) => s + k.total_appointments, 0);
  const achievementRate = totalTarget ? Math.round((totalRevenue / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-white">Bảng Đánh Giá & Quản Lý KPI Nhân Viên</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Kinh Doanh & HR
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Theo dõi, phân tích và tối ưu hiệu suất làm việc toàn đội ngũ RealHome</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            className="border-indigo-400/40 text-indigo-200 hover:bg-indigo-900/60 bg-indigo-950/40 rounded-xl gap-2 shadow-xs transition-all font-semibold"
            onClick={handleRunAutoKPI}
            disabled={loadingPreview}
          >
            {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin text-indigo-300" /> : <Sparkles className="h-4 w-4 text-indigo-400" />}
            Tính tự động từ hệ thống
          </Button>
          
          <Button onClick={() => { setEditItem(null); setIsFormOpen(true); }} className="rounded-xl bg-accent text-white hover:bg-accent/90 shadow-md font-semibold gap-2">
            <Plus className="h-4 w-4" /> Thêm đánh giá KPI
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Cụm 4 Thẻ Chỉ Số KPI Trực Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-border-subtle bg-card shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Điểm KPI TB</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-ink font-heading">{avgScore}</span>
                <span className="text-sm font-medium text-ink-muted">/100</span>
              </div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                {avgScore >= 85 ? '🌟 Hiệu suất Xuất sắc' : avgScore >= 70 ? '👍 Hiệu suất Đạt yêu cầu' : '⚠️ Cần cải thiện thêm'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border-subtle bg-card shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Doanh Thu Thực Tế</p>
              <p className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-mono mt-1">{formatVND(totalRevenue)}</p>
              <p className="text-xs text-ink-muted mt-1">Mục tiêu: <span className="font-semibold">{formatVND(totalTarget)}</span></p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border-subtle bg-card shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Tổng Giao Dịch Chốt</p>
              <p className="text-3xl font-extrabold text-ink font-heading mt-1">{totalDeals} <span className="text-sm font-normal text-ink-muted">HĐ</span></p>
              <p className="text-xs text-ink-muted mt-1">{totalAppointments} Lịch hẹn • {totalLeads} Leads</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border-subtle bg-card shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Đạt / Mục Tiêu Kế Hoạch</p>
                <span className="text-sm font-bold text-accent font-mono">{achievementRate}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3.5 border border-border-subtle">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${achievementRate >= 100 ? 'bg-emerald-500' : achievementRate >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(achievementRate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-ink-muted mt-2 text-right">
                {achievementRate >= 100 ? '🟢 Hoàn thành mục tiêu' : `Còn thiếu ${100 - achievementRate}%`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cụm 2 Biểu Đồ Trực Quan (Recharts Dashboard) */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Biểu đồ Cột: Doanh thu thực tế vs Mục tiêu */}
          <Card className="lg:col-span-2 rounded-xl border border-border-subtle bg-card shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <h3 className="text-base font-bold font-heading text-ink">So sánh Doanh thu Thực tế vs Mục tiêu KPI (Triệu VNĐ)</h3>
              </div>
              <span className="text-xs text-ink-muted font-medium">Theo nhân viên</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} unit="tr" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                    formatter={(val: any) => [`${val} triệu VNĐ`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Doanh thu thực" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Mục tiêu" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Biểu đồ Tròn: Phân bổ trạng thái KPI */}
          <Card className="rounded-xl border border-border-subtle bg-card shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="h-5 w-5 text-indigo-500" />
                <h3 className="text-base font-bold font-heading text-ink">Phân bổ Trạng thái KPI</h3>
              </div>
              <div className="h-56 w-full flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry: { name: string; value: number; color: string }, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} nhân viên`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-ink-muted">Chưa có dữ liệu trạng thái</p>
                )}
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Vượt chỉ tiêu</span>
                <span className="font-bold font-mono">{filtered.filter(f => f.status === 'exceeded').length} nhân viên</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-blue-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Đúng tiến độ</span>
                <span className="font-bold font-mono">{filtered.filter(f => f.status === 'on_track').length} nhân viên</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-red-600"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Chậm tiến độ</span>
                <span className="font-bold font-mono">{filtered.filter(f => f.status === 'behind').length} nhân viên</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Thanh Bộ Lọc Thời Gian Nâng Cao */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center bg-card p-4 rounded-xl border border-border-subtle shadow-xs">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold text-ink uppercase tracking-wider">Bộ lọc KPI:</span>
        </div>

        {/* Lọc Nhân viên */}
        <select
          value={filterEmployeeId}
          onChange={(e) => setFilterEmployeeId(e.target.value)}
          className="h-9 min-w-[180px] rounded-lg border border-border bg-background px-3 text-xs text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Tất cả nhân viên</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name || (emp as any).name}
            </option>
          ))}
        </select>

        {/* Lọc Năm */}
        <select
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value);
            setFilterFromDate('');
            setFilterToDate('');
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Tất cả các năm</option>
          <option value="2026">Năm 2026</option>
          <option value="2025">Năm 2025</option>
          <option value="2024">Năm 2024</option>
        </select>

        {/* Lọc Quý */}
        <select
          value={filterQuarter}
          onChange={(e) => {
            setFilterQuarter(e.target.value);
            if (e.target.value) setFilterMonth('');
            setFilterFromDate('');
            setFilterToDate('');
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Tất cả các quý</option>
          <option value="1">Quý 1</option>
          <option value="2">Quý 2</option>
          <option value="3">Quý 3</option>
          <option value="4">Quý 4</option>
        </select>

        {/* Lọc Tháng */}
        <select
          value={filterMonth}
          onChange={(e) => {
            setFilterMonth(e.target.value);
            if (e.target.value) setFilterQuarter('');
            setFilterFromDate('');
            setFilterToDate('');
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Tất cả các tháng</option>
          {Array.from({ length: 12 }, (_, i) => {
            const m = (i + 1).toString().padStart(2, '0');
            return (
              <option key={m} value={m}>Tháng {m}</option>
            );
          })}
        </select>

        <div className="h-4 w-[1px] bg-border-subtle hidden lg:block" />

        {/* Khoảng ngày tùy chỉnh */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted">Từ:</span>
          <Input
            type="date"
            value={filterFromDate}
            onChange={(e) => {
              setFilterFromDate(e.target.value);
              if (e.target.value) {
                setFilterQuarter('');
                setFilterMonth('');
              }
            }}
            className="h-9 w-36 text-xs bg-background rounded-lg border-border"
          />
          <span className="text-xs font-semibold text-ink-muted">Đến:</span>
          <Input
            type="date"
            value={filterToDate}
            onChange={(e) => {
              setFilterToDate(e.target.value);
              if (e.target.value) {
                setFilterQuarter('');
                setFilterMonth('');
              }
            }}
            className="h-9 w-36 text-xs bg-background rounded-lg border-border"
          />
        </div>

        {/* Nút Đặt lại bộ lọc */}
        {(filterEmployeeId || filterQuarter || filterMonth || filterFromDate || filterToDate || filterYear !== new Date().getFullYear().toString()) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterEmployeeId('');
              setFilterYear(new Date().getFullYear().toString());
              setFilterQuarter('');
              setFilterMonth('');
              setFilterFromDate('');
              setFilterToDate('');
            }}
            className="h-9 text-xs gap-1 text-ink-muted hover:text-ink ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Bảng Danh Sách KPI Trực Quan */}
      <Card className="rounded-xl border border-border-subtle bg-card shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[850px]">
                <thead className="bg-bg-subtle/80 border-b border-border-subtle">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-bold text-ink-muted text-xs uppercase">Nhân viên</th>
                    <th className="px-4 py-3.5 text-left font-bold text-ink-muted text-xs uppercase">Kỳ / Thời gian</th>
                    <th className="px-4 py-3.5 text-center font-bold text-ink-muted text-xs uppercase">Leads</th>
                    <th className="px-4 py-3.5 text-center font-bold text-ink-muted text-xs uppercase">Lịch hẹn</th>
                    <th className="px-4 py-3.5 text-center font-bold text-ink-muted text-xs uppercase">Giao dịch</th>
                    <th className="px-4 py-3.5 text-right font-bold text-ink-muted text-xs uppercase">Doanh thu / Mục tiêu</th>
                    <th className="px-4 py-3.5 text-center font-bold text-ink-muted text-xs uppercase">Điểm KPI</th>
                    <th className="px-4 py-3.5 text-center font-bold text-ink-muted text-xs uppercase">Đánh giá</th>
                    <th className="px-4 py-3.5 text-right font-bold text-ink-muted text-xs uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((item) => {
                    const sc = statusConfig[item.status] ?? statusConfig.on_track;
                    const StatusIcon = sc.icon;
                    const revenueRate = item.target_revenue ? Math.round((item.revenue_generated / item.target_revenue) * 100) : 0;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
                        onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setViewItem(item); setIsViewOpen(true); }}
                      >
                        <td className="px-4 py-3.5 font-semibold text-ink">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                              {item.employee_name ? item.employee_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{item.employee_name}</span>
                                {item.auto_calculated && (
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold rounded-md">
                                    Tự động
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-ink-muted text-xs font-mono font-medium">{item.period}</td>
                        <td className="px-4 py-3.5 text-center text-ink font-semibold">{item.total_leads}</td>
                        <td className="px-4 py-3.5 text-center text-ink font-semibold">{item.total_appointments}</td>
                        <td className="px-4 py-3.5 text-center text-ink font-semibold">{item.successful_deals}</td>
                        <td className="px-4 py-3.5 text-right min-w-[180px]">
                          <div className="text-ink font-extrabold font-mono">{formatVND(item.revenue_generated)}</div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border border-border-subtle">
                              <div 
                                className={`h-full rounded-full transition-all ${revenueRate >= 100 ? 'bg-emerald-500' : revenueRate >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(revenueRate, 100)}%` }}
                              />
                            </div>
                            <span className={`text-[11px] font-bold font-mono ${revenueRate >= 100 ? 'text-emerald-600' : revenueRate >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                              {revenueRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className={`inline-flex items-center justify-center h-8 w-8 rounded-xl font-mono font-extrabold text-sm shadow-xs ${
                            item.score >= 90 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : item.score >= 70 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {item.score}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs ${sc.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg border-border-subtle hover:border-accent hover:text-accent" onClick={(e) => { e.stopPropagation(); setEditItem(item); setIsFormOpen(true); }}>Sửa</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-ink-muted">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30 text-accent" />
                  <p className="font-bold text-ink">Không có dữ liệu KPI thỏa mãn bộ lọc</p>
                  <p className="text-xs text-ink-muted mt-1">Hãy thử nới rộng khoảng ngày hoặc bấm &quot;Xóa bộ lọc&quot;</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chi tiết KPI — {viewItem?.employee_name}
              {viewItem?.auto_calculated && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold rounded-full">
                  Tính tự động
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="text-center p-4 bg-bg-subtle rounded-lg">
                <div className="text-4xl font-bold text-ink">{viewItem.score}</div>
                <div className="text-sm text-ink-muted mt-0.5">Điểm / 100</div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusConfig[viewItem.status]?.color ?? ''}`}>
                  {statusConfig[viewItem.status]?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-bg-subtle rounded-lg"><p className="text-ink-muted">Leads</p><p className="text-xl font-bold text-ink">{viewItem.total_leads}</p></div>
                <div className="p-3 bg-bg-subtle rounded-lg"><p className="text-ink-muted">Lịch hẹn</p><p className="text-xl font-bold text-ink">{viewItem.total_appointments}</p></div>
                <div className="p-3 bg-bg-subtle rounded-lg"><p className="text-ink-muted">Giao dịch</p><p className="text-xl font-bold text-green-700">{viewItem.successful_deals}</p></div>
              </div>
              <div className="p-3 bg-bg-subtle rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-ink-muted">Doanh thu</span>
                  <span className="font-medium">{formatVND(viewItem.revenue_generated)} / {formatVND(viewItem.target_revenue)}</span>
                </div>
                <div className="h-2 bg-border-subtle rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${viewItem.revenue_generated >= viewItem.target_revenue ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(viewItem.target_revenue ? (viewItem.revenue_generated / viewItem.target_revenue) * 100 : 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} đánh giá KPI</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Nhân viên</label>
                <select name="employeeId" defaultValue={editItem?.employee_id ?? ''} required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.filter((e) => e.status === 'active').map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name || (e as any).name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Kỳ (YYYY-MM)</label>
                <Input name="period" defaultValue={editItem?.period ?? ''} required placeholder="2024-01" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Leads</label>
                <Input name="total_leads" type="number" defaultValue={editItem?.total_leads ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Lịch hẹn</label>
                <Input name="total_appointments" type="number" defaultValue={editItem?.total_appointments ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Giao dịch thành công</label>
                <Input name="successful_deals" type="number" defaultValue={editItem?.successful_deals ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Điểm (0–100)</label>
                <Input name="score" type="number" defaultValue={editItem?.score ?? 0} min={0} max={100} required />
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Doanh thu thực (đ)</label>
                <Input name="revenue_generated" type="number" defaultValue={editItem?.revenue_generated ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink block mb-1">Mục tiêu (đ)</label>
                <Input name="target_revenue" type="number" defaultValue={editItem?.target_revenue ?? 0} min={0} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview KPI Tự động */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-lg border border-border bg-white shadow-lg">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="font-heading text-lg font-bold text-ink flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Xem trước KPI tự động tính toán (Kỳ: {previewPeriod})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-700 text-xs">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 text-indigo-600" />
                <p>
                  Hệ thống đã tự động tính toán <strong>Doanh thu thực</strong>, <strong>Số giao dịch</strong> và <strong>Hoa hồng</strong> từ dữ liệu hợp đồng cọc và hợp đồng thuê thực tế trong kỳ này. Các chỉ số về leads, lịch hẹn, mục tiêu và điểm số sẽ được kế thừa từ KPI cũ (nếu có).
                </p>
              </div>

              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-bg-subtle text-ink border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Nhân viên</th>
                      <th className="px-4 py-3 text-center font-semibold">Giao dịch mới</th>
                      <th className="px-4 py-3 text-center font-semibold">Số Lead đã chốt</th>
                      <th className="px-4 py-3 text-right font-semibold">Doanh thu chốt được</th>
                      <th className="px-4 py-3 text-right font-semibold">Hoa hồng nhận</th>
                      <th className="px-4 py-3 text-right font-semibold">Mục tiêu (Target)</th>
                      <th className="px-4 py-3 text-center font-semibold">Điểm KPI</th>
                      <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-ink">
                    {autoKpiPreview.map((item, idx) => {
                      const sc = statusConfig[item.status] ?? statusConfig.on_track;
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={idx} className="hover:bg-bg-subtle dark:hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all">
                          <td className="px-4 py-3 font-medium text-ink">{item.employee_name}</td>
                          <td className="px-4 py-3 text-center text-ink-muted font-semibold">{item.successful_deals}</td>
                          <td className="px-4 py-3 text-center text-indigo-600 font-semibold">{item.converted_leads_count || 0}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-bold font-mono">{formatVND(item.revenue_generated)}</td>
                          <td className="px-4 py-3 text-right text-indigo-600 font-bold font-mono">{formatVND(item.commission_earned)}</td>
                          <td className="px-4 py-3 text-right text-ink font-mono">{formatVND(item.target_revenue)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-bg-subtle text-ink font-bold text-xs">{item.score}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                              <StatusIcon className="h-3 w-3" />{sc.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0 bg-bg-subtle/50">
            <Button type="button" variant="ghost" className="text-ink hover:bg-bg-subtle rounded-lg" onClick={() => setIsPreviewOpen(false)}>Hủy</Button>
            <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-2 font-semibold" disabled={savingAuto} onClick={handleSaveAutoKPIs}>
              {savingAuto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Xác nhận và Lưu vào hệ thống
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Cấu hình Luật KPI & Cơ chế Hoa hồng Sale */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="font-heading text-xl font-extrabold text-ink flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Settings className="h-5 w-5" />
              </div>
              Cấu hình Luật KPI & Cơ chế Hoa hồng Sale
            </DialogTitle>
          </DialogHeader>
          {kpiConfig ? (
            <form onSubmit={handleSaveConfig} className="space-y-6 pt-4 text-sm text-ink">
              {/* Cụm 1: Cơ chế Hoa hồng cho Sale - Interactive Option Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" /> Cơ chế Hoa hồng Chi trả cho Sale
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    Áp dụng toàn công ty
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: % Cố định */}
                  <div
                    onClick={() => setSelectedCommMode('fixed')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedCommMode === 'fixed'
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600'
                        : 'border-border bg-white hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-1.5 rounded-lg ${selectedCommMode === 'fixed' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Percent className="h-4 w-4" />
                        </div>
                        {selectedCommMode === 'fixed' && <Check className="h-4 w-4 text-indigo-600 font-bold" />}
                      </div>
                      <p className="font-bold text-xs text-ink">1. % Cố Định</p>
                      <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                        Tỷ lệ % hưởng cố định trên tổng hoa hồng thu từ Chủ nhà.
                      </p>
                    </div>
                    {selectedCommMode === 'fixed' && (
                      <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-center gap-1.5">
                        <Input
                          id="sale_commission_fixed_rate"
                          name="sale_commission_fixed_rate"
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={Math.round(((kpiConfig as any).sale_commission_fixed_rate ?? 0.60) * 100)}
                          className="rounded-lg border-indigo-300 font-mono w-16 h-8 text-center bg-white text-xs font-bold"
                        />
                        <span className="text-[11px] font-bold text-indigo-900">% hoa hồng</span>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Bậc thang Tier */}
                  <div
                    onClick={() => setSelectedCommMode('tier')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedCommMode === 'tier'
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600'
                        : 'border-border bg-white hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-1.5 rounded-lg ${selectedCommMode === 'tier' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        {selectedCommMode === 'tier' && <Check className="h-4 w-4 text-indigo-600 font-bold" />}
                      </div>
                      <p className="font-bold text-xs text-ink">2. Bậc Thang Doanh Số</p>
                      <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                        Tăng % thưởng lũy tiến theo mốc doanh số tháng (Dream House).
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] space-y-0.5 font-mono text-ink-muted">
                      {commissionTiers.slice(0, 3).map((t, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>mốc {idx + 1}:</span> <span className="font-bold text-amber-700">{Math.round(t.rate * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Option 3: Custom */}
                  <div
                    onClick={() => setSelectedCommMode('custom')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedCommMode === 'custom'
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600'
                        : 'border-border bg-white hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-1.5 rounded-lg ${selectedCommMode === 'custom' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Edit3 className="h-4 w-4" />
                        </div>
                        {selectedCommMode === 'custom' && <Check className="h-4 w-4 text-indigo-600 font-bold" />}
                      </div>
                      <p className="font-bold text-xs text-ink">3. Tùy Chỉnh / Nhập Tay</p>
                      <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                        Nhập số % hoa hồng tùy chọn khi Admin lập từng HĐ Cọc / Thuê.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-medium text-emerald-700">
                      Cơ chế linh hoạt per-deal
                    </div>
                  </div>
                </div>

                {/* Sub-Editor: Dynamic Tier Table Manager when selectedCommMode === 'tier' */}
                {selectedCommMode === 'tier' && (
                  <div className="mt-3 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-amber-600" /> Quản lý Các mốc Bậc Thang Doanh Số cho Công Ty
                      </h5>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const lastMax = commissionTiers[commissionTiers.length - 1]?.maxRevenue || 25000000;
                          setCommissionTiers([
                            ...commissionTiers,
                            { minRevenue: lastMax, maxRevenue: lastMax + 15000000, rate: 0.45 }
                          ]);
                        }}
                        className="h-7 text-[11px] font-bold bg-white text-amber-800 border-amber-300 hover:bg-amber-100 gap-1 rounded-lg"
                      >
                        <Plus className="h-3 w-3" /> Thêm mốc mới
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {commissionTiers.map((tier, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-200 text-xs">
                          <span className="font-bold text-amber-800 shrink-0 w-12 text-center">Mốc {idx + 1}</span>
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">Từ:</span>
                              <Input
                                type="text"
                                value={formatNumberWithDots(tier.minRevenue)}
                                onChange={(e) => {
                                  const val = parseNumberWithDots(e.target.value);
                                  const updated = [...commissionTiers];
                                  updated[idx].minRevenue = val;
                                  setCommissionTiers(updated);
                                }}
                                className="h-7 text-xs font-mono font-bold border-amber-200 text-slate-900"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">Đến:</span>
                              <Input
                                type="text"
                                value={formatNumberWithDots(tier.maxRevenue)}
                                onChange={(e) => {
                                  const val = parseNumberWithDots(e.target.value);
                                  const updated = [...commissionTiers];
                                  updated[idx].maxRevenue = val;
                                  setCommissionTiers(updated);
                                }}
                                className="h-7 text-xs font-mono font-bold border-amber-200 text-slate-900"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">% Hưởng:</span>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(tier.rate * 100)}
                                onChange={(e) => {
                                  const val = Number(e.target.value || 0) / 100;
                                  const updated = [...commissionTiers];
                                  updated[idx].rate = val;
                                  setCommissionTiers(updated);
                                }}
                                className="h-7 text-xs font-mono font-extrabold text-amber-700 border-amber-200 text-center"
                              />
                              <span className="text-[11px] font-bold text-amber-800">%</span>
                            </div>
                          </div>
                          {commissionTiers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-md"
                              onClick={() => {
                                setCommissionTiers(commissionTiers.filter((_, i) => i !== idx));
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cụm 2: Trọng số tính điểm KPI */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-ink-muted">⚖️ Trọng số Đánh giá KPI</h4>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Tổng = 100%</span>
                </div>
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="space-y-1.5">
                    <label htmlFor="revenue_weight" className="text-ink-muted block text-[11px] font-semibold uppercase">Doanh thu (%)</label>
                    <Input 
                      id="revenue_weight" 
                      name="revenue_weight" 
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={Math.round(kpiConfig.revenue_weight * 100)} 
                      required 
                      className="rounded-lg border-border font-bold text-center bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="appointment_weight" className="text-ink-muted block text-[11px] font-semibold uppercase">Lịch hẹn (%)</label>
                    <Input 
                      id="appointment_weight" 
                      name="appointment_weight" 
                      type="number" 
                      min={0}
                      max={100}
                      defaultValue={Math.round(kpiConfig.appointment_weight * 100)} 
                      required 
                      className="rounded-lg border-border font-bold text-center bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lead_weight" className="text-ink-muted block text-[11px] font-semibold uppercase">Leads (%)</label>
                    <Input 
                      id="lead_weight" 
                      name="lead_weight" 
                      type="number" 
                      min={0}
                      max={100}
                      defaultValue={Math.round(kpiConfig.lead_weight * 100)} 
                      required 
                      className="rounded-lg border-border font-bold text-center bg-white" 
                    />
                  </div>
                </div>
              </div>

              {/* Cụm 3: Mục tiêu mặc định hàng tháng */}
              <div className="space-y-3 pt-3 border-t border-border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-ink-muted">🎯 Mục tiêu Mặc định Hàng tháng</h4>
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="space-y-1.5">
                    <label htmlFor="default_target_revenue" className="text-ink-muted block text-xs font-semibold uppercase tracking-wider">Doanh thu mục tiêu (VNĐ)</label>
                    <Input 
                      id="default_target_revenue" 
                      name="default_target_revenue" 
                      type="text" 
                      value={targetRevenueFormatted} 
                      onChange={(e) => setTargetRevenueFormatted(formatNumberWithDots(e.target.value))}
                      required 
                      className="rounded-lg border-border font-mono bg-white font-bold text-accent" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="default_target_appointments" className="text-ink-muted block text-xs font-semibold uppercase tracking-wider">Mục tiêu cuộc hẹn</label>
                      <Input 
                        id="default_target_appointments" 
                        name="default_target_appointments" 
                        type="number" 
                        defaultValue={kpiConfig.default_target_appointments} 
                        required 
                        className="rounded-lg border-border font-mono bg-white text-center font-bold" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="default_target_leads" className="text-ink-muted block text-xs font-semibold uppercase tracking-wider">Mục tiêu lead chốt</label>
                      <Input 
                        id="default_target_leads" 
                        name="default_target_leads" 
                        type="number" 
                        defaultValue={kpiConfig.default_target_leads} 
                        required 
                        className="rounded-lg border-border font-mono bg-white text-center font-bold" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)} className="rounded-xl border-border">
                  Hủy
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 shadow-sm gap-2" disabled={savingConfig}>
                  {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Lưu cấu hình
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-ink-muted">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-indigo-600" />
              <p className="text-sm">Đang tải cấu hình...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
