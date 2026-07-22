'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{email?: string; password?: string}>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: {email?: string; password?: string} = {};
    if (!email.trim()) errors.email = 'Bạn cần nhập Email';
    if (!password.trim()) errors.password = 'Bạn cần nhập Mật khẩu';
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    setFieldErrors({});
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(
        error.includes('Invalid login credentials')
          ? 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
          : error
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-subtle flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-border-subtle p-6 sm:p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo className="text-[32px]" />
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold font-heading text-ink">Đăng nhập</h2>
          <p className="text-ink-muted text-sm mt-1.5">Vui lòng chọn nhóm tài khoản của bạn</p>
        </div>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="customer">Khách hàng</TabsTrigger>
            <TabsTrigger value="staff">Nhân sự / Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-4 pt-2">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-ink">Dành cho Khách hàng</h3>
              <p className="text-xs text-ink-muted mt-1">Đăng nhập để đặt lịch xem phòng, quản lý hợp đồng và theo dõi tiến độ nhanh chóng.</p>
            </div>
            
            <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-3 text-base shadow-sm hover:bg-slate-50 transition-colors border-slate-300" asChild>
              <Link href="/api/auth/google">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Tiếp tục với Google
              </Link>
            </Button>
            
            {/* Tương lai có thể thêm form đăng nhập email/sđt tại đây */}
          </TabsContent>

          <TabsContent value="staff" className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 mb-5 text-sm text-danger font-medium leading-relaxed">
                {error}
              </div>
            )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-bold text-ink uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-9 ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-bold text-ink uppercase tracking-wider">Mật khẩu <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-9 pr-10 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white font-semibold shadow-none mt-2" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

        <div className="mt-8 pt-5 border-t border-border-subtle text-center">
          <p className="text-xs text-ink-muted leading-relaxed">
            Bạn chưa có tài khoản hoặc quên mật khẩu? Vui lòng liên hệ với Super Admin hoặc quản trị viên hệ thống của bạn để nhận sự trợ giúp.
          </p>
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          RealHome &copy; {new Date().getFullYear()}. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}
