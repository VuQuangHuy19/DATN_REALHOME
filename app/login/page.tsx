'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthContext';

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
          <h2 className="text-2xl font-bold font-heading text-ink">Đăng nhập hệ thống</h2>
          <p className="text-ink-muted text-sm mt-1.5">Nhập tài khoản của bạn để truy cập vào trình quản lý.</p>
        </div>

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
