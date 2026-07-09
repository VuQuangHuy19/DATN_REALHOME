'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
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
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800 font-semibold">Đường dẫn không hợp lệ</AlertTitle>
        <AlertDescription className="text-red-700 text-sm mt-1">
          Mã kích hoạt tài khoản không tồn tại hoặc đã bị thay đổi. Vui lòng liên hệ với Super Admin để nhận lại lời mời.
        </AlertDescription>
      </Alert>
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
      <Card className="border-emerald-100 shadow-xl shadow-emerald-50 max-w-md w-full bg-white/80 backdrop-blur-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Kích Hoạt Thành Công</CardTitle>
          <CardDescription className="text-slate-500">
            Tài khoản quản trị của bạn đã sẵn sàng sử dụng
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-slate-600 px-6 py-2">
          Hệ thống đã cập nhật mật khẩu mới và kích hoạt dịch vụ cho công ty của bạn. Bây giờ bạn có thể đăng nhập vào hệ thống quản lý.
        </CardContent>
        <CardFooter className="pt-6">
          <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Link href="/login">Đăng nhập ngay</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl shadow-slate-100 max-w-md w-full bg-white/90 backdrop-blur-md border-slate-200/80">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-indigo-600 mb-1 font-semibold text-sm">
          <ShieldCheck className="h-4 w-4" /> Kích hoạt tài khoản
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Kích hoạt tài khoản quản trị</CardTitle>
        <CardDescription className="text-slate-500 text-sm">
          Thiết lập mật khẩu truy cập cho tài khoản của bạn để hoàn tất onboarding
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50/50">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <AlertDescription className="text-red-700 text-xs font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <div className="relative">
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
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <div className="relative">
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
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-4 pb-6">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center"
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
        </CardFooter>
      </form>
    </Card>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm text-slate-500">Đang khởi tạo phiên kích hoạt...</p>
          </Card>
        }
      >
        <OnboardingForm />
      </Suspense>
    </div>
  );
}
