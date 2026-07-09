'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Search, Loader2, AlertCircle } from 'lucide-react';
import { getKPIs, createKPI, updateKPI } from '@/lib/supabase/repositories/kpis';
import { useEmployees } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBEmployeeKPI } from '@/lib/supabase/types';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  exceeded: { label: 'Vượt chỉ tiêu', color: 'bg-green-100 text-green-700', icon: TrendingUp },
  on_track: { label: 'Đúng tiến độ',  color: 'bg-blue-100 text-blue-700',  icon: Minus },
  behind:   { label: 'Chậm tiến độ',  color: 'bg-red-100 text-red-700',    icon: TrendingDown },
};

function formatVND(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + ' triệu';
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function KpiPage() {
  const { company } = useAuth();
  const { items: employees } = useEmployees(company?.id);
  const [kpiList, setKpiList] = useState<DBEmployeeKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [viewItem, setViewItem] = useState<DBEmployeeKPI | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DBEmployeeKPI | null>(null);
  const [saving, setSaving] = useState(false);

  const loadKPIs = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const data = await getKPIs(company.id);
      setKpiList(data);
      if (data.length > 0 && !selectedPeriod) {
        const periods = Array.from(new Set(data.map((k) => k.period))).sort().reverse();
        setSelectedPeriod(periods[0]);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  const periods = Array.from(new Set(kpiList.map((k) => k.period))).sort().reverse();

  const filtered = kpiList.filter((k) => {
    const matchPeriod = !selectedPeriod || k.period === selectedPeriod;
    const matchSearch = k.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchPeriod && matchSearch;
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
      employee_name: emp?.name ?? '',
      period: fd.get('period') as string,
      total_leads: Number(fd.get('total_leads') || 0),
      total_appointments: Number(fd.get('total_appointments') || 0),
      successful_deals: Number(fd.get('successful_deals') || 0),
      conversion_rate: 0,
      revenue_generated: revenue,
      target_revenue: target,
      score,
      status,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">KPI Nhân viên</h1>
          <p className="text-slate-500">Theo dõi và đánh giá hiệu suất kinh doanh</p>
        </div>
        <Button onClick={() => { setEditItem(null); setIsFormOpen(true); }}>Thêm đánh giá KPI</Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-sm text-slate-500">Điểm TB{selectedPeriod ? ` (${selectedPeriod})` : ''}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{avgScore}<span className="text-base text-slate-400 font-normal">/100</span></p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-slate-500">Doanh thu thực tế</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{formatVND(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-slate-500">Đạt / Mục tiêu</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            {totalTarget ? Math.round((totalRevenue / totalTarget) * 100) : 0}<span className="text-base text-slate-400 font-normal">%</span>
          </p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPeriod('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedPeriod ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tất cả
          </button>
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedPeriod === p ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Tìm nhân viên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Nhân viên</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Kỳ</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Leads</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Lịch hẹn</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Giao dịch</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Doanh thu</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Điểm</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Đánh giá</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => {
                    const sc = statusConfig[item.status] ?? statusConfig.on_track;
                    const StatusIcon = sc.icon;
                    const revenueRate = item.target_revenue ? Math.round((item.revenue_generated / item.target_revenue) * 100) : 0;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setViewItem(item); setIsViewOpen(true); }}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{item.employee_name}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{item.period}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.total_leads}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.total_appointments}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.successful_deals}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-slate-800 font-medium">{formatVND(item.revenue_generated)}</div>
                          <div className={`text-xs ${revenueRate >= 100 ? 'text-green-600' : 'text-slate-400'}`}>{revenueRate}% mục tiêu</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-800 font-bold text-sm">{item.score}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                            <StatusIcon className="h-3 w-3" />{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditItem(item); setIsFormOpen(true); }}>Sửa</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Không có dữ liệu KPI</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết KPI — {viewItem?.employee_name}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-4xl font-bold text-slate-800">{viewItem.score}</div>
                <div className="text-sm text-slate-400 mt-0.5">Điểm / 100</div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusConfig[viewItem.status]?.color ?? ''}`}>
                  {statusConfig[viewItem.status]?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-400">Leads</p><p className="text-xl font-bold text-slate-800">{viewItem.total_leads}</p></div>
                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-400">Lịch hẹn</p><p className="text-xl font-bold text-slate-800">{viewItem.total_appointments}</p></div>
                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-slate-400">Giao dịch</p><p className="text-xl font-bold text-green-700">{viewItem.successful_deals}</p></div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Doanh thu</span>
                  <span className="font-medium">{formatVND(viewItem.revenue_generated)} / {formatVND(viewItem.target_revenue)}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
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
                <label className="text-sm font-medium text-slate-700 block mb-1">Nhân viên</label>
                <select name="employeeId" defaultValue={editItem?.employee_id ?? ''} required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.filter((e) => e.status === 'active').map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Kỳ (YYYY-MM)</label>
                <Input name="period" defaultValue={editItem?.period ?? ''} required placeholder="2024-01" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Leads</label>
                <Input name="total_leads" type="number" defaultValue={editItem?.total_leads ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Lịch hẹn</label>
                <Input name="total_appointments" type="number" defaultValue={editItem?.total_appointments ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Giao dịch thành công</label>
                <Input name="successful_deals" type="number" defaultValue={editItem?.successful_deals ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Điểm (0–100)</label>
                <Input name="score" type="number" defaultValue={editItem?.score ?? 0} min={0} max={100} required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Doanh thu thực (đ)</label>
                <Input name="revenue_generated" type="number" defaultValue={editItem?.revenue_generated ?? 0} min={0} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Mục tiêu (đ)</label>
                <Input name="target_revenue" type="number" defaultValue={editItem?.target_revenue ?? 0} min={0} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
