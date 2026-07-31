'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, CalendarDays, FileText, Bell, TrendingUp, Phone,
  PlusCircle, ArrowRight, Clock, CheckCircle2, AlertCircle,
  Home, DollarSign, Target, Flame, UserCheck, XCircle, BarChart3,
  ExternalLink, Award, Percent, Sparkles, Trophy
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

type SalesStats = {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  consultingLeads: number;
  depositedLeads: number;
  closedLeads: number;
  lostLeads: number;
  recentLeads: any[];
  totalAppointments: number;
  todayAppointments: any[];
  upcomingAppointments: any[];
  pendingAppointments: any[];
  totalContracts: number;
  monthlyContracts: any[];
  totalDepositRevenue: number;
  recentContracts: any[];
  availableRooms: any[];
  unreadNotifications: number;
  employeeKpis?: any;
  expiringContracts?: any[];
  roomsEndingSoon?: any[];
  conversionRates?: {
    apptToClosedRate: number;
    leadToClosedRate: number;
  };
  funnelData?: any[];
  kpiTier?: string;
};

const leadStatusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  new: { label: 'Mới', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
  contacted: { label: 'Đã liên hệ', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  consulting: { label: 'Đang tư vấn', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  deposited: { label: 'Đã cọc', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  closed: { label: 'Thành công', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  lost: { label: 'Thất bại', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
};

const appointmentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  viewed: { label: 'Đã xem phòng', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Hoàn thành', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  cancelled: { label: 'Đã hủy', color: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function SalesDashboardView({ stats, saleName }: { stats: SalesStats; saleName?: string }) {
  const todayStr = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  // Personalized KPIs
  const revenueGenerated = stats.employeeKpis?.revenue_generated || 0;
  const commissionEarned = stats.employeeKpis?.commission_earned || 0;
  const successfulDeals = stats.employeeKpis?.successful_deals || 0;
  const targetRevenue = stats.employeeKpis?.target_revenue || 10000000;
  const targetPercentage = targetRevenue > 0 ? Math.min(100, Math.round((revenueGenerated / targetRevenue) * 100)) : 0;
  const kpiTier = stats.kpiTier || 'Vàng 🥇';

  const apptToClosedRate = stats.conversionRates?.apptToClosedRate || 0;
  const leadToClosedRate = stats.conversionRates?.leadToClosedRate || 0;

  // Lịch hẹn hôm nay / ngày mai
  const todayAndTomorrowAppointments = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const todayAppts = stats.todayAppointments || [];
    const tomorrowAppts = (stats.upcomingAppointments || []).filter((a: any) => a.date === tomorrowStr);
    return [...todayAppts, ...tomorrowAppts];
  }, [stats.todayAppointments, stats.upcomingAppointments]);

  // Lead cần chăm sóc hôm nay
  const leadsToFollowUp = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    return (stats.recentLeads || []).filter((lead: any) => {
      if (lead.status === 'closed' || lead.status === 'lost') return false;
      if (!lead.last_contacted_at) return true;
      return new Date(lead.last_contacted_at) < threeDaysAgo;
    });
  }, [stats.recentLeads]);

  const pipelineStages = [
    { key: 'new', label: 'Mới', count: stats.newLeads, icon: Flame },
    { key: 'contacted', label: 'Đã liên hệ', count: stats.contactedLeads, icon: Phone },
    { key: 'consulting', label: 'Đang tư vấn', count: stats.consultingLeads, icon: UserCheck },
    { key: 'deposited', label: 'Đã cọc', count: stats.depositedLeads, icon: DollarSign },
    { key: 'closed', label: 'Thành công', count: stats.closedLeads, icon: CheckCircle2 },
    { key: 'lost', label: 'Thất bại', count: stats.lostLeads, icon: XCircle },
  ];

  const defaultFunnelData = [
    { stage: 'Khách hàng', count: stats.totalLeads, fill: '#3b82f6' },
    { stage: 'Lịch hẹn', count: stats.totalAppointments, fill: '#8b5cf6' },
    { stage: 'Chốt thành công', count: successfulDeals, fill: '#10b981' },
  ];

  const chartFunnel = stats.funnelData || defaultFunnelData;

  return (
    <div className="space-y-6">
      {/* Header Banner - High Energy */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Trophy className="h-3.5 w-3.5 text-amber-300" /> Cấp độ KPI: {kpiTier}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight">
              Bật tốc doanh số, {saleName || 'Chiến binh Sale'}! 🔥
            </h1>
            <p className="text-amber-100 text-sm font-medium">
              {todayStr} · Đã chốt <span className="font-bold text-white text-base">{successfulDeals} phòng</span> trong tháng này!
            </p>
          </div>

          {/* Big Commission Counter */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex flex-col items-center justify-center min-w-[220px]">
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Hoa hồng tạm tính tháng này</span>
            <span className="text-3xl font-extrabold font-mono text-white mt-1 tabular-nums">
              {formatVND(commissionEarned)}
            </span>
            <span className="text-[11px] text-amber-200 mt-1 font-medium">
              Mục tiêu: {targetRevenue > 0 ? formatVND(targetRevenue) : 'Chưa đặt'} ({targetPercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* Hero Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold font-heading text-ink">Bảng theo dõi Tỷ lệ Chuyển đổi &amp; Chỉ số Cá nhân</h2>
        </div>
        <div className="flex items-center gap-2">
          {stats.unreadNotifications > 0 && (
            <Link href="/admin/system/notifications">
              <Button variant="outline" size="sm" className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50">
                <Bell className="h-4 w-4" />
                {stats.unreadNotifications} thông báo mới
              </Button>
            </Link>
          )}
          <Link href="/customer/properties" target="_blank">
            <Button variant="outline" size="sm" className="gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
              <ExternalLink className="h-4 w-4" />
              Xem trang khách
            </Button>
          </Link>
          <Link href="/admin/customers/leads">
            <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90 text-white font-semibold shadow-sm">
              <PlusCircle className="h-4 w-4" />
              Thêm lead mới
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid with Conversion Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Số phòng chốt */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Số phòng chốt được</p>
              <p className="text-3xl font-extrabold font-heading text-emerald-600 mt-1 tracking-tight">{successfulDeals} phòng</p>
              <p className="text-xs text-ink-muted mt-1 font-medium">Doanh số: {formatVND(revenueGenerated)}</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                <Award className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tỷ lệ chốt / Lịch hẹn */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tỷ lệ Chốt / Lịch hẹn</p>
              <p className="text-3xl font-extrabold font-heading text-indigo-600 mt-1 tracking-tight">{apptToClosedRate}%</p>
              <p className="text-xs text-ink-muted mt-1 font-medium">{successfulDeals} chốt / {stats.totalAppointments} lịch hẹn</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                <Percent className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tỷ lệ chốt / Tổng Lead */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tỷ lệ Chốt / Tổng Lead</p>
              <p className="text-3xl font-extrabold font-heading text-blue-600 mt-1 tracking-tight">{leadToClosedRate}%</p>
              <p className="text-xs text-ink-muted mt-1 font-medium">{successfulDeals} chốt / {stats.totalLeads} khách hàng</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Tiến độ */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tiến độ Chỉ tiêu Target</p>
              <p className="text-3xl font-extrabold font-heading text-amber-600 mt-1 tracking-tight">{targetPercentage}%</p>
              <div className="h-2 bg-bg-subtle rounded-full overflow-hidden border border-border mt-2">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${targetPercentage}%` }} />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                <Target className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel Chart + CRM Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Phễu Chuyển đổi Chart */}
        <Card className="lg:col-span-6 border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-accent" />
              Phễu chuyển đổi bán hàng (Funnel Analytics)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartFunnel} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="hsl(var(--ink-muted))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="stage" type="category" stroke="hsl(var(--ink-muted))" fontSize={11} tickLine={false} axisLine={false} width={130} />
                  <Tooltip formatter={(val: any) => [`${val} lượt`, 'Số lượng']} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                    {chartFunnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CRM Pipeline Stages */}
        <Card className="lg:col-span-6 border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-accent" />
                Quy trình Lead CRM ({stats.totalLeads})
              </CardTitle>
              <Link href="/admin/customers/leads" className="text-xs text-accent hover:underline flex items-center font-medium">
                Chi tiết <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pipelineStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <Link key={stage.key} href={`/admin/customers/leads?status=${stage.key}`}>
                    <div className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-border hover:border-accent/40 hover:bg-bg-subtle/50 transition-all cursor-pointer group text-center">
                      <div className="p-2.5 rounded-xl bg-bg-subtle text-ink-muted group-hover:bg-accent-soft group-hover:text-accent transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-2xl font-bold font-heading text-ink mt-1 tabular-nums">{stage.count}</span>
                      <span className="text-[11px] text-ink-muted font-medium leading-none">{stage.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments, Leads Followup, Expiring Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lịch hẹn hôm nay & tương lai */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-accent" />
                <CardTitle className="text-base font-bold font-heading text-ink">
                  Lịch hẹn hôm nay &amp; sắp tới
                </CardTitle>
              </div>
              <Link href="/admin/customers/appointments" className="text-xs text-accent hover:underline flex items-center font-medium">
                Tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {todayAndTomorrowAppointments.length === 0 ? (
              <div className="py-12 text-center text-ink-muted text-xs">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Chưa có lịch hẹn xem phòng sắp tới.
              </div>
            ) : (
              <div className="space-y-3">
                {todayAndTomorrowAppointments.map((apt: any) => {
                  const cfg = appointmentStatusConfig[apt.status] ?? { label: apt.status, color: 'bg-slate-100 text-slate-700 border border-slate-200' };
                  return (
                    <div key={apt.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-accent/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{apt.customer_name}</p>
                        <p className="text-xs text-ink-muted truncate mt-0.5">{apt.room_title}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-xs font-bold font-mono text-ink tabular-nums">{apt.date} · {apt.time}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead cần gọi chăm sóc */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                <CardTitle className="text-base font-bold font-heading text-ink">
                  Lead cần liên hệ lại
                </CardTitle>
              </div>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs rounded-full font-bold">
                {leadsToFollowUp.length} quá hạn
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {leadsToFollowUp.length === 0 ? (
              <div className="py-12 text-center text-ink-muted text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                Bạn đã chăm sóc hết toàn bộ leads được giao!
              </div>
            ) : (
              <div className="space-y-3">
                {leadsToFollowUp.slice(0, 5).map((lead: any) => {
                  const cfg = leadStatusConfig[lead.status] ?? { label: lead.status, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-rose-200 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {lead.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{lead.full_name || 'Khách hàng'}</p>
                          <p className="text-xs text-ink-muted mt-0.5">{lead.phone || 'Chưa có SĐT'}</p>
                        </div>
                      </div>
                      <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hợp đồng sắp hết hạn */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                <CardTitle className="text-base font-bold font-heading text-ink">
                  HĐ sắp hết hạn (30d)
                </CardTitle>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-bold">
                {(stats.expiringContracts || []).length} hợp đồng
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {!(stats.expiringContracts || []).length ? (
              <div className="py-12 text-center text-ink-muted text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                Không có hợp đồng nào sắp hết hạn trong 30 ngày.
              </div>
            ) : (
              <div className="space-y-3">
                {(stats.expiringContracts || []).slice(0, 5).map((contract: any) => {
                  const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={contract.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-amber-200 transition-all">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">
                          Phòng {contract.rooms?.code || contract.room_id}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5 truncate">
                          Khách: {contract.party_b_name || 'Khách hàng'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                          Còn {daysLeft} ngày
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Rooms to Pitch */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-4.5 w-4.5 text-accent" />
            <CardTitle className="text-base font-bold font-heading text-ink">
              Phòng trống có sẵn để giới thiệu cho khách
            </CardTitle>
          </div>
          <Link href="/admin/realhome/rooms" className="text-xs text-accent hover:underline flex items-center font-medium">
            Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          {stats.availableRooms?.length === 0 ? (
            <div className="py-8 text-center text-ink-muted text-sm">
              Hiện tại không có phòng trống nào sẵn sàng.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stats.availableRooms.slice(0, 5).map((room: any) => (
                <div key={room.id} className="p-4 border border-border rounded-xl hover:border-accent/40 transition-colors flex flex-col justify-between h-32 bg-bg-base/30">
                  <div>
                    <h4 className="font-bold text-sm text-ink">Phòng {room.code}</h4>
                    <p className="text-[11px] text-ink-muted truncate mt-0.5">{room.buildings?.name || '—'}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs font-bold font-mono text-accent tabular-nums">
                      {formatVND(room.price)}/th
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Trống
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
