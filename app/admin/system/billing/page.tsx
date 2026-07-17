'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Package
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeUserCount, setActiveUserCount] = useState(0);

  // Form states
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [selectedSeats, setSelectedSeats] = useState<number>(5);
  const [selectedMonths, setSelectedMonths] = useState<number>(3);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      // 1. Get session user and company
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.company_id) return;

      const companyId = profile.company_id;

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
        setSelectedPlan(subs[0].plan as any);
        setSelectedSeats(subs[0].seats);
      }

      // 4. Fetch invoices
      const { data: invs } = await supabase
        .from('saas_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      setInvoices(invs || []);

      // 5. Fetch count of active users
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);
      setActiveUserCount(count || 0);

    } catch (err: any) {
      toast.error('Không thể tải thông tin thanh toán: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleCheckout = async () => {
    if (selectedSeats < activeUserCount) {
      toast.error(`Bạn có ${activeUserCount} tài khoản đang hoạt động. Số lượng seats đăng ký mới không được nhỏ hơn ${activeUserCount}.`);
      return;
    }

    setCheckoutLoading(true);
    try {
      // Get jwt token for api authentication
      const token = localStorage.getItem('bds_auth_token');
      
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          seats: selectedSeats,
          months: selectedMonths
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Lỗi xử lý checkout');
      }

      if (data.instantActive) {
        toast.success('Đã kích hoạt gói dịch vụ Starter thành công!');
        fetchBillingData();
      } else if (data.paymentUrl) {
        toast.success('Hóa đơn đã được tạo. Đang chuyển hướng tới trang thanh toán...');
        window.location.href = data.paymentUrl;
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

  // Calculations
  const unitPrice = PLAN_INFO[selectedPlan]?.price || 0;
  const totalPrice = unitPrice * selectedSeats * selectedMonths;

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
                        {PLAN_INFO[activeSub?.plan || company?.plan || 'starter']?.name}
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
                        <TableCell className="capitalize font-medium text-ink">{PLAN_INFO[inv.plan]?.name}</TableCell>
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
                              onClick={() => window.location.href = inv.payment_url!}
                            >
                              Thanh toán lại <ArrowRight className="h-3 w-3 ml-1" />
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
            <CardHeader className="bg-indigo-600/5 border-b border-indigo-100 p-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="h-5 w-5 fill-indigo-600/20" />
                <CardTitle className="text-base font-bold">Gia hạn / Nâng cấp gói</CardTitle>
              </div>
              <CardDescription className="text-xs text-indigo-900/60 mt-1">Chọn gói dịch vụ phù hợp để tối ưu quản lý vận hành.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Plan Selector */}
              <div className="space-y-2">
                <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">1. Chọn gói dịch vụ</span>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.entries(PLAN_INFO).map(([key, info]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedPlan(key as any)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPlan === key
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-border hover:border-indigo-200 hover:bg-bg-subtle/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-ink text-sm">{info.name}</span>
                        <span className="text-xs font-bold text-indigo-600">
                          {info.price === 0 ? 'Miễn phí' : `${info.price.toLocaleString('vi-VN')}đ/user/tháng`}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">{info.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seat Count Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">2. Số tài khoản (Seats)</span>
                  <span className="text-xs text-indigo-600 font-bold">Hiện hoạt động: {activeUserCount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={Math.max(1, activeUserCount)}
                    value={selectedSeats}
                    onChange={(e) => setSelectedSeats(Math.max(1, Number(e.target.value)))}
                    className="rounded-xl border-border focus:ring-indigo-500 font-semibold"
                  />
                  <span className="text-sm font-semibold text-ink-muted">tài khoản</span>
                </div>
                {selectedSeats < activeUserCount && (
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

              {/* Price Calculation Card */}
              <div className="border border-border rounded-2xl p-5 bg-bg-subtle space-y-4">
                <h4 className="text-xs text-ink font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-indigo-600" /> Chi tiết đơn hàng
                </h4>
                <div className="text-xs space-y-2 text-ink-muted font-medium">
                  <div className="flex justify-between">
                    <span>Đơn giá gói:</span>
                    <span className="text-ink font-semibold">{unitPrice.toLocaleString('vi-VN')}đ / user / tháng</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Số tài khoản đăng ký:</span>
                    <span className="text-ink font-semibold">{selectedSeats} seats</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời hạn:</span>
                    <span className="text-ink font-semibold">{selectedMonths} tháng</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-ink">Tổng cộng:</span>
                  <span className="text-2xl font-bold font-heading text-indigo-600">{totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                disabled={checkoutLoading || selectedSeats < activeUserCount}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
