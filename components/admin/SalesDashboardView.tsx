'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, CalendarDays, FileText, Bell, TrendingUp, Phone,
  PlusCircle, ArrowRight, Clock, CheckCircle2, AlertCircle,
  Home, DollarSign, Target, Flame, UserCheck, XCircle, BarChart3,
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

export function SalesDashboardView({ stats, saleName }: { stats: SalesStats; saleName?: string }) {
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const conversionRate = stats.totalLeads > 0
    ? Math.round(((stats.depositedLeads + stats.closedLeads) / stats.totalLeads) * 100)
    : 0;

  const pipelineStages = [
    { key: 'new', label: 'Mới', count: stats.newLeads, icon: Flame, gradient: 'from-sky-400 to-cyan-500', light: 'bg-sky-50' },
    { key: 'contacted', label: 'Đã liên hệ', count: stats.contactedLeads, icon: Phone, gradient: 'from-blue-400 to-indigo-500', light: 'bg-blue-50' },
    { key: 'consulting', label: 'Đang tư vấn', count: stats.consultingLeads, icon: UserCheck, gradient: 'from-violet-400 to-purple-500', light: 'bg-violet-50' },
    { key: 'deposited', label: 'Đã cọc', count: stats.depositedLeads, icon: DollarSign, gradient: 'from-amber-400 to-orange-500', light: 'bg-amber-50' },
    { key: 'closed', label: 'Thành công', count: stats.closedLeads, icon: CheckCircle2, gradient: 'from-emerald-400 to-green-500', light: 'bg-emerald-50' },
    { key: 'lost', label: 'Thất bại', count: stats.lostLeads, icon: XCircle, gradient: 'from-rose-400 to-red-500', light: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Xin chào, {saleName || 'Sale'}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">{today}</p>
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
          <Link href="/admin/customers/leads">
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <PlusCircle className="h-4 w-4" />
              Thêm Lead mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <Link href="/admin/customers/leads">
          <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tổng Leads</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalLeads}</p>
                  <p className="text-xs text-indigo-600 mt-1 font-medium">{stats.newLeads} lead mới</p>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Today Appointments */}
        <Link href="/admin/appointments">
          <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Lịch hẹn hôm nay</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.todayAppointments.length}</p>
                  <p className="text-xs text-orange-600 mt-1 font-medium">{stats.pendingAppointments.length} chờ duyệt</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50 group-hover:bg-orange-100 transition-colors">
                  <CalendarDays className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Deposits this month */}
        <Link href="/admin/contracts">
          <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Cọc trong tháng</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.monthlyContracts.length}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    {stats.totalDepositRevenue > 0 ? `${(stats.totalDepositRevenue / 1_000_000).toFixed(1)}M đ` : '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Conversion Rate */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tỷ lệ chuyển đổi</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{conversionRate}%</p>
                <p className="text-xs text-slate-400 mt-1">Leads → Cọc/Thành công</p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50">
                <Target className="h-5 w-5 text-violet-600" />
              </div>
            </div>
            {/* Mini progress bar */}
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500"
                style={{ width: `${conversionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Pipeline */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base text-slate-800">Phễu CRM – Leads của tôi</CardTitle>
            </div>
            <Link href="/admin/customers/leads" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Quản lý leads <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {pipelineStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <Link key={stage.key} href={`/admin/customers/leads?status=${stage.key}`}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stage.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-slate-800">{stage.count}</span>
                    <span className="text-xs text-slate-500 text-center leading-tight">{stage.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today & Upcoming Appointments */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base text-slate-800">Lịch hẹn</CardTitle>
                {stats.todayAppointments.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </div>
              <Link href="/admin/appointments" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.todayAppointments.length === 0 && stats.upcomingAppointments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Không có lịch hẹn nào
              </div>
            ) : (
              <>
                {stats.todayAppointments.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Hôm nay ({stats.todayAppointments.length})
                    </p>
                    <div className="space-y-2">
                      {stats.todayAppointments.map((apt: any) => {
                        const cfg = appointmentStatusConfig[apt.status] ?? { label: apt.status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
                        return (
                          <div key={apt.id} className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{apt.customer_name}</p>
                              <p className="text-xs text-slate-400 truncate">{apt.room_title}</p>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              <p className="text-xs font-bold text-orange-700">{apt.time}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs border ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {stats.upcomingAppointments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3" /> Sắp tới
                    </p>
                    <div className="space-y-2">
                      {stats.upcomingAppointments.map((apt: any) => {
                        const cfg = appointmentStatusConfig[apt.status] ?? { label: apt.status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
                        return (
                          <div key={apt.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{apt.customer_name}</p>
                              <p className="text-xs text-slate-400 truncate">{apt.room_title}</p>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              <p className="text-xs text-slate-600">{apt.date} · {apt.time}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs border ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-3">
              <Link href="/admin/appointments">
                <Button size="sm" variant="outline" className="w-full gap-2 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Thêm lịch hẹn mới
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base text-slate-800">Leads gần đây</CardTitle>
              </div>
              <Link href="/admin/customers/leads" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentLeads.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Chưa có lead nào được giao
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentLeads.map((lead: any) => {
                  const cfg = leadStatusConfig[lead.status] ?? { label: lead.status, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
                  return (
                    <Link key={lead.id} href={`/admin/customers/leads`}>
                      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {lead.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{lead.full_name || 'Chưa có tên'}</p>
                            <p className="text-xs text-slate-400">{lead.phone || '—'}</p>
                          </div>
                        </div>
                        <span className={`ml-2 flex-shrink-0 text-xs px-2 py-1 rounded-lg border font-medium ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="pt-3">
              <Link href="/admin/customers/leads">
                <Button size="sm" variant="outline" className="w-full gap-2 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Thêm Lead mới
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deposit Contracts */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base text-slate-800">Hợp đồng cọc gần đây</CardTitle>
              </div>
              <Link href="/admin/contracts" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentContracts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Chưa có hợp đồng cọc nào
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentContracts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.party_b_name}</p>
                      <p className="text-xs text-slate-400">{c.contract_code}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-600">
                        {(c.deposit_amount / 1_000_000).toFixed(1)}M đ
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3">
              <Link href="/admin/contracts/create">
                <Button size="sm" variant="outline" className="w-full gap-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Soạn hợp đồng cọc
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Available Rooms to pitch */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base text-slate-800">Phòng trống có thể tư vấn</CardTitle>
              </div>
              <Link href="/admin/realhome/rooms" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.availableRooms.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Home className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Hiện không có phòng trống
              </div>
            ) : (
              <div className="space-y-2">
                {stats.availableRooms.slice(0, 5).map((room: any) => (
                  <div key={room.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Phòng {room.code}</p>
                      <p className="text-xs text-slate-400 truncate">{room.buildings?.name || '—'}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-bold text-indigo-600">
                        {(room.price / 1_000_000).toFixed(1)}M/th
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Còn trống
                      </span>
                    </div>
                  </div>
                ))}
                {stats.availableRooms.length > 5 && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    và {stats.availableRooms.length - 5} phòng trống khác
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
