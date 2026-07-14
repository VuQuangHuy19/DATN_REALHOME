'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, Home, CalendarDays, Users, DollarSign,
  UserSearch, MessageSquare, Bell, AlertCircle, Loader2,
  Activity, PlusCircle, Pencil, Trash2, ShieldAlert,
  Sparkles, CalendarRange, Clock, CheckCircle2, ChevronRight,
  TrendingUp, Award, PlayCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getDashboardStats, getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { useActivityLogs } from '@/lib/hooks/useNotifications';
import { LandlordDashboardView } from '@/components/admin/LandlordDashboardView';
import { SalesDashboardView } from '@/components/admin/SalesDashboardView';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function AdminDashboardPage() {
  const { company, role, profile } = useAuth();
  const [stats, setStats] = useState<any | null>(null);
  const [salesStats, setSalesStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { logs: activityLogs } = useActivityLogs(company?.id);

  const isSale = role === 'sales_agent';

  useEffect(() => {
    setMounted(true);
    if (!company?.id) return;
    setLoading(true);

    if (isSale && profile?.id) {
      getSalesDashboardStats(company.id, profile.id)
        .then((data) => { setSalesStats(data); setError(null); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }

    const landlordId = role === 'landlord' ? (profile?.landlord_id ?? undefined) : undefined;
    getDashboardStats(company.id, landlordId)
      .then((data) => { setStats(data); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [company?.id, role, profile?.id, profile?.landlord_id, isSale]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Quản trị hệ thống
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Báo cáo hiệu suất kinh doanh, dòng tiền và quản lý vận hành công ty
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-soft border border-accent/20 rounded-full text-accent text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Quản trị công ty
        </div>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Tòa nhà */}
          <Link href="/admin/realhome/buildings">
            <Card className="hover:shadow-none hover:bg-bg-subtle/50 transition-colors border-border shadow-none rounded-lg cursor-pointer">
              <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tổng tòa nhà</p>
                  <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalBuildings}</p>
                </div>
                <div className="flex justify-end mt-2">
                  <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Phòng */}
          <Link href="/admin/realhome/rooms">
            <Card className="hover:shadow-none hover:bg-bg-subtle/50 transition-colors border-border shadow-none rounded-lg cursor-pointer">
              <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tổng số phòng</p>
                  <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalRooms}</p>
                </div>
                <div className="flex justify-end mt-2">
                  <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted">
                    <Home className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Tỉ lệ lấp đầy */}
          <Card className="border-border shadow-none rounded-lg">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tỷ lệ lấp đầy</p>
                <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.occupancyRate}%</p>
              </div>
              <div className="flex justify-end mt-2">
                <div className="p-1.5 rounded-md bg-accent-soft text-accent">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doanh thu tháng này */}
          <Card className="border-border shadow-none rounded-lg">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Doanh thu công ty (Phí QL)</p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-2 truncate tabular-nums">
                  {formatCurrency(stats.companyRevenue !== undefined ? stats.companyRevenue : stats.monthlyRevenue)}
                </p>
                {stats.totalCollectedAmount !== undefined && (
                  <p className="text-[10px] text-ink-muted mt-1 font-medium">
                    Tổng thu hộ: {formatCurrency(stats.totalCollectedAmount)}
                  </p>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hợp đồng hết hạn */}
          <Link href="/admin/contracts">
            <Card className="hover:shadow-none hover:bg-bg-subtle/50 transition-colors border-border shadow-none rounded-lg cursor-pointer">
              <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">HĐ sắp hết hạn (30d)</p>
                  <p className="text-3xl font-bold font-heading text-rose-600 mt-1 tracking-tight">
                    {stats.expiringContractsCount}
                  </p>
                </div>
                <div className="flex justify-end mt-2">
                  <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
                    <CalendarRange className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Todo/Attention Action panel */}
      {stats && (
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
              Công việc cần xử lý khẩn cấp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lịch hẹn chờ duyệt hôm nay */}
              <Link href="/admin/customers/appointments" className="flex items-center justify-between p-4 bg-amber-50/50 hover:bg-amber-50 rounded-xl border border-amber-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-ink group-hover:text-amber-800 transition-colors">
                      Lịch hẹn chờ duyệt hôm nay
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">Khách xem nhà chờ bạn xác nhận</p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm tabular-nums">
                  {stats.pendingAppointmentsToday}
                </span>
              </Link>

              {/* Tư vấn chưa phân công */}
              <Link href="/admin/customers/consultations" className="flex items-center justify-between p-4 bg-sky-50/50 hover:bg-sky-50 rounded-xl border border-sky-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-sky-100 text-sky-700">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-ink group-hover:text-sky-800 transition-colors">
                      Tư vấn chưa phân công
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">Yêu cầu từ trang public</p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-sky-700 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-sm tabular-nums">
                  {stats.unassignedConsultations}
                </span>
              </Link>

              {/* Hóa đơn quá hạn */}
              <Link href="/admin/services/invoices" className="flex items-center justify-between p-4 bg-rose-50/50 hover:bg-rose-50 rounded-xl border border-rose-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-ink group-hover:text-rose-800 transition-colors">
                      Hóa đơn quá hạn thanh toán
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">Cần nhắc nợ hoặc khóa dịch vụ</p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-sm tabular-nums">
                  {stats.overdueInvoices}
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Charts / Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Doanh thu 6 tháng */}
          <Card className="lg:col-span-8 border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-accent" />
                Biểu đồ doanh thu 6 tháng gần nhất
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {mounted && stats.revenueHistory?.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.revenueHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" stroke="hsl(var(--ink-muted))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="hsl(var(--ink-muted))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.5rem',
                          fontSize: '12px'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-2.5 bg-white border border-border rounded-lg shadow-sm space-y-1">
                                <p className="text-xs font-bold text-ink">{data.period}</p>
                                <p className="text-xs text-emerald-600 font-semibold">Doanh thu phí QL: {formatCurrency(data.amount)}</p>
                                {data.totalCollected !== undefined && (
                                  <p className="text-[10px] text-ink-muted">Tổng thu hộ: {formatCurrency(data.totalCollected)}</p>
                                )}
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
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-ink-muted text-sm">
                  Chưa có dữ liệu thanh toán hóa đơn để lập biểu đồ.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nhân viên xuất sắc */}
          <Card className="lg:col-span-4 border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
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
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-bg-subtle text-ink-muted'
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

      {/* Activity Feed and Appointments at bottom */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Appointments */}
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold font-heading text-ink">
                  Lịch xem phòng gần đây
                </CardTitle>
                <Link href="/admin/customers/appointments" className="text-xs text-accent hover:underline flex items-center font-medium">
                  Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4">
              {stats.recentAppointments.length === 0 ? (
                <div className="text-center py-6 text-ink-muted text-sm">Chưa có lịch hẹn nào</div>
              ) : (
                <div className="space-y-3 divide-y divide-border">
                  {stats.recentAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-ink text-sm">{apt.customer_name}</p>
                        <p className="text-xs text-ink-muted truncate max-w-[200px] mt-0.5">{apt.room_title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-medium text-ink tabular-nums">{apt.date} {apt.time}</p>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 uppercase border border-current ${
                          apt.status === 'confirmed'
                            ? 'bg-green-50 text-green-700'
                            : apt.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : apt.status === 'completed'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {apt.status === 'confirmed' ? 'Xác nhận' : apt.status === 'pending' ? 'Chờ duyệt' : apt.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-accent" />
                  <CardTitle className="text-base font-bold font-heading text-ink">
                    Nhật ký vận hành
                  </CardTitle>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Realtime" />
                </div>
                <Link href="/admin/system/activity-logs" className="text-xs text-accent hover:underline flex items-center font-medium">
                  Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4">
              {activityLogs.length === 0 ? (
                <div className="text-center py-6 text-ink-muted text-sm">Chưa có hoạt động nào</div>
              ) : (
                <div className="space-y-0 divide-y divide-border">
                  {activityLogs.slice(0, 6).map((log) => {
                    const ActionIcon = log.action === 'CREATE' ? PlusCircle : log.action === 'DELETE' ? Trash2 : Pencil;
                    const actionColor = log.action === 'CREATE' ? 'text-emerald-500' : log.action === 'DELETE' ? 'text-rose-500' : 'text-accent';
                    const time = new Date(log.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={log.id} className="flex items-start gap-3 py-2.5">
                        <div className={`mt-0.5 flex-shrink-0 ${actionColor}`}>
                          <ActionIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-ink truncate">{log.detail ?? log.entity_label}</p>
                          <p className="text-[10px] text-ink-muted mt-0.5">{log.user_name} · {time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
