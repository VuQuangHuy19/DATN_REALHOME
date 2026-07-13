'use client';

import { useState } from 'react';
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-bg-base flex">
      {/* Left Column: Login Form */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-center px-6 sm:px-12 py-12 bg-white border-r border-border-subtle">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-start mb-8">
            <img src="/logo.png" alt="RealHome Logo" className="h-16 w-auto object-contain -ml-2" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold font-heading text-ink">Đăng nhập hệ thống</h2>
            <p className="text-ink-muted text-sm mt-1">Nhập tài khoản của bạn để truy cập vào trình quản lý.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 mb-5 text-sm text-danger font-medium leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-bold text-ink uppercase tracking-wider">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-bold text-ink uppercase tracking-wider">Mật khẩu</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
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

          <div className="mt-8 pt-5 border-t border-border-subtle text-left">
            <p className="text-xs text-ink-muted leading-relaxed">
              Bạn chưa có tài khoản hoặc quên mật khẩu? Vui lòng liên hệ với Super Admin hoặc quản trị viên hệ thống của bạn để nhận sự trợ giúp.
            </p>
          </div>

          <p className="text-left text-xs text-ink-muted mt-8">
            RealHome &copy; {new Date().getFullYear()}. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>

      {/* Right Column: Premium Brand/Illustration */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-accent-900 to-indigo-950 items-center justify-center p-12 text-white overflow-hidden">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute -left-1/4 -top-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -right-1/4 -bottom-1/4 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-lg text-center space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-sm font-semibold select-none">
            <Building2 className="h-4 w-4 text-accent-500" />
            Giải pháp Quản lý Bất động sản
          </div>
          <h2 className="text-4xl text-white/80 font-extrabold font-heading leading-tight tracking-tight">
            Quản lý Bất động sản Tinh Gọn, Hiệu Quả & Hiện Đại
          </h2>
          <p className="text-white/80 leading-relaxed text-base">
            Hệ thống quản lý chuỗi phòng trọ và căn hộ dịch vụ toàn diện. Theo dõi phòng trống, quản lý hóa đơn, đặt lịch hẹn và hợp đồng thuê tự động chỉ trên một nền tảng duy nhất.
          </p>
        </div>
      </div>
    </div>
  );
}
