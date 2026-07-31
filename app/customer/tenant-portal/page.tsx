'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MentionHighlightText } from '@/components/customer/MentionComponents';
import {
  LayoutDashboard, FileText, Wallet, Wrench, Sparkles,
  Clock, AlertTriangle, Bell, ChevronRight,
  Bot, CalendarDays, CreditCard, ArrowUpRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface OverviewNotification {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'warning' | 'info' | 'notice';
}

interface RecentPayment {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'unpaid';
  description: string;
}

interface ContractSummary {
  daysLeft: number;
  endDate: string;
  roomCode: string;
  suggestion: string;
}

export default function TenantPortalOverviewPage() {
  const { user, profile } = useAuth();

  const [stats, setStats] = useState({
    activeContracts: 0,
    pendingInvoices: 0,
    openRepairs: 0,
    activeServices: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [notifications, setNotifications] = useState<OverviewNotification[]>([]);
  const [contractSummary, setContractSummary] = useState<ContractSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchOverviewData() {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const [apiRes, notifsRes] = await Promise.all([
          fetch('/api/customer/tenant-portal/contracts', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then((r) => r.json()).catch(() => ({ contracts: [] })),
          supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const contracts = apiRes.contracts || [];
        const activeContracts = contracts.filter((c: any) => c.status === 'active').length;

        // Find soonest expiring active contract
        const activeWithEnd = contracts
          .filter((c: any) => c.status === 'active' && c.end_date)
          .map((c: any) => ({
            ...c,
            daysLeft: Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000),
          }))
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

        if (activeWithEnd.length > 0) {
          const soonest = activeWithEnd[0];
          const roomCode = soonest.rooms?.code || 'căn hộ';
          setContractSummary({
            daysLeft: soonest.daysLeft,
            endDate: new Date(soonest.end_date).toLocaleDateString('vi-VN'),
            roomCode,
            suggestion: soonest.daysLeft <= 30
              ? `⚠️ Hợp đồng phòng ${roomCode} sắp hết hạn sau ${soonest.daysLeft} ngày! Hãy liên hệ BQL ngay để gia hạn.`
              : `Hợp đồng phòng ${roomCode} còn ${soonest.daysLeft} ngày. ${soonest.daysLeft <= 60 ? 'Nên liên hệ BQL để gia hạn trước 30 ngày.' : 'Hợp đồng đang trong trạng thái bình thường.'}`,
          });
        } else {
          setContractSummary(null);
        }

        // Fetch invoices via secure API route (bypasses client-side RLS)
        const invApiRes = await fetch('/api/customer/tenant-portal/invoices', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json()).catch(() => ({ invoices: [] }));

        const invoices = invApiRes.invoices || [];
        const pendingInvoices = invoices.filter((i: any) => i.status === 'unpaid' || i.status === 'overdue').length;

        // Map recent payments
        const payments: RecentPayment[] = invoices.slice(0, 3).map((inv: any) => ({
          id: inv.id,
          date: inv.due_date ? new Date(inv.due_date).toLocaleDateString('vi-VN') : '',
          amount: `${Number(inv.total_amount).toLocaleString('vi-VN')}đ`,
          status: (inv.status === 'paid' ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
          description: inv.period ? `Hóa đơn T${new Date(inv.period + '-01').getMonth() + 1}/${new Date(inv.period + '-01').getFullYear()}` : 'Hóa đơn tiền phòng',
        }));
        setRecentPayments(payments);

        // Fetch open maintenance requests
        const repairsRes = await supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact' })
          .eq('created_by', user!.id)
          .in('status', ['Đang tiếp nhận', 'Đang xử lý']);
        const openRepairs = repairsRes.count || 0;

        // Fetch active building services
        const roomIds = contracts.map((c: any) => c.room_id).filter(Boolean);
        const servicesCount = await (async () => {
          if (roomIds.length === 0) return 0;
          const buildingRes = await supabase
            .from('rooms')
            .select('building_id')
            .in('id', roomIds)
            .limit(1)
            .single();
          if (!buildingRes.data?.building_id) return 0;
          const svRes = await supabase
            .from('building_services')
            .select('id', { count: 'exact' })
            .eq('building_id', buildingRes.data.building_id);
          return svRes.count || 0;
        })();

        setStats({
          activeContracts,
          pendingInvoices,
          openRepairs,
          activeServices: servicesCount,
        });

        // Process notifications
        const notifsData = notifsRes.data || [];
        const typeMap: Record<string, 'warning' | 'info' | 'notice'> = {
          contract_expiring: 'warning',
          invoice: 'warning',
          new_lead: 'info',
          appointment: 'info',
          system: 'notice',
          contract: 'notice',
        };
        setNotifications(
          notifsData.map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.body,
            date: new Date(n.created_at).toLocaleDateString('vi-VN'),
            type: typeMap[n.type] || 'notice',
          }))
        );
      } catch (err) {
        console.error('Overview fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverviewData();
  }, [user, profile]);

  const statCards = [
    { label: 'Hợp đồng hiệu lực', value: stats.activeContracts, icon: FileText, color: 'bg-emerald-500/15 text-emerald-700' },
    { label: 'Hóa đơn chờ TT', value: stats.pendingInvoices, icon: CreditCard, color: stats.pendingInvoices > 0 ? 'bg-amber-500/20 text-amber-800 font-bold' : 'bg-slate-500/10 text-slate-600' },
    { label: 'Sự cố đang xử lý', value: stats.openRepairs, icon: Wrench, color: 'bg-blue-500/15 text-blue-700' },
    { label: 'Dịch vụ tòa nhà', value: stats.activeServices, icon: Sparkles, color: 'bg-purple-500/15 text-purple-700' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7 text-amber-600" />
            Tổng quan Cổng Khách Thuê
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading ? 'Đang tải thông tin...' : `Xin chào${profile?.full_name ? `, ${profile.full_name.split(' ').slice(-1)[0]}` : ''}! Đây là tổng hợp thông tin căn hộ của bạn.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-amber-600" />}
          <Badge className="bg-amber-100 text-amber-950 border-2 border-amber-400 font-extrabold text-xs px-3 py-1 w-fit shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 mr-1 text-amber-700" />
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Badge>
        </div>
      </div>

      {/* AI Contract Expiry Banner */}
      {contractSummary && (
        <Card className={`border-2 shadow-sm ${contractSummary.daysLeft <= 30 ? 'bg-red-100/80 dark:bg-red-950/50 border-red-400/80' : 'bg-amber-100/80 dark:bg-amber-950/50 border-amber-400/80'}`}>
          <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${contractSummary.daysLeft <= 30 ? 'bg-red-500/25 border-red-400' : 'bg-amber-500/25 border-amber-400'}`}>
              <Bot className={`h-6 w-6 ${contractSummary.daysLeft <= 30 ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-extrabold flex items-center gap-1.5 ${contractSummary.daysLeft <= 30 ? 'text-red-950 dark:text-red-100' : 'text-amber-950 dark:text-amber-100'}`}>
                <Sparkles className="h-4 w-4" />
                AI Tóm tắt Hợp đồng
              </p>
              <p className={`text-xs mt-1 leading-relaxed font-medium ${contractSummary.daysLeft <= 30 ? 'text-red-900/90 dark:text-red-200' : 'text-amber-900/90 dark:text-amber-200'}`}>
                {contractSummary.suggestion}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`font-extrabold text-white text-xs px-2.5 py-1 ${contractSummary.daysLeft <= 30 ? 'bg-red-600 border-red-700' : 'bg-amber-600 border-amber-700'}`}>
                <Clock className="h-3 w-3 mr-1" />
                Còn {contractSummary.daysLeft} ngày
              </Badge>
              <Button size="sm" variant="outline" asChild className="rounded-full border-amber-500 text-amber-950 dark:text-amber-100 bg-white/80 dark:bg-amber-900/60 hover:bg-amber-200 font-bold text-xs">
                <Link href="/customer/tenant-portal/contracts" prefetch={true}>
                  Xem HĐ <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4 Thẻ Thống Kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border-subtle hover:border-amber-400/50 hover:shadow-md transition-all duration-200">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-extrabold text-ink font-mono">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" /> : stat.value}
                </div>
                <div className="text-[11px] text-ink-muted font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grid: Lịch sử Thanh toán & Thông báo BQL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lịch sử Thanh toán */}
        <Card className="border border-border-subtle">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-ink font-heading">Hóa đơn gần nhất</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-50">
              <Link href="/customer/tenant-portal/finance" prefetch={true}>
                Xem tất cả <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              </div>
            ) : recentPayments.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">Chưa có hóa đơn nào.</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-bg-subtle border border-border-subtle hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${payment.status === 'paid' ? 'bg-emerald-500/10' : 'bg-amber-500/15'}`}>
                        <CreditCard className={`h-4 w-4 ${payment.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{payment.description}</p>
                        <p className="text-[10px] text-ink-muted">{payment.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink font-mono">{payment.amount}</p>
                      <Badge variant="outline" className={`text-[9px] font-bold ${payment.status === 'paid' ? 'text-emerald-700 border-emerald-400 bg-emerald-50' : 'text-amber-800 border-amber-400 bg-amber-50'}`}>
                        {payment.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thông báo BQL */}
        <Card className="border border-border-subtle">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-ink font-heading">Thông báo Ban Quản Lý</h2>
            </div>
            {notifications.length > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-900 border-amber-400 bg-amber-50 font-bold">
                {notifications.length} thông báo
              </Badge>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-ink-muted">Chưa có thông báo mới từ Ban Quản Lý.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-xl bg-bg-subtle border border-border-subtle hover:border-amber-300/60 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        notif.type === 'warning' ? 'bg-amber-500/15' :
                        notif.type === 'info' ? 'bg-blue-500/10' : 'bg-slate-500/10'
                      }`}>
                        {notif.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-700" /> :
                         notif.type === 'info' ? <Bell className="h-3.5 w-3.5 text-blue-600" /> :
                         <Bell className="h-3.5 w-3.5 text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink">{notif.title}</p>
                        <p className="text-[10px] text-ink-muted">{notif.date}</p>
                      </div>
                    </div>
                    <div className="text-xs text-ink-muted leading-relaxed pl-8">
                      <MentionHighlightText text={notif.content} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-ink font-heading">Thao tác nhanh</h2>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Xem hóa đơn', href: '/customer/tenant-portal/finance', icon: Wallet, color: 'text-amber-600' },
              { label: 'Báo sự cố', href: '/customer/tenant-portal/maintenance', icon: Wrench, color: 'text-red-500' },
              { label: 'Dịch vụ', href: '/customer/tenant-portal/services', icon: Sparkles, color: 'text-purple-500' },
              { label: 'Hợp đồng', href: '/customer/tenant-portal/contracts', icon: FileText, color: 'text-emerald-600' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} prefetch={true}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border-subtle hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer group">
                    <Icon className={`h-5 w-5 ${item.color} flex-shrink-0`} />
                    <p className="text-xs font-bold text-ink group-hover:text-amber-800 transition-colors">{item.label}</p>
                    <ChevronRight className="h-3.5 w-3.5 text-ink-muted ml-auto" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
