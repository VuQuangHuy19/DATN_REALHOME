'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

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
        toast.success('Đăng nhập thành công!');
      }
    } catch (err) {
      setError('Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.');
      toast.error('Có lỗi hệ thống xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />

      {/* Top Left Floating Home Button */}
      <Link
        href="/customer"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 inline-flex items-center justify-center bg-slate-900/90 hover:bg-black text-white border border-white/30 hover:border-white/60 rounded-full px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-extrabold shadow-xl backdrop-blur-md transition-all hover:scale-105 group"
      >
        <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 mr-1.5 sm:mr-2 text-amber-400 group-hover:-translate-x-1 transition-transform" />
        <span className="text-white">Trang chủ</span>
      </Link>

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-md lg:max-w-[1440px] min-h-0 lg:min-h-[720px] bg-slate-900/40 border border-white/20 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 my-2 sm:my-6">
        {/* ===== LEFT COLUMN: BRANDING PANEL (Hidden on mobile, visible on desktop) ===== */}
        <div className="hidden lg:flex lg:col-span-4 bg-slate-900/85 p-7 sm:p-9 lg:p-11 flex-col justify-between border-r border-white/10 text-white relative">
          <div>
            <div className="mb-7">
              <Link href="/customer" title="Về trang chủ RealHome" className="inline-block hover:opacity-90 transition-opacity">
                <Logo className="text-[34px] sm:text-[38px] text-white" />
              </Link>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-4xl font-black font-heading text-white tracking-tight leading-tight mb-4">
              Tìm kiếm ngôi nhà <br />
              <span className="text-amber-400 font-black">mơ ước của bạn</span>
            </h2>
            <div className="w-16 h-1.5 bg-amber-500 rounded-full mb-6" />

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-8 font-medium">
              Nền tảng bất động sản uy tín hàng đầu, kết nối bạn với hàng ngàn căn hộ, nhà đất chất lượng trên toàn quốc.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center shrink-0 border border-white/15 shadow-sm">
                  <Building2 className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white">Kho bất động sản đa dạng</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">Hàng ngàn lựa chọn phù hợp với nhu cầu của bạn</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center shrink-0 border border-white/15 shadow-sm">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white">Thông tin minh bạch</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">Hình ảnh thực tế, pháp lý rõ ràng</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center shrink-0 border border-white/15 shadow-sm">
                  <Headphones className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white">Hỗ trợ chuyên nghiệp</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">Tư vấn tận tâm, hỗ trợ 24/7</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-950/70 border border-amber-500/40 flex items-center gap-4 shadow-md">
            <div className="h-11 w-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h5 className="text-sm font-black text-amber-300">Đăng nhập ngay hôm nay</h5>
              <p className="text-xs text-slate-200 leading-normal mt-0.5">
                Để tiếp tục hành trình tìm kiếm ngôi nhà mơ ước.
              </p>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN: FORM PANEL (Full width on mobile, 8 cols on desktop) ===== */}
        <div className="lg:col-span-8 p-5 sm:p-10 lg:p-14 flex flex-col justify-center bg-white/20 backdrop-blur-2xl border-l-0 lg:border-l border-white/10 text-white">
          <div className="mb-6 sm:mb-8 text-center pt-8 sm:pt-0">
            {/* Mobile Logo */}
            <div className="mb-3 lg:hidden flex justify-center">
              <Link href="/customer">
                <Logo className="text-[32px] text-white" />
              </Link>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-wide">Đăng nhập</h1>
            <p className="text-xs sm:text-base text-slate-200 mt-1.5 font-medium">
              Đăng nhập để trải nghiệm các tính năng tuyệt vời
            </p>
            <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-amber-500 mx-auto rounded-full mt-2.5 sm:mt-3.5" />
          </div>

          {error && (
            <div className="max-w-xl mx-auto w-full mb-5 p-4 rounded-2xl bg-red-500/25 border border-red-500/40 text-red-100 text-sm font-medium leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto w-full">
            {/* Tên đăng nhập / Email / SĐT */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-extrabold text-slate-100">
                Tên đăng nhập / Email / SĐT <span className="text-amber-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập, email hoặc SĐT"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  className={`pl-12 pr-4 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-semibold focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.username ? 'ring-2 ring-red-500' : ''
                  }`}
                />
              </div>
              {fieldErrors.username && <p className="text-xs text-red-300 font-semibold">{fieldErrors.username}</p>}
            </div>

            {/* Mật khẩu */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-extrabold text-slate-100">
                Mật khẩu <span className="text-amber-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-12 pr-12 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-mono font-semibold focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.password ? 'ring-2 ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 z-10"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                {fieldErrors.password ? (
                  <p className="text-xs text-red-300 font-semibold">{fieldErrors.password}</p>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => toast.info('Vui lòng liên hệ Quản trị viên để lấy lại mật khẩu.')}
                  className="text-xs font-extrabold text-amber-400 hover:text-amber-300 underline ml-auto"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Action Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-orange-500/35 transition-all mt-3"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập tài khoản'
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <span className="relative bg-slate-900/80 px-4 text-xs uppercase font-extrabold text-slate-300 tracking-wider rounded-full py-0.5">
                HOẶC ĐĂNG NHẬP VỚI
              </span>
            </div>

            {/* Social login buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12.5 bg-white/95 hover:bg-white border-none text-slate-950 text-sm sm:text-base font-extrabold rounded-2xl shadow-md"
              >
                <Link href="/api/auth/google" className="flex items-center justify-center gap-2.5">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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
                className="h-12.5 bg-white/95 hover:bg-white border-none text-slate-950 text-sm sm:text-base font-extrabold rounded-2xl shadow-md flex items-center justify-center gap-2.5"
              >
                <span className="text-blue-600 font-black text-lg">f</span>
                Facebook
              </Button>
            </div>

            {/* Register Link */}
            <div className="text-center pt-3 space-y-2">
              <p className="text-sm text-slate-200 font-medium">
                Chưa có tài khoản?{' '}
                <Link href="/register" className="text-amber-400 hover:text-amber-300 font-extrabold underline text-sm sm:text-base ml-1">
                  Đăng ký cá nhân
                </Link>
              </p>
              <p className="text-xs text-slate-300">
                Bạn là Chủ doanh nghiệp?{' '}
                <Link href="/setup-company" className="text-indigo-300 hover:text-indigo-200 font-bold underline ml-1">
                  Đăng ký & Thiết lập Doanh nghiệp BĐS mới →
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

