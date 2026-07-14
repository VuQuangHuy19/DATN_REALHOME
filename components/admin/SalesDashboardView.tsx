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
  ExternalLink
} from 'lucide-react';

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
  const targetRevenue = stats.employeeKpis?.target_revenue || 0;
  const targetPercentage = targetRevenue > 0 ? Math.round((revenueGenerated / targetRevenue) * 100) : 0;

  // Lịch hẹn hôm nay / ngày mai
  const todayAndTomorrowAppointments = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const todayAppts = stats.todayAppointments || [];
    const tomorrowAppts = (stats.upcomingAppointments || []).filter((a: any) => a.date === tomorrowStr);
    return [...todayAppts, ...tomorrowAppts];
  }, [stats.todayAppointments, stats.upcomingAppointments]);

  // Lead cần chăm sóc hôm nay (last_contacted_at > 3 ngày hoặc chưa từng liên hệ)
  const leadsToFollowUp = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    return (stats.recentLeads || []).filter((lead: any) => {
      // Bỏ qua lead đã chốt thành công hoặc thất bại
      if (lead.status === 'closed' || lead.status === 'lost') return false;
      if (!lead.last_contacted_at) return true;
      return new Date(lead.last_contacted_at) < threeDaysAgo;
    });
  }, [stats.recentLeads]);

  const pipelineStages = [
    { key: 'new', label: 'Mới', count: stats.newLeads, icon: Flame, gradient: 'from-sky-450 to-cyan-500', light: 'bg-sky-50' },
    { key: 'contacted', label: 'Đã liên hệ', count: stats.contactedLeads, icon: Phone, gradient: 'from-blue-450 to-indigo-500', light: 'bg-blue-50' },
    { key: 'consulting', label: 'Đang tư vấn', count: stats.consultingLeads, icon: UserCheck, gradient: 'from-violet-450 to-purple-500', light: 'bg-violet-50' },
    { key: 'deposited', label: 'Đã cọc', count: stats.depositedLeads, icon: DollarSign, gradient: 'from-amber-450 to-orange-500', light: 'bg-amber-50' },
    { key: 'closed', label: 'Thành công', count: stats.closedLeads, icon: CheckCircle2, gradient: 'from-emerald-450 to-green-500', light: 'bg-emerald-50' },
    { key: 'lost', label: 'Thất bại', count: stats.lostLeads, icon: XCircle, gradient: 'from-rose-450 to-red-500', light: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Xin chào, {saleName || 'Nhân viên Sale'}! 👋
          </h1>
          <p className="text-ink-muted text-sm mt-1">{todayStr} · KPI Cá Nhân &amp; CRM Pipeline</p>
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
          {/* Nút tắt nhanh 1: Xem trang khách hàng */}
          <Link href="/customer/properties" target="_blank">
            <Button variant="outline" size="sm" className="gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
              <ExternalLink className="h-4 w-4" />
              Xem trang khách hàng
            </Button>
          </Link>
          {/* Nút tắt nhanh 2: Thêm lead mới */}
          <Link href="/admin/customers/leads">
            <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90 text-white font-semibold shadow-sm">
              <PlusCircle className="h-4 w-4" />
              Thêm lead mới
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads được giao */}
        <Link href="/admin/customers/leads">
          <Card className="hover:shadow-none hover:bg-bg-subtle/50 transition-colors border-border shadow-none rounded-lg cursor-pointer group">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Leads của tôi</p>
                <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalLeads}</p>
                <p className="text-xs text-accent mt-1.5 font-medium">{stats.newLeads} lead mới giao</p>
              </div>
              <div className="flex justify-end mt-2">
                <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted group-hover:text-ink">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Lịch hẹn đã chốt */}
        <Link href="/admin/customers/appointments">
          <Card className="hover:shadow-none hover:bg-bg-subtle/50 transition-colors border-border shadow-none rounded-lg cursor-pointer group">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Lịch hẹn đã lên</p>
                <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalAppointments}</p>
                <p className="text-xs text-warn mt-1.5 font-medium">{stats.pendingAppointments.length} đang chờ duyệt</p>
              </div>
              <div className="flex justify-end mt-2">
                <div className="p-1.5 rounded-md bg-accent-soft text-accent">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Doanh thu đã tạo */}
        <Link href="/admin/contracts">
          <Card className="hover:shadow-none hover:bg-bg-subtle/50 transition-colors border-border shadow-none rounded-lg cursor-pointer group">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Doanh thu chốt cọc</p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-2 truncate tabular-nums">
                  {formatVND(revenueGenerated)}
                </p>
                <p className="text-xs text-ink-muted mt-1 font-medium">
                  Mục tiêu: {targetRevenue > 0 ? formatVND(targetRevenue) : 'Chưa đặt mục tiêu'}
                </p>
              </div>
              <div className="flex justify-end mt-2">
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* % Đạt Target */}
        <Card className="border-border shadow-none rounded-lg">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">% Hoàn thành chỉ tiêu</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">
                {targetRevenue > 0 ? `${targetPercentage}%` : '—'}
              </p>
              <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden border border-border mt-2">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${targetRevenue > 0 ? Math.min(100, targetPercentage) : 0}%` }} />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted">
                <Target className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Funnel */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-accent" />
              <CardTitle className="text-base font-bold font-heading text-ink">Phễu CRM của tôi</CardTitle>
            </div>
            <Link href="/admin/customers/leads" className="text-xs text-accent hover:underline flex items-center font-medium">
              Quản lý danh sách leads <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {pipelineStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <Link key={stage.key} href={`/admin/customers/leads?status=${stage.key}`}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-accent/40 hover:bg-bg-subtle/50 transition-all cursor-pointer group text-center">
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

      {/* Leads to contact & Appointments schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lịch hẹn hôm nay & ngày mai */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-accent" />
                <CardTitle className="text-base font-bold font-heading text-ink">
                  Lịch hẹn hôm nay &amp; ngày mai
                </CardTitle>
              </div>
              <Link href="/admin/customers/appointments" className="text-xs text-accent hover:underline flex items-center font-medium">
                Xem toàn bộ lịch <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {todayAndTomorrowAppointments.length === 0 ? (
              <div className="py-12 text-center text-ink-muted text-xs">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Không có lịch hẹn dẫn khách xem phòng hôm nay và ngày mai.
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

        {/* Lead cần chăm sóc hôm nay */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                <CardTitle className="text-base font-bold font-heading text-ink">
                  Lead cần liên hệ lại hôm nay
                </CardTitle>
              </div>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs rounded-full font-bold">
                {leadsToFollowUp.length} lead quá hạn
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {leadsToFollowUp.length === 0 ? (
              <div className="py-12 text-center text-ink-muted text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                Tuyệt vời! Bạn đã chăm sóc hết toàn bộ leads được giao.
              </div>
            ) : (
              <div className="space-y-3">
                {leadsToFollowUp.slice(0, 5).map((lead: any) => {
                  const cfg = leadStatusConfig[lead.status] ?? { label: lead.status, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
                  const daysNotContacted = lead.last_contacted_at
                    ? Math.floor((new Date().getTime() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 'Chưa từng';
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-rose-200 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {lead.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{lead.full_name || 'Khách hàng'}</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {lead.phone || 'Chưa có SĐT'} · <span className="text-rose-600 font-semibold">{daysNotContacted} ngày chưa gọi</span>
                          </p>
                        </div>
                      </div>
                      <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
                {leadsToFollowUp.length > 5 && (
                  <p className="text-xs text-ink-muted text-center pt-1">
                    và {leadsToFollowUp.length - 5} lead quá hạn chăm sóc khác
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Rooms to pitch */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-4.5 w-4.5 text-accent" />
            <CardTitle className="text-base font-bold font-heading text-ink">
              Phòng trống có sẵn để tư vấn khách
            </CardTitle>
          </div>
          <Link href="/admin/realhome/rooms" className="text-xs text-accent hover:underline flex items-center font-medium">
            Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          {stats.availableRooms?.length === 0 ? (
            <div className="py-8 text-center text-ink-muted text-sm">
              Không còn phòng trống nào trống để giới thiệu.
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
