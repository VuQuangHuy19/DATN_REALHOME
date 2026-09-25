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
  Bot, CalendarDays, CreditCard, ArrowUpRight, Loader2,
  Building2, Home, CheckCircle2, RefreshCw, Zap
} from 'lucide-react';
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
  status: 'paid' | 'unpaid' | 'overdue';
  description: string;
  dueDate?: string;
}

interface ActiveApartmentInfo {
  roomCode: string;
  buildingName: string;
  buildingAddress: string;
  contractCode: string;
  daysLeft: number;
  endDate: string;
  startDate: string;
  rentalPrice: string;
}

export default function TenantPortalOverviewPage() {
  const { user, profile } = useAuth();

  const [stats, setStats] = useState({
    activeContracts: 0,
    pendingInvoices: 0,
    totalUnpaidAmount: 0,
    openRepairs: 0,
    buildingServicesCount: 0,
  });

  const [apartmentInfo, setApartmentInfo] = useState<ActiveApartmentInfo | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [notifications, setNotifications] = useState<OverviewNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Time greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const fetchOverviewData = async () => {
    if (!user) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;

      // 1. Fetch contracts & handovers
      const [apiRes, notifsRes, servicesRes] = await Promise.all([
        fetch('/api/customer/tenant-portal/contracts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json()).catch(() => ({ contracts: [] })),
        supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        fetch('/api/customer/tenant-portal/services', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json()).catch(() => ({ services: [] })),
      ]);

      const contracts = apiRes.contracts || [];
      const activeContractsCount = contracts.filter((c: any) => c.status === 'active').length;

      // Find active contract details
      const activeContracts = contracts
        .filter((c: any) => c.status === 'active' && c.end_date)
        .map((c: any) => ({
          ...c,
          daysLeft: Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000),
        }))
        .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

      if (activeContracts.length > 0) {
        const topContract = activeContracts[0];
        const roomCode = topContract.rooms?.code || 'căn hộ';
        const bldg = topContract.rooms?.buildings;

        setApartmentInfo({
          roomCode,
          buildingName: bldg?.name || 'Tòa nhà RealHome',
          buildingAddress: bldg?.address || 'Hà Nội',
          contractCode: topContract.contract_code || topContract.id?.slice(0, 8),
          daysLeft: topContract.daysLeft,
          endDate: topContract.end_date ? new Date(topContract.end_date).toLocaleDateString('vi-VN') : '',
          startDate: topContract.start_date ? new Date(topContract.start_date).toLocaleDateString('vi-VN') : '',
          rentalPrice: topContract.rental_price ? `${Number(topContract.rental_price).toLocaleString('vi-VN')}đ/tháng` : 'Chưa cập nhật',
        });
      } else {
        setApartmentInfo(null);
      }

      // 2. Fetch invoices via API
      const invApiRes = await fetch('/api/customer/tenant-portal/invoices', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((r) => r.json()).catch(() => ({ invoices: [] }));

      const invoices = invApiRes.invoices || [];
      const unpaidInvoices = invoices.filter((i: any) => i.status === 'unpaid' || i.status === 'overdue');
      const pendingInvoices = unpaidInvoices.length;
      const totalUnpaidAmount = unpaidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);

      // Map payments for list
      const payments: RecentPayment[] = invoices.slice(0, 4).map((inv: any) => ({
        id: inv.id,
        date: inv.due_date ? new Date(inv.due_date).toLocaleDateString('vi-VN') : '',
        dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('vi-VN') : undefined,
        amount: `${Number(inv.total_amount).toLocaleString('vi-VN')}đ`,
        status: (inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : 'unpaid') as any,
        description: inv.period ? `Hóa đơn phí T${new Date(inv.period + '-01').getMonth() + 1}/${new Date(inv.period + '-01').getFullYear()}` : `Hóa đơn phòng ${inv.rooms?.code || ''}`,
      }));
      setRecentPayments(payments);

      // 3. Open maintenance requests
      const repairsRes = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact' })
        .eq('created_by', user.id)
        .in('status', ['Đang tiếp nhận', 'Đang xử lý']);
      const openRepairs = repairsRes.count || 0;

      // Services count
      const buildingServicesCount = (servicesRes.services || []).length;

      setStats({
        activeContracts: activeContractsCount,
        pendingInvoices,
        totalUnpaidAmount,
        openRepairs,
        buildingServicesCount,
      });

      // 4. Notifications
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [user, profile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOverviewData();
  };

  const tenantName = profile?.full_name || user?.user_metadata?.full_name || 'Khách thuê';

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 animate-fade-in">
      {/* 1. Header & Greeting Bar (MUST have text-white for header text to avoid dark ink override) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                Cổng Khách Thuê RealHome
              </span>
              {apartmentInfo && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  P.{apartmentInfo.roomCode}
                </span>
              )}
            </div>

            {/* Explicit text-white class to override globals.css h1 color */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white font-heading">
              {getGreeting()}, <span className="text-amber-400">{tenantName}</span>!
            </h1>

            <p className="text-slate-200 text-xs sm:text-sm max-w-2xl leading-relaxed font-medium">
              {apartmentInfo
                ? `Bạn đang thuê phòng ${apartmentInfo.roomCode} tại ${apartmentInfo.buildingName}. Tổng hợp thông tin hợp đồng và hóa đơn dịch vụ mới nhất.`
                : 'Chào mừng bạn đến với hệ thống quản lý cư dân RealHome. Kiểm tra trạng thái hợp đồng và các tiện ích tòa nhà ngay bên dưới.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Badge className="bg-slate-900 text-slate-100 border border-slate-700 px-3.5 py-2 text-xs font-bold shadow-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-400" />
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 font-extrabold text-xs rounded-xl shadow-md transition-transform active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* 2. AI Contract Assistant & Status Banner (High-contrast bright amber-orange box) */}
      {apartmentInfo ? (
        <Card className="relative overflow-hidden border-2 border-amber-400 bg-amber-50/90 shadow-md rounded-2xl">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0 border border-amber-600">
                  <Bot className="h-7 w-7" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 font-heading">
                      <Sparkles className="h-4.5 w-4.5 text-amber-600" />
                      Tóm Tắt Hợp Đồng
                    </h3>
                    <Badge className="bg-amber-200 text-amber-950 border-amber-400 font-black text-[10px] uppercase">
                      P.{apartmentInfo.roomCode}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed max-w-2xl">
                    Hợp đồng phòng <span className="font-bold text-amber-900 bg-amber-200/80 px-1 py-0.5 rounded">{apartmentInfo.roomCode}</span> ({apartmentInfo.buildingName}) hiệu lực từ{' '}
                    <span className="font-bold text-slate-900">{apartmentInfo.startDate}</span> đến <span className="font-bold text-slate-900">{apartmentInfo.endDate}</span>.{' '}
                    {apartmentInfo.daysLeft <= 30 ? (
                      <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                        ⚠️ Sắp hết hạn sau {apartmentInfo.daysLeft} ngày! Hãy gia hạn ngay.
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        Trạng thái bình thường.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-amber-300">
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-slate-700 font-semibold">Thời hạn hợp đồng</span>
                  <Badge
                    className={`font-mono font-black text-xs px-3 py-1 shadow-sm ${apartmentInfo.daysLeft <= 30
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-slate-900 text-amber-400 border-slate-950'
                      }`}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Còn {apartmentInfo.daysLeft} ngày
                  </Badge>
                </div>

                <Button
                  size="sm"
                  asChild
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-105"
                >
                  <Link href="/customer/tenant-portal/contracts" prefetch={true}>
                    Xem Hợp Đồng <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Chưa chọn căn hộ chính thức</p>
                <p className="text-xs text-slate-600 font-medium">Liên hệ Ban Quản Lý nếu bạn cần cập nhật thông tin phòng thuê.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild className="rounded-xl text-xs font-bold text-slate-900">
              <Link href="/customer/tenant-portal/contracts">Tìm hiểu thêm</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 3. Stat Cards Grid (4 High Contrast Light Cards with Vibrant Accents) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hợp đồng hiệu lực */}
        <Card className="relative overflow-hidden border border-emerald-300 bg-white hover:shadow-lg transition-all duration-300 rounded-2xl group">
          <div className="h-1.5 w-full bg-emerald-500" />
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-400 font-black text-[10px]">
                Active
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : stats.activeContracts}
              </div>
              <p className="text-xs text-slate-700 font-bold mt-1 uppercase tracking-wider">Hợp đồng hiệu lực</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Hóa đơn chờ TT */}
        <Card className="relative overflow-hidden border border-amber-300 bg-white hover:shadow-lg transition-all duration-300 rounded-2xl group">
          <div className="h-1.5 w-full bg-amber-500" />
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5.5 w-5.5" />
              </div>
              {stats.pendingInvoices > 0 ? (
                <Badge className="bg-rose-600 text-white font-black text-[10px] animate-pulse">
                  {stats.pendingInvoices} Chờ TT
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-400 font-black text-[10px]">
                  Hoàn tất
                </Badge>
              )}
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-amber-600" /> : stats.pendingInvoices}
              </div>
              <p className="text-xs text-slate-700 font-bold mt-1 uppercase tracking-wider flex items-center justify-between">
                <span>Hóa đơn chờ TT</span>
                {stats.totalUnpaidAmount > 0 && (
                  <span className="font-black text-amber-700 text-xs font-mono">
                    {stats.totalUnpaidAmount.toLocaleString('vi-VN')}đ
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Sự cố đang xử lý */}
        <Card className="relative overflow-hidden border border-blue-300 bg-white hover:shadow-lg transition-all duration-300 rounded-2xl group">
          <div className="h-1.5 w-full bg-blue-500" />
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wrench className="h-5.5 w-5.5" />
              </div>
              <Badge className="bg-blue-100 text-blue-900 border border-blue-400 font-black text-[10px]">
                Hỗ trợ 24/7
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : stats.openRepairs}
              </div>
              <p className="text-xs text-slate-700 font-bold mt-1 uppercase tracking-wider">Sự cố đang xử lý</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Dịch vụ tòa nhà */}
        <Card className="relative overflow-hidden border border-purple-300 bg-white hover:shadow-lg transition-all duration-300 rounded-2xl group">
          <div className="h-1.5 w-full bg-purple-500" />
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="h-5.5 w-5.5" />
              </div>
              <Badge className="bg-purple-100 text-purple-900 border border-purple-400 font-black text-[10px]">
                Tiện ích
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-purple-600" /> : stats.buildingServicesCount}
              </div>
              <p className="text-xs text-slate-700 font-bold mt-1 uppercase tracking-wider">Dịch vụ tòa nhà</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Two Column Layout: Recent Payments & BQL Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Payments */}
        <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 font-heading">Hóa đơn gần nhất</h2>
                <p className="text-xs font-semibold text-slate-600">Danh sách phí quản lý, điện nước mới phát hành</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs font-extrabold text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-xl">
              <Link href="/customer/tenant-portal/finance" prefetch={true}>
                Tất cả <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                <span className="text-xs text-slate-600 font-medium">Đang tải hóa đơn...</span>
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="py-10 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-300">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Không có hóa đơn cần thanh toán</p>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Tất cả các khoản phí của bạn đã được thanh toán hoàn tất ✨</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${payment.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : payment.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate group-hover:text-amber-800 transition-colors">
                          {payment.description}
                        </p>
                        <p className="text-xs font-semibold text-slate-600">
                          {payment.dueDate ? `Hạn: ${payment.dueDate}` : payment.date}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900 font-mono">
                        {payment.amount}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-black mt-0.5 ${payment.status === 'paid'
                            ? 'text-emerald-900 border-emerald-400 bg-emerald-100'
                            : payment.status === 'overdue'
                              ? 'text-rose-900 border-rose-400 bg-rose-100'
                              : 'text-amber-950 border-amber-400 bg-amber-100'
                          }`}
                      >
                        {payment.status === 'paid' ? 'Đã thanh toán' : payment.status === 'overdue' ? 'Quá hạn' : 'Chờ thanh toán'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: BQL Announcements */}
        <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 font-heading">Thông báo Ban Quản Lý</h2>
                <p className="text-xs font-semibold text-slate-600">Thông tin cập nhật bảo trì, dịch vụ tòa nhà</p>
              </div>
            </div>
            {notifications.length > 0 && (
              <Badge className="bg-blue-100 text-blue-900 border border-blue-400 font-black text-[10px]">
                {notifications.length} Mới
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-xs text-slate-600 font-medium">Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto border border-blue-300">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Không có thông báo mới</p>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Ban Quản Lý chưa có thông báo chung nào vào thời điểm này.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all duration-200"
                  >
                    <div className="flex items-start gap-2.5 mb-1.5">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notif.type === 'warning'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : notif.type === 'info'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-200 text-slate-800 border border-slate-300'
                        }`}>
                        {notif.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">{notif.title}</p>
                        <p className="text-[11px] font-semibold text-slate-500">{notif.date}</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-700 font-medium leading-relaxed pl-8">
                      <MentionHighlightText text={notif.content} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Quick Actions Bar (High Contrast Cards with Bold Typography) */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-extrabold text-slate-900 font-heading">Thao tác nhanh & Tiện ích</h2>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Thanh toán hóa đơn',
                desc: 'Tra cứu & Chuyển khoản VietQR',
                href: '/customer/tenant-portal/finance',
                icon: Wallet,
                iconColor: 'bg-amber-500 text-slate-950',
              },
              {
                label: 'Báo sự cố & Sửa chữa',
                desc: 'Gửi yêu cầu bảo trì đồ dùng',
                href: '/customer/tenant-portal/maintenance',
                icon: Wrench,
                iconColor: 'bg-rose-500 text-white',
              },
              {
                label: 'Hợp đồng & Phụ lục',
                desc: 'Xem chi tiết hợp đồng thuê',
                href: '/customer/tenant-portal/contracts',
                icon: FileText,
                iconColor: 'bg-emerald-600 text-white',
              },
              {
                label: 'Thông tin căn hộ',
                desc: 'Xem danh sách thiết bị & phòng',
                href: '/customer/tenant-portal/apartments',
                icon: Home,
                iconColor: 'bg-blue-600 text-white',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} prefetch={true} className="group">
                  <div className="h-full p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className={`h-11 w-11 rounded-xl ${item.iconColor} shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5.5 w-5.5" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">
                        {item.desc}
                      </p>
                    </div>
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

