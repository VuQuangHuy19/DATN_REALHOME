'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  CreditCard,
  Shield,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  HelpCircle,
  History,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Package,
  ExternalLink,
  QrCode,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

interface Subscription {
  id: string;
  plan: string;
  seats: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
}

interface Invoice {
  id: string;
  invoice_code: string;
  amount: number;
  plan: string;
  seats: number;
  status: string;
  payment_method: string;
  created_at: string;
  payment_url?: string;
}

const PLAN_INFO: Record<string, { name: string; price: number; desc: string; color: string; bg: string }> = {
  starter: {
    name: 'Starter',
    price: 0,
    desc: 'Dành cho các đội nhóm nhỏ mới bắt đầu quản lý vận hành.',
    color: 'text-blue-600 border-blue-200',
    bg: 'bg-blue-50'
  },
  professional: {
    name: 'Professional',
    price: 150000,
    desc: 'Giải pháp tối ưu cho doanh nghiệp quản lý phòng cho thuê chuyên nghiệp.',
    color: 'text-indigo-600 border-indigo-200',
    bg: 'bg-indigo-50'
  },
  enterprise: {
    name: 'Enterprise',
    price: 300000,
    desc: 'Đầy đủ tính năng cao cấp cho các tập đoàn hoặc chuỗi căn hộ dịch vụ lớn.',
    color: 'text-violet-600 border-violet-200',
    bg: 'bg-violet-50'
  }
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeUserCount, setActiveUserCount] = useState(0);

  // Form states
  const [checkoutTab, setCheckoutTab] = useState<'renew' | 'add_seats'>('renew');
  const [plansList, setPlansList] = useState<any[]>([
    { id: 'starter', name: 'Starter', price: 500000, seats: 5, extra_seat_price: 50000, description: 'Dành cho các đội nhóm nhỏ mới bắt đầu' },
    { id: 'professional', name: 'Professional', price: 2000000, seats: 20, extra_seat_price: 100000, description: 'Giải pháp tối ưu cho doanh nghiệp' },
    { id: 'enterprise', name: 'Enterprise', price: 5000000, seats: 999, extra_seat_price: 0, description: 'Đầy đủ tính năng cao cấp cho tập đoàn lớn' },
  ]);
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [selectedSeats, setSelectedSeats] = useState<number | ''>(20);
  const [addonSeatsToAdd, setAddonSeatsToAdd] = useState<number | ''>(5);
  const [selectedMonths, setSelectedMonths] = useState<number>(3);

  // Modal Payment States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentUrl, setActivePaymentUrl] = useState('');
  const [activeInvoiceCode, setActiveInvoiceCode] = useState('');
  const [activeInvoiceId, setActiveInvoiceId] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 phút = 300 giây

  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Fetch dynamic plans configuration
      try {
        const plansRes = await fetch('/api/plans');
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          if (plansData.plans && Array.isArray(plansData.plans) && plansData.plans.length > 0) {
            setPlansList(plansData.plans);
          }
        }
      } catch (e) {
        console.error('Lỗi khi tải bảng giá từ /api/plans:', e);
      }

      // 1. Get session user and company from auth session endpoint
      const res = await fetch('/api/auth/session');
      const sessionData = await res.json();
      const companyId = sessionData.user?.company_id || sessionData.profile?.company_id;

      if (!companyId) {
        toast.error('Không tìm thấy thông tin doanh nghiệp');
        return;
      }

      // 2. Fetch company info
      const { data: comp } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      setCompany(comp);

      // 3. Fetch active subscription
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (subs && subs.length > 0) {
        setActiveSub(subs[0]);
        setSelectedPlan(subs[0].plan);
        setSelectedSeats(subs[0].seats);
      }

      // 4. Fetch invoices
      const { data: invs } = await supabase
        .from('saas_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      setInvoices(invs || []);

      // 5. Fetch count of active company staff (only count employee/staff roles: company_admin, manager, sales_agent, employee; excluding landlords)
      let activeCount = 0;
      try {
        const token = localStorage.getItem('bds_auth_token');
        const profRes = await fetch(`/api/profiles?company_id=${companyId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (profRes.ok) {
          const profList = await profRes.json();
          if (Array.isArray(profList)) {
            const activeStaff = profList.filter((p: any) =>
              p.is_active !== false &&
              ['company_admin', 'manager', 'sales_agent', 'employee'].includes(p.role)
            );
            activeCount = activeStaff.length;
          }
        }
      } catch (e) {
        console.error('Lỗi khi lấy số tài khoản nhân sự từ API:', e);
      }

      // Fallback to client query if API didn't return count
      if (activeCount === 0) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_active', true)
          .in('role', ['company_admin', 'manager', 'sales_agent', 'employee']);
        if (count && count > 0) {
          activeCount = count;
        }
      }

      setActiveUserCount(activeCount);
    } catch (err: any) {
      toast.error('Không thể tải thông tin thanh toán: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  // Tự động kiểm tra trạng thái thanh toán khi Modal đang mở (polling 3s/lần)
  useEffect(() => {
    if (!paymentModalOpen || !activeInvoiceId) return;

    const interval = setInterval(async () => {
      const { data: inv } = await supabase
        .from('saas_invoices')
        .select('status')
        .eq('id', activeInvoiceId)
        .maybeSingle();

      if (inv && inv.status === 'paid') {
        toast.success('Thanh toán thành công! Gói dịch vụ đã được kích hoạt.');
        setPaymentModalOpen(false);
        fetchBillingData();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentModalOpen, activeInvoiceId]);

  // Đếm ngược 5 phút (300s) thời gian thanh toán
  useEffect(() => {
    if (!paymentModalOpen) {
      setTimeLeft(300);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('Đã hết thời hạn thanh toán 5 phút. Vui lòng tạo lại hóa đơn!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentModalOpen]);

  const formatTimeLeft = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem('bds_auth_token');
      let payload: any = {};

      if (checkoutTab === 'add_seats') {
        const addonSeatsNum = addonSeatsToAdd === '' ? 0 : Number(addonSeatsToAdd);
        if (addonSeatsNum < 1) {
          toast.error('Vui lòng nhập số lượng seats mua thêm tối thiểu từ 1.');
          setCheckoutLoading(false);
          return;
        }
        payload = {
          checkout_type: 'add_seats',
          plan: activeSub?.plan || company?.plan || 'professional',
          seats: addonSeatsNum,
          months: selectedMonths
        };
      } else {
        const numericSeats = selectedSeats === '' ? 0 : Number(selectedSeats);
        if (numericSeats < activeUserCount) {
          toast.error(`Bạn có ${activeUserCount} tài khoản đang hoạt động. Số lượng seats đăng ký mới không được nhỏ hơn ${activeUserCount}.`);
          setCheckoutLoading(false);
          return;
        }
        payload = {
          checkout_type: 'renew',
          plan: selectedPlan,
          seats: numericSeats,
          months: selectedMonths
        };
      }

      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Lỗi xử lý checkout');
      }

      if (data.instantActive) {
        toast.success('Đã kích hoạt dịch vụ thành công!');
        fetchBillingData();
      } else if (data.paymentUrl) {
        setActivePaymentUrl(data.paymentUrl);
        setActiveInvoiceCode(data.invoiceCode || '');
        setActiveInvoiceId(data.invoiceId || '');
        setPaymentModalOpen(true);
        fetchBillingData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium border-0 px-2.5 py-0.5">Đang hoạt động</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="font-medium px-2.5 py-0.5">Đang tạm khóa</Badge>;
      case 'trial':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium border-0 px-2.5 py-0.5">Dùng thử</Badge>;
      default:
        return <Badge className="bg-slate-400 text-white font-medium border-0 px-2.5 py-0.5">{status}</Badge>;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Đã thanh toán</Badge>;
      case 'unpaid':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse">Chưa thanh toán</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Đã hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Dynamic calculations according to Plan + Add-on Seats model (Tab 1)
  const currentPlanObj = plansList.find((p) => p.id === selectedPlan) || plansList[0] || {
    name: 'Professional',
    price: 2000000,
    seats: 20,
    extra_seat_price: 100000,
  };

  const basePrice = currentPlanObj.price || 0;
  const baseSeats = currentPlanObj.seats || 5;
  const extraSeatPrice = currentPlanObj.extra_seat_price || 0;
  const numericSeats = selectedSeats === '' ? 0 : Number(selectedSeats);
  const extraSeats = Math.max(0, numericSeats - baseSeats);
  const extraPriceTotal = extraSeats * extraSeatPrice;
  const monthlyPrice = basePrice + extraPriceTotal;
  const totalPrice = monthlyPrice * selectedMonths;

  // Dynamic calculations for Tab 2 (Mua thêm Seats lẻ)
  const activePlanId = activeSub?.plan || company?.plan || 'professional';
  const activePlanObj = plansList.find((p) => p.id === activePlanId) || plansList[0] || {
    name: 'Professional',
    price: 2000000,
    seats: 20,
    extra_seat_price: 100000,
  };
  const addonUnitPrice = activePlanObj.extra_seat_price || 100000;
  const numericAddonSeats = addonSeatsToAdd === '' ? 0 : Number(addonSeatsToAdd);
  const addonMonthlyPrice = numericAddonSeats * addonUnitPrice;
  const addonTotalPrice = addonMonthlyPrice * selectedMonths;
  const currentTotalSeats = activeSub?.seats || activePlanObj.seats || 20;
  const newTotalSeatsAfterAddon = currentTotalSeats + numericAddonSeats;

  if (role === 'sales_agent') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-2xl border border-border text-center max-w-md w-full space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-ink">Không có quyền truy cập</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Trang Gói dịch vụ & Gia hạn không mở cho tài khoản Nhân viên Kinh doanh (Sale).
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-ink-muted text-sm font-medium animate-pulse">Đang tải cấu hình thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            Thanh toán & Gói dịch vụ B2B
          </h1>
          <p className="text-ink-muted text-sm mt-1">Quản lý và gia hạn gói dịch vụ SaaS cho doanh nghiệp của bạn.</p>
        </div>
        {company?.status === 'suspended' && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 max-w-md">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">Doanh nghiệp đang bị khóa (Suspended)</h4>
              <p className="text-xs text-rose-700 mt-1">Mọi thao tác ghi đã bị chặn. Vui lòng thanh toán hoặc nâng cấp gói dịch vụ để mở khóa hệ thống.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Subscription Info Card */}
          <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-border bg-bg-subtle pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-indigo-600" />
                  Gói dịch vụ hiện tại
                </CardTitle>
                {company && getStatusBadge(company.status)}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Tên doanh nghiệp</span>
                    <h3 className="text-lg font-bold text-ink mt-0.5">{company?.name || '---'}</h3>
                  </div>
                  <div>
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Gói hiện tại</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-bold capitalize text-ink">
                        {currentPlanObj?.name || activeSub?.plan || company?.plan || 'Starter'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Hạn sử dụng</span>
                    <p className="text-sm text-ink font-medium flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-4 w-4 text-ink-muted" />
                      {activeSub?.ends_at
                        ? new Date(activeSub.ends_at).toLocaleDateString('vi-VN')
                        : company?.trial_ends_at
                        ? `${new Date(company.trial_ends_at).toLocaleDateString('vi-VN')} (Hết hạn dùng thử)`
                        : 'Vô thời hạn'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 bg-bg-subtle p-5 rounded-2xl border border-border flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Số lượng chỗ (Seats)</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-bold text-ink">{activeUserCount}</span>
                        <span className="text-ink-muted text-sm">/ {activeSub?.seats || 5} active accounts</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeUserCount >= (activeSub?.seats || 5) ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, (activeUserCount / (activeSub?.seats || 5)) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-ink-muted mt-2">
                    Mỗi tài khoản nhân sự có trạng thái &quot;Hoạt động&quot; sẽ chiếm 1 chỗ (seat). Thêm nhân viên vượt hạn mức sẽ bị chặn.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing History Card */}
          <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-border pb-4 bg-bg-subtle">
              <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-indigo-600" />
                Lịch sử thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-ink-muted text-sm">Chưa có giao dịch thanh toán nào được thực hiện.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-bg-subtle/50">
                    <TableRow>
                      <TableHead>Mã hóa đơn</TableHead>
                      <TableHead>Gói</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs text-ink font-semibold">{inv.invoice_code}</TableCell>
                        <TableCell className="capitalize font-medium text-ink">{inv.plan}</TableCell>
                        <TableCell className="text-ink">{inv.seats} seats</TableCell>
                        <TableCell className="font-semibold text-ink">{inv.amount.toLocaleString('vi-VN')}đ</TableCell>
                        <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-ink-muted text-xs">
                          {new Date(inv.created_at).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.status === 'unpaid' && inv.payment_url && (
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg h-7 px-2.5"
                              onClick={() => {
                                setActivePaymentUrl(inv.payment_url!);
                                setActiveInvoiceCode(inv.invoice_code);
                                setActiveInvoiceId(inv.id);
                                setPaymentModalOpen(true);
                              }}
                            >
                              Thanh toán ngay <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Checkout Form */}
        <div className="space-y-8">
          <Card className="border-2 border-indigo-600/30 shadow-md rounded-2xl overflow-hidden bg-white">
            {/* Tab Switcher Header */}
            <div className="flex border-b border-indigo-100 bg-indigo-50/50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setCheckoutTab('renew')}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  checkoutTab === 'renew'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-white/60'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">1. Gia hạn gói</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckoutTab('add_seats')}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  checkoutTab === 'add_seats'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-white/60'
                }`}
              >
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">2. Mua thêm Seats</span>
              </button>
            </div>

            <CardContent className="p-6 space-y-6">
              {checkoutTab === 'add_seats' ? (
                /* TAB 2: MUA THÊM SEATS LẺ CHO GÓI ĐANG DÙNG */
                <div className="space-y-6">
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-ink-muted font-medium">Gói đang dùng:</span>
                      <span className="font-bold text-indigo-700 uppercase bg-indigo-100 px-2 py-0.5 rounded-md">
                        {activePlanObj.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-ink-muted font-medium">Hạn mức hiện tại:</span>
                      <span className="font-bold text-ink font-mono">{currentTotalSeats} seats</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-indigo-200/60">
                      <span className="text-ink-muted font-medium">Đơn giá 1 seat lẻ:</span>
                      <span className="font-bold text-indigo-600 font-mono whitespace-nowrap">{addonUnitPrice.toLocaleString('vi-VN')}đ/seat/tháng</span>
                    </div>
                  </div>

                  {/* Input số seats mua thêm */}
                  <div className="space-y-2">
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Số lượng Seats mua thêm</span>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={addonSeatsToAdd}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setAddonSeatsToAdd('');
                          } else {
                            setAddonSeatsToAdd(parseInt(val, 10) || 0);
                          }
                        }}
                        onBlur={() => {
                          if (addonSeatsToAdd === '' || Number(addonSeatsToAdd) < 1) {
                            setAddonSeatsToAdd(1);
                          }
                        }}
                        className="rounded-xl border-border focus:ring-indigo-500 font-semibold"
                        placeholder="Số seats mua thêm (ví dụ: 10)"
                      />
                      <span className="text-sm font-semibold text-ink-muted whitespace-nowrap">seats lẻ</span>
                    </div>
                  </div>

                  {/* Months Selector */}
                  <div className="space-y-2">
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Thời gian mua thêm</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 3, 6, 12].map((m) => (
                        <Button
                          key={m}
                          variant={selectedMonths === m ? 'default' : 'outline'}
                          onClick={() => setSelectedMonths(m)}
                          className={`rounded-xl text-xs font-semibold ${
                            selectedMonths === m
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'border-border text-ink-muted hover:bg-bg-subtle'
                          }`}
                        >
                          {m} T
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Price Calculation Card Tab 2 */}
                  <div className="border border-border rounded-2xl p-4 bg-bg-subtle space-y-3">
                    <h4 className="text-xs text-ink font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-indigo-600 flex-shrink-0" /> Chi tiết đơn hàng mua seats
                    </h4>
                    <div className="text-xs space-y-2 text-ink-muted font-medium">
                      <div className="flex justify-between items-center">
                        <span className="text-ink-muted">Gói áp dụng:</span>
                        <span className="text-ink font-semibold">{activePlanObj.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-muted">Đơn giá seat mua thêm:</span>
                        <span className="text-ink font-semibold font-mono whitespace-nowrap">{addonUnitPrice.toLocaleString('vi-VN')}đ/seat/tháng</span>
                      </div>
                      <div className="flex justify-between items-center text-indigo-600 font-semibold">
                        <span>Số seats chọn mua thêm:</span>
                        <span className="font-mono whitespace-nowrap">+{numericAddonSeats} seats</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-muted">Hạn mức sau kích hoạt:</span>
                        <span className="text-emerald-600 font-bold font-mono whitespace-nowrap">{currentTotalSeats} ➔ {newTotalSeatsAfterAddon} seats</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <span className="text-ink-muted">Phí mua thêm 1 tháng:</span>
                        <span className="text-ink font-bold font-mono whitespace-nowrap">{addonMonthlyPrice.toLocaleString('vi-VN')}đ/tháng</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-muted">Thời hạn mua thêm:</span>
                        <span className="text-ink font-semibold whitespace-nowrap">{selectedMonths} tháng</span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-ink uppercase tracking-wider whitespace-nowrap">Tổng thanh toán:</span>
                      <span className="text-xl font-bold font-mono text-indigo-600 whitespace-nowrap">{addonTotalPrice.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    disabled={checkoutLoading || numericAddonSeats < 1}
                  >
                    {checkoutLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Thanh toán Mua thêm Seats
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                /* TAB 1: GIA HẠN / ĐỔI GÓI CHÍNH */
                <div className="space-y-6">
                  {/* Plan Selector */}
                  <div className="space-y-2">
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">1. Chọn gói dịch vụ</span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {plansList.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlan(plan.id);
                            if (selectedSeats < (plan.seats || 1)) {
                              setSelectedSeats(plan.seats || 1);
                            }
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedPlan === plan.id
                              ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                              : 'border-border hover:border-indigo-200 hover:bg-bg-subtle/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-ink text-sm">{plan.name}</span>
                            <span className="text-xs font-bold text-indigo-600 whitespace-nowrap">
                              {plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString('vi-VN')}đ/tháng`}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                            Bao gồm <strong>{plan.seats >= 999 ? 'Không giới hạn' : `${plan.seats} seats`}</strong>
                            {plan.extra_seat_price > 0 && ` (Mua thêm: ${plan.extra_seat_price.toLocaleString('vi-VN')}đ/seat/tháng)`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seat Count Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">2. Số tài khoản (Seats)</span>
                      <span className="text-xs text-indigo-600 font-bold whitespace-nowrap">Hiện hoạt động: {activeUserCount}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={selectedSeats}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setSelectedSeats('');
                          } else {
                            setSelectedSeats(parseInt(val, 10) || 0);
                          }
                        }}
                        onBlur={() => {
                          if (selectedSeats === '' || Number(selectedSeats) < 1) {
                            setSelectedSeats(Math.max(1, activeUserCount));
                          }
                        }}
                        className="rounded-xl border-border focus:ring-indigo-500 font-semibold"
                      />
                      <span className="text-sm font-semibold text-ink-muted whitespace-nowrap">tài khoản</span>
                    </div>
                    {numericSeats < activeUserCount && (
                      <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        Không được nhỏ hơn {activeUserCount} tài khoản hiện đang active.
                      </p>
                    )}
                  </div>

                  {/* Months Selector */}
                  <div className="space-y-2">
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">3. Thời gian gia hạn</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 3, 6, 12].map((m) => (
                        <Button
                          key={m}
                          variant={selectedMonths === m ? 'default' : 'outline'}
                          onClick={() => setSelectedMonths(m)}
                          className={`rounded-xl text-xs font-semibold ${
                            selectedMonths === m
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'border-border text-ink-muted hover:bg-bg-subtle'
                          }`}
                        >
                          {m} T
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Price Calculation Card Tab 1 */}
                  <div className="border border-border rounded-2xl p-4 bg-bg-subtle space-y-3">
                    <h4 className="text-xs text-ink font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-indigo-600 flex-shrink-0" /> Chi tiết đơn hàng
                    </h4>
                    <div className="text-xs space-y-2 text-ink-muted font-medium">
                      <div className="flex justify-between items-center">
                        <span className="text-ink-muted">Gói cơ bản ({currentPlanObj.name}):</span>
                        <span className="text-ink font-semibold font-mono whitespace-nowrap">{basePrice.toLocaleString('vi-VN')}đ/tháng</span>
                      </div>

                      {extraSeats > 0 ? (
                        <div className="flex justify-between items-center text-indigo-600 font-semibold">
                          <span>Mua thêm ({extraSeats} seats lẻ):</span>
                          <span className="font-mono whitespace-nowrap">+{extraPriceTotal.toLocaleString('vi-VN')}đ/tháng</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-emerald-600 font-medium">
                          <span>Tài khoản thuộc gói gốc:</span>
                          <span className="font-mono whitespace-nowrap">0đ (Đủ {selectedSeats}/{baseSeats} seats)</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <span className="text-ink-muted">Cước phí 1 tháng:</span>
                        <span className="text-ink font-bold font-mono whitespace-nowrap">{monthlyPrice.toLocaleString('vi-VN')}đ/tháng</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-muted">Thời hạn gia hạn:</span>
                        <span className="text-ink font-semibold whitespace-nowrap">{selectedMonths} tháng</span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-ink uppercase tracking-wider whitespace-nowrap">Tổng thanh toán:</span>
                      <span className="text-xl font-bold font-mono text-indigo-600 whitespace-nowrap">{totalPrice.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    disabled={checkoutLoading || numericSeats < activeUserCount || numericSeats < 1}
                  >
                    {checkoutLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Tiến hành thanh toán
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Popup Mã QR VietQR PayOS Trực Tiếp Trên Trang */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-4xl w-[92vw] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white [&>button]:text-white [&>button]:top-5 [&>button]:right-5">
          <DialogHeader className="p-4 px-6 border-b border-slate-800 bg-slate-900 text-white flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Thanh Toán VietQR Qua Cổng PayOS</DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Mã hóa đơn: <span className="font-mono font-bold text-amber-400">{activeInvoiceCode}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pr-10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                timeLeft <= 60
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                <Clock className="h-3.5 w-3.5" />
                {timeLeft > 0 ? `Thời gian còn lại: ${formatTimeLeft(timeLeft)}` : 'Đã hết hạn'}
              </span>

              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang chờ chuyển khoản
              </span>
            </div>
          </DialogHeader>

          <div className="p-2 sm:p-4 bg-slate-100 flex flex-col items-center justify-center min-h-[740px]">
            {activePaymentUrl ? (
              <iframe
                src={activePaymentUrl}
                className="w-full h-[740px] max-h-[82vh] rounded-2xl border border-slate-200 shadow-sm bg-white"
                title="PayOS VietQR Checkout"
              />
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Đang tải mã QR thanh toán PayOS...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
