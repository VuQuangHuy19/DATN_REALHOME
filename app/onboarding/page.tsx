'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, AlertCircle, KeyRound, CheckCircle2, Building2 } from 'lucide-react';
import Link from 'next/link';

function OnboardingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="rounded-lg bg-danger/10 border border-danger/20 p-5 text-sm text-danger leading-relaxed">
        <div className="flex items-center gap-2 mb-2 font-bold font-heading">
          <AlertCircle className="h-5 w-5 text-danger" />
          Đường dẫn kích hoạt không hợp lệ
        </div>
        Mã kích hoạt tài khoản không tồn tại hoặc đã bị thay đổi. Vui lòng liên hệ với Super Admin để nhận lại lời mời.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra trong quá trình kích hoạt');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Kết nối máy chủ thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6 animate-fade">
        <div className="text-center py-6">
          <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-ink mb-2">Kích Hoạt Thành Công</h2>
          <p className="text-ink-muted text-sm leading-relaxed mb-6">
            Tài khoản quản trị của bạn đã sẵn sàng sử dụng. Hệ thống đã cập nhật mật khẩu mới và kích hoạt dịch vụ cho công ty của bạn.
          </p>
          <Button asChild className="w-full bg-accent hover:bg-accent-500 text-white font-semibold shadow-none" size="lg">
            <Link href="/login">Đăng nhập ngay</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/customer/properties">
          <Image src="/logo.png" alt="RealHome Logo" width={160} height={68} className="h-16 w-auto object-contain" />
        </Link>
      </div>

      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center gap-1.5 text-accent mb-2 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" /> Thiết lập tài khoản
        </div>
        <h2 className="text-2xl font-bold font-heading text-ink">Kích hoạt tài khoản quản trị</h2>
        <p className="text-ink-muted text-sm mt-1.5">
          Đặt mật khẩu đăng nhập cho tài khoản của bạn để hoàn tất quá trình kích hoạt.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 mb-5 text-sm text-danger font-medium leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs font-bold text-ink uppercase tracking-wider">Mật khẩu mới</Label>
          <div className="relative mt-1">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <Input
              id="password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-xs font-bold text-ink uppercase tracking-wider">Xác nhận mật khẩu</Label>
          <div className="relative mt-1">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="pl-9"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-500 text-white font-semibold shadow-none mt-2 flex items-center justify-center"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang kích hoạt...
            </>
          ) : (
            'Hoàn tất kích hoạt'
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-ink-muted mt-8">
        RealHome &copy; {new Date().getFullYear()}. Bảo lưu mọi quyền.
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-bg-subtle flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-border-subtle p-6 sm:p-8">
        <Suspense
          fallback={
            <div className="w-full text-center space-y-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
              <p className="text-sm text-ink-muted">Đang khởi tạo phiên kích hoạt...</p>
            </div>
          }
        >
          <OnboardingForm />
        </Suspense>
      </div>
    </div>
  );
}
