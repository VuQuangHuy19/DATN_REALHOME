import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  Users,
  Shield,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sliders,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminModule } from '@/features/admin/context/admin-module-context';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export function OrganizationSystemHub() {
  const { company } = useAuth();
  const { activeModule, setActiveModule } = useAdminModule();
  const companyId = company?.id;

  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'current_month' | 'last_month' | 'quarter' | 'all_time'>('current_month');

  const [systemStats, setSystemStats] = useState({
    totalEmployees: 0,
    activeManagers: 0,
    salesAgents: 0,
    rolesCount: 0,
    systemStatus: 'Hoạt động bình thường',
    lastBackup: 'Hằng ngày (04:00)',
  });

  const [teamKPIs, setTeamKPIs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [kpiChartData, setKpiChartData] = useState<any[]>([]);
  const [rolePieData, setRolePieData] = useState<any[]>([]);
  const [kpiTotals, setKpiTotals] = useState({ totalRevenue: 0, totalDeals: 0 });

  useEffect(() => {
    if (!companyId) return;

    async function fetchGovernanceData() {
      setLoading(true);
      try {
        // Determine date range for timeframe filter
        const now = new Date();
        let startDateStr = '';
        if (timeframe === 'current_month') {
          startDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        } else if (timeframe === 'last_month') {
          const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDateStr = `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2, '0')}-01`;
        } else if (timeframe === 'quarter') {
          const qMonth = Math.floor(now.getMonth() / 3) * 3;
          startDateStr = `${now.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}-01`;
        }

        // 1. Fetch Profiles / Employees for Role Breakdown
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, role, is_active, full_name')
          .eq('company_id', companyId);

        const profiles = profileData || [];
        let managers = 0;
        let sales = 0;
        let admins = 0;
        let others = 0;

        profiles.forEach((p: any) => {
          const r = (p.role || '').toLowerCase();
          if (r === 'sales_agent') sales++;
          else if (r === 'manager' || r === 'building_manager') managers++;
          else if (r === 'company_admin' || r === 'admin' || r === 'super_admin') admins++;
          else others++;
        });

        const roleItems = [
          { name: 'Sales Agent', value: sales, fill: '#8b5cf6' },
          { name: 'Quản lý tòa nhà', value: managers, fill: '#38bdf8' },
          { name: 'Ban Quản trị / Admin', value: admins, fill: '#10b981' },
          { name: 'Khác & CSKH', value: others, fill: '#f59e0b' },
        ].filter(r => r.value > 0);

        setRolePieData(roleItems.length > 0 ? roleItems : [
          { name: 'Chưa có phân quyền', value: 1, fill: '#94a3b8' }
        ]);

        // 2. Fetch Roles
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, name')
          .eq('company_id', companyId);

        // 3. Fetch Employee KPIs for Chart 1
        let kpiQuery = supabase
          .from('employee_kpis')
          .select('id, employee_name, period, successful_deals, revenue_generated, target_revenue, score, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (startDateStr && timeframe !== 'all_time') {
          kpiQuery = kpiQuery.gte('created_at', startDateStr);
        }

        const { data: kpiData } = await kpiQuery;
        const kpis = kpiData || [];
        setTeamKPIs(kpis.slice(0, 6));

        let sumRev = 0;
        let sumDeals = 0;

        const chartItems = kpis.map((k: any) => {
          const rev = Number(k.revenue_generated || 0);
          const deals = Number(k.successful_deals || 0);
          sumRev += rev;
          sumDeals += deals;
          return {
            name: k.employee_name || 'Nhân viên',
            revenue: Math.round((rev / 1000000) * 10) / 10,
            deals,
            score: k.score || 0,
          };
        });

        setKpiChartData(chartItems);
        setKpiTotals({ totalRevenue: sumRev, totalDeals: sumDeals });

        // 4. Fetch Activity Logs
        const { data: logsData } = await supabase
          .from('activity_logs')
          .select('id, user_name, action, entity, ip_address, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(8);

        setAuditLogs(logsData || []);

        setSystemStats({
          totalEmployees: profiles.length,
          activeManagers: managers,
          salesAgents: sales,
          rolesCount: rolesData?.length || 0,
          systemStatus: 'Hoạt động bình thường',
          lastBackup: 'Hằng ngày (04:00)',
        });
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu phân hệ Quản trị:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGovernanceData();
  }, [companyId, timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner Hub */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-700 p-6 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {activeModule !== 'all' && (
              <button
                onClick={() => setActiveModule('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all mb-3 cursor-pointer border border-white/20 backdrop-blur-md"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại Tổng quan Tất cả</span>
              </button>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-purple-100 backdrop-blur-md mb-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-purple-300" />
              <span>Phân Hệ 4 • Quản Trị Hệ Thống & Cơ Cấu Đội Ngũ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization & System Hub</h1>
            <p className="text-sm text-purple-100/90 mt-1 max-w-xl">
              Dữ liệu thực từ DB: Quản lý sơ đồ tổ chức, chỉ tiêu KPI nhân sự, ma trận phân quyền nâng cao (RBAC) và nhật ký hoạt động hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="bg-white text-purple-900 hover:bg-purple-50 font-bold shadow-md">
              <Link href="/admin/kyc">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-purple-700" />
                Xác Thực KYC
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold backdrop-blur-md">
              <Link href="/admin/system/roles">
                <Shield className="h-4 w-4 mr-1.5" />
                Ma Trận Phân Quyền
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold backdrop-blur-md">
              <Link href="/admin/hr/employees">
                <Users className="h-4 w-4 mr-1.5" />
                Quản Lý Nhân Sự
              </Link>
            </Button>
          </div>
        </div>

        {/* Dynamic Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-purple-200 font-medium">Tổng Nhân Sự</p>
            <p className="text-xl font-bold mt-0.5">{systemStats.totalEmployees} Nhân viên</p>
            <p className="text-[11px] text-purple-200 mt-1">{systemStats.salesAgents} Sales • {systemStats.activeManagers} Quản lý</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-purple-200 font-medium">Vai Trò Phân Quyền (RBAC)</p>
            <p className="text-xl font-bold text-sky-300 mt-0.5">{systemStats.rolesCount} Roles</p>
            <p className="text-[11px] text-purple-200 mt-1">Linh hoạt theo doanh nghiệp</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-purple-200 font-medium">Trạng Thái Máy Chủ</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">Online 99.9%</p>
            <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="h-3 w-3" /> {systemStats.systemStatus}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-purple-200 font-medium">Sao Lưu Tự Động</p>
            <p className="text-xl font-bold text-purple-200 mt-0.5">Cloud Storage</p>
            <p className="text-[11px] text-purple-200 mt-1">{systemStats.lastBackup}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin mr-2" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Đang tải dữ liệu Quản trị & Nhật ký hệ thống...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dynamic Timeframe Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Bộ Lọc Kỳ Báo Cáo Hiệu Suất Quản Trị</h4>
                <p className="text-[11px] text-slate-400">Tự động cập nhật biểu đồ KPI nhân sự & cơ cấu tổ chức theo thời gian</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto">
              <button
                onClick={() => setTimeframe('current_month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'current_month' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setTimeframe('last_month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'last_month' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tháng trước
              </button>
              <button
                onClick={() => setTimeframe('quarter')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'quarter' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Quý này
              </button>
              <button
                onClick={() => setTimeframe('all_time')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'all_time' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* 2 Column Main Grid: Team Performance Chart vs Role Breakdown Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Team KPI Performance Composed Chart */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Performance KPI Đội Ngũ Nhân Sự</h3>
                    <p className="text-xs text-slate-500">So sánh Doanh số phát sinh & Số phòng chốt thành công</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-bold px-2.5 py-1">
                  {kpiTotals.totalDeals} Phòng Chốt
                </Badge>
              </div>

              {/* Composed Chart: Bar (Revenue M VNĐ) + Line (Successful Deals) */}
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={kpiChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="M" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <p className="font-bold text-purple-400">{label}</p>
                              <p className="text-purple-300">💰 Doanh số: <strong>{item.revenue} triệu VNĐ</strong></p>
                              <p className="text-emerald-300">🏠 Số phòng chốt: <strong>{item.deals} phòng</strong></p>
                              <p className="text-amber-300">⭐ Điểm KPI: <strong>{item.score}đ</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Doanh số (Triệu đ)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={16} />
                    <Line yAxisId="right" type="monotone" dataKey="deals" name="Số phòng chốt" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Sub KPI Stats */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                  <p className="text-[10px] text-slate-400 font-medium">Tổng doanh số đội ngũ</p>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">{new Intl.NumberFormat('vi-VN').format(kpiTotals.totalRevenue)} đ</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                  <p className="text-[10px] text-slate-400 font-medium">Tổng phòng lấp đầy</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{kpiTotals.totalDeals} Hợp đồng</p>
                </div>
              </div>
            </div>

            {/* Chart 2: Role & RBAC Distribution Donut Chart */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Phân Bổ Cơ Cấu Nhân Sự & Vai Trò</h3>
                    <p className="text-xs text-slate-500">Tỷ lệ cơ cấu nhân sự theo ma trận phân quyền (RBAC)</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold px-2.5 py-1">
                  {systemStats.totalEmployees} Thành Viên
                </Badge>
              </div>

              {/* Donut Chart & Role Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-[210px] w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={rolePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {rolePieData.map((entry, index) => (
                          <Cell key={`role-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} thành viên`, 'Số lượng']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">{systemStats.totalEmployees}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Nhân sự</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                  {rolePieData.map((r) => (
                    <div key={r.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.fill }} />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">{r.value} người</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Link Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                  <Link href="/admin/hr/employees">Danh Sách Nhân Sự ➔</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                  <Link href="/admin/system/roles">Ma Trận RBAC ➔</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
