'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, Home, Users, DollarSign, Activity,
  CheckCircle, ShieldAlert, Clock, Sparkles, TrendingUp, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function SuperAdminDashboardView() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    totalRoomsSystem: 0,
    totalUsersSystem: 0,
    monthlySaaSRevenue: 0,
    companiesList: [],
  });

  useEffect(() => {
    async function fetchSuperAdminStats() {
      setLoading(true);
      try {
        const [compRes, roomRes, userRes, invRes] = await Promise.all([
          supabase.from('companies').select('*'),
          supabase.from('rooms').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('saas_invoices').select('amount, status').eq('status', 'paid'),
        ]);

        const compList = compRes.data || [];
        const activeComps = compList.filter((c: any) => c.status === 'active' || c.status === 'trial').length;
        const suspendedComps = compList.filter((c: any) => c.status === 'suspended').length;
        const saasRev = (invRes.data || []).reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);

        setStats({
          totalCompanies: compList.length,
          activeCompanies: activeComps,
          suspendedCompanies: suspendedComps,
          totalRoomsSystem: roomRes.count || 0,
          totalUsersSystem: userRes.count || 0,
          monthlySaaSRevenue: saasRev,
          companiesList: compList,
        });
      } catch (err) {
        console.error('Lỗi tải Super Admin Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSuperAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pieData = [
    { name: 'Đang hoạt động', value: stats.activeCompanies, color: '#10b981' },
    { name: 'Đang tạm khóa', value: stats.suspendedCompanies, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Quản trị Toàn sàn SaaS (Super Admin)
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Tổng quan tài chính đăng ký gói, quy mô phòng trọ và tình trạng hoạt động của các Công ty
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-4 py-2 rounded-xl text-purple-700 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Super Admin Portal
        </div>
      </div>

      {/* KPI Kép Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu SaaS MRR */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Doanh thu SaaS (MRR)</p>
              <p className="text-xl font-bold font-mono text-purple-600 mt-2 truncate tabular-nums">
                {formatCurrency(stats.monthlySaaSRevenue)}
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tổng số Công ty */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Công ty SaaS</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalCompanies}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">{stats.activeCompanies} đang hoạt động</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tổng phòng hệ thống */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Quy mô Phòng toàn hệ thống</p>
              <p className="text-3xl font-bold font-heading text-blue-600 mt-1 tracking-tight">{stats.totalRoomsSystem}</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                <Home className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tổng người dùng */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tổng Tài khoản Người dùng</p>
              <p className="text-3xl font-bold font-heading text-indigo-600 mt-1 tracking-tight">{stats.totalUsersSystem}</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Công ty SaaS & Danh sách */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-purple-600" />
            Danh sách Công ty SaaS &amp; Tình trạng Đăng ký Gói
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-bg-subtle text-ink-muted font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">Mã / Tên công ty</th>
                  <th className="px-5 py-3">Gói SaaS</th>
                  <th className="px-5 py-3">Chủ sở hữu</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Ngày hết hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-ink">
                {stats.companiesList.map((comp: any) => (
                  <tr key={comp.id} className="hover:bg-bg-subtle/55 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-bold text-ink block">{comp.name}</span>
                      <span className="text-[10px] text-ink-muted font-mono">{comp.code || comp.id}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold uppercase">{comp.plan || 'starter'}</td>
                    <td className="px-5 py-3 font-medium">
                      <span>{comp.owner_name || 'Admin'}</span>
                      <span className="text-[10px] text-ink-muted block">{comp.owner_email}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        comp.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : comp.status === 'trial'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {comp.status === 'active' ? 'Đang dùng' : comp.status === 'trial' ? 'Dùng thử' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink-muted">
                      {comp.trial_ends_at ? new Date(comp.trial_ends_at).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
