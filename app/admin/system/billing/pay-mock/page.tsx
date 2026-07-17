'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

function PayMockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshSession } = useAuth();
  
  const invoiceId = searchParams.get('invoice_id');
  const orderCode = searchParams.get('order_code');
  const amount = Number(searchParams.get('amount') || '0');
  const plan = searchParams.get('plan') || 'professional';
  const seats = searchParams.get('seats') || '5';
  const months = searchParams.get('months') || '1';

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSimulatePayment = async (success: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscriptions/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isMock: true,
          orderCode: Number(orderCode),
          status: success ? 'PAID' : 'CANCELLED',
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Lỗi xử lý phản hồi từ cổng thanh toán');
      }

      if (success) {
        await refreshSession();
      }

      setStatus(success ? 'success' : 'failed');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const planLabels: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise'
  };

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-6">
        <div className="p-8 bg-white border border-border rounded-2xl shadow-xl space-y-6 flex flex-col items-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
          <div>
            <h2 className="text-2xl font-bold text-ink">Thanh toán thành công!</h2>
            <p className="text-sm text-ink-muted mt-2">Hóa đơn của bạn đã được thanh toán và gói dịch vụ đã được kích hoạt thành công.</p>
          </div>
          <div className="w-full bg-bg-subtle p-4 rounded-xl space-y-2 text-left text-sm font-mono border border-border">
            <p><span className="text-ink-muted">Mã hóa đơn:</span> {orderCode}</p>
            <p><span className="text-ink-muted">Số tiền:</span> {amount.toLocaleString('vi-VN')}đ</p>
            <p><span className="text-ink-muted">Gói kích hoạt:</span> {planLabels[plan]} ({seats} seats)</p>
          </div>
          <Button onClick={() => router.push('/admin/system/billing')} className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl">
            Quay về Cài đặt thanh toán
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-6">
        <div className="p-8 bg-white border border-border rounded-2xl shadow-xl space-y-6 flex flex-col items-center">
          <XCircle className="h-16 w-16 text-red-500" />
          <div>
            <h2 className="text-2xl font-bold text-ink">Đã hủy thanh toán</h2>
            <p className="text-sm text-ink-muted mt-2">Giao dịch thanh toán đã bị hủy bởi người dùng.</p>
          </div>
          <Button onClick={() => router.push('/admin/system/billing')} className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl">
            Quay về Cài đặt thanh toán
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-8">
      <Card className="border border-border shadow-xl rounded-2xl bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white text-center">
          <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-90" />
          <CardTitle className="text-xl font-heading font-bold text-white">Giả lập thanh toán PayOS B2B SaaS</CardTitle>
          <CardDescription className="text-indigo-100 text-xs mt-1">Hệ thống sandbox mô phỏng thanh toán hóa đơn gia hạn phần mềm</CardDescription>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="border border-border rounded-xl p-4 bg-bg-subtle divide-y divide-border text-sm space-y-3 font-mono">
            <div className="flex justify-between pb-3">
              <span className="text-ink-muted">Sản phẩm:</span>
              <span className="font-semibold text-ink">Gia hạn RealHome Business</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-ink-muted">Gói dịch vụ:</span>
              <Badge className="bg-accent-soft text-accent border-0 font-sans">{planLabels[plan]} ({seats} chỗ)</Badge>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-ink-muted">Thời hạn:</span>
              <span className="text-ink font-semibold">{months} tháng</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-ink-muted">Mã đơn hàng:</span>
              <span className="text-ink font-semibold">{orderCode}</span>
            </div>
            <div className="flex justify-between pt-3 text-base">
              <span className="text-ink font-bold font-sans">Tổng tiền cần trả:</span>
              <span className="text-accent font-bold font-heading text-lg">{amount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => handleSimulatePayment(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Giả lập thanh toán THÀNH CÔNG (Success)
            </Button>
            
            <Button
              onClick={() => handleSimulatePayment(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              disabled={loading}
            >
              Giả lập thanh toán THẤT BẠI / HỦY (Cancel)
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/admin/system/billing')}
              className="w-full border-border text-ink-muted hover:bg-bg-subtle py-2.5 rounded-xl flex items-center justify-center gap-1.5"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayMockPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
      </div>
    }>
      <PayMockContent />
    </Suspense>
  );
}
