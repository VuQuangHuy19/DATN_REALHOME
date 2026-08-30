'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  Headphones,
  Loader2,
  Check,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

const STORAGE_KEY = 'rh_remembered_username';

export default function LoginPage() {
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved username on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'Vui lòng nhập tên đăng nhập, email hoặc SĐT';
    if (!password.trim()) errors.password = 'Vui lòng nhập mật khẩu';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await signIn(username, password);
      if (signInError) {
        setError(
          signInError.includes('Invalid login credentials')
            ? 'Tên đăng nhập/email/SĐT hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
            : signInError
        );
        toast.error('Đăng nhập không thành công, vui lòng kiểm tra lại thông tin.');
      } else {
        try {
          if (rememberMe) {
            localStorage.setItem(STORAGE_KEY, username.trim());
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {}
        toast.success('Đăng nhập thành công!');
      }
    } catch {
      setError('Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.');
      toast.error('Có lỗi hệ thống xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-10 overflow-y-auto bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />

      {/* Top Left Home Button */}
      <Link
        href="/customer"
        className="absolute top-3 left-3 sm:top-6 sm:left-6 z-30 inline-flex items-center justify-center bg-slate-900/90 hover:bg-black text-white border border-white/30 hover:border-white/60 rounded-full px-3 py-1.5 sm:px-5 sm:py-2 text-xs font-extrabold shadow-xl backdrop-blur-md transition-all hover:scale-105 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-amber-400 group-hover:-translate-x-1 transition-transform" />
        <span>Trang chủ</span>
      </Link>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md lg:max-w-[1200px] bg-slate-900/40 border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 mt-12 sm:mt-6 mb-3 sm:my-6">

        {/* LEFT: Branding (desktop only) */}
        <div className="hidden lg:flex lg:col-span-4 bg-slate-900/85 p-9 lg:p-11 flex-col justify-between border-r border-white/10 text-white">
          <div>
            <div className="mb-7">
              <Link href="/customer" className="inline-block hover:opacity-90 transition-opacity">
                <Logo className="text-[38px] text-white" />
              </Link>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black font-heading text-white tracking-tight leading-tight mb-4">
              Tìm kiếm ngôi nhà <br />
              <span className="text-amber-400">mơ ước của bạn</span>
            </h2>
            <div className="w-16 h-1.5 bg-amber-500 rounded-full mb-6" />
            <p className="text-sm text-slate-200 leading-relaxed mb-8 font-medium">
              Nền tảng bất động sản uy tín hàng đầu, kết nối bạn với hàng ngàn căn hộ, nhà đất chất lượng trên toàn quốc.
            </p>
            <div className="space-y-6">
              {[
                { icon: Building2, title: 'Kho bất động sản đa dạng', desc: 'Hàng ngàn lựa chọn phù hợp với nhu cầu của bạn' },
                { icon: ShieldCheck, title: 'Thông tin minh bạch', desc: 'Hình ảnh thực tế, pháp lý rõ ràng' },
                { icon: Headphones, title: 'Hỗ trợ chuyên nghiệp', desc: 'Tư vấn tận tâm, hỗ trợ 24/7' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center shrink-0 border border-white/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">{title}</h4>
                    <p className="text-xs text-slate-300 mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badge */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-950/70 border border-amber-500/40 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h5 className="text-sm font-black text-amber-300">Đăng nhập ngay hôm nay</h5>
              <p className="text-xs text-slate-200 mt-0.5">Để tiếp tục hành trình tìm kiếm ngôi nhà mơ ước.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div className="lg:col-span-8 px-4 py-5 sm:p-8 lg:p-12 flex flex-col justify-center bg-white/20 backdrop-blur-2xl border-l-0 lg:border-l border-white/10 text-white">

          {/* Header */}
          <div className="mb-4 sm:mb-6 text-center">
            <div className="mb-2 lg:hidden flex justify-center">
              <Link href="/customer">
                <Logo className="text-[28px] sm:text-[32px] text-white" />
              </Link>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black font-heading text-white tracking-wide">Đăng nhập</h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">
              Đăng nhập để trải nghiệm các tính năng tuyệt vời
            </p>
            <div className="w-12 sm:w-16 h-1 bg-amber-500 mx-auto rounded-full mt-2" />
          </div>

          {error && (
            <div className="max-w-xl mx-auto w-full mb-3 p-3 rounded-xl bg-red-500/25 border border-red-500/40 text-red-100 text-xs sm:text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 max-w-xl mx-auto w-full">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs sm:text-sm font-extrabold text-slate-100">
                Tên đăng nhập / Email / SĐT <span className="text-amber-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500 pointer-events-none z-10" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Nhập tên đăng nhập, email hoặc SĐT"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
                  }}
                  className={`pl-10 sm:pl-12 pr-4 h-11 sm:h-12 bg-white text-slate-950 placeholder:text-slate-400 text-sm rounded-xl sm:rounded-2xl border-none shadow-md font-semibold focus:ring-2 focus:ring-amber-500 ${fieldErrors.username ? 'ring-2 ring-red-500' : ''}`}
                />
              </div>
              {fieldErrors.username && <p className="text-xs text-red-300 font-semibold">{fieldErrors.username}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs sm:text-sm font-extrabold text-slate-100">
                Mật khẩu <span className="text-amber-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-500 pointer-events-none z-10" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`pl-10 sm:pl-12 pr-11 h-11 sm:h-12 bg-white text-slate-950 placeholder:text-slate-400 text-sm rounded-xl sm:rounded-2xl border-none shadow-md font-mono font-semibold focus:ring-2 focus:ring-amber-500 ${fieldErrors.password ? 'ring-2 ring-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 z-10"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-300 font-semibold">{fieldErrors.password}</p>}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label 
                onClick={() => setRememberMe(prev => !prev)}
                className="flex items-center gap-2 cursor-pointer group select-none py-1"
              >
                <div
                  role="checkbox"
                  aria-checked={rememberMe}
                  className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                    rememberMe ? 'bg-amber-500 border-amber-500 shadow-sm' : 'bg-white/20 border-white/40 group-hover:border-white/70'
                  }`}
                >
                  {rememberMe && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">Nhớ tôi</span>
              </label>

              <button
                type="button"
                onClick={() => toast.info('Vui lòng liên hệ Quản trị viên để lấy lại mật khẩu.')}
                className="text-xs font-extrabold text-amber-400 hover:text-amber-300 underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 sm:h-13 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-xl shadow-orange-500/35 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập tài khoản'
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-1 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <span className="relative bg-slate-900/80 px-3 text-[10px] sm:text-xs uppercase font-extrabold text-slate-300 tracking-wider rounded-full py-0.5">
                HOẶC ĐĂNG NHẬP VỚI
              </span>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-10 sm:h-11 bg-white/95 hover:bg-white border-none text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl shadow-md"
              >
                <Link href="/api/auth/google" className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => toast.info('Đăng nhập qua Facebook đang được bảo trì.')}
                className="h-10 sm:h-11 bg-white/95 hover:bg-white border-none text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <span className="text-blue-600 font-black text-base leading-none">f</span>
                Facebook
              </Button>
            </div>

            {/* Register links */}
            <div className="text-center pt-0.5 space-y-1.5">
              <p className="text-xs sm:text-sm text-slate-200 font-medium">
                Chưa có tài khoản?{' '}
                <Link href="/register" className="text-amber-400 hover:text-amber-300 font-extrabold underline ml-1">
                  Đăng ký cá nhân
                </Link>
              </p>
              <p className="text-xs text-slate-300">
                Bạn là Chủ doanh nghiệp?{' '}
                <Link href="/setup-company" className="text-indigo-300 hover:text-indigo-200 font-bold underline ml-1">
                  Đăng ký &amp; Thiết lập Doanh nghiệp BĐS mới →
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
