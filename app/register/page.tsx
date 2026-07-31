'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  Headphones,
  Gift,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    if (!agreedTerms) {
      toast.error('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra trong quá trình đăng ký');
      }

      toast.success('Đăng ký tài khoản thành công! Đang chuyển hướng sang đăng nhập...');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra trong quá trình đăng ký, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto bg-black">
      {/* Background Image with Brighter Overlay (Overlay opacity 25%) */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />

      {/* Top Left Floating Home Button (Enlarged +15%, dark hover + crisp white text) */}
      <Link
        href="/customer"
        className="absolute top-6 left-6 z-30 inline-flex items-center justify-center bg-slate-900/90 hover:bg-black text-white border border-white/30 hover:border-white/60 rounded-full px-6 py-2.5 text-sm font-extrabold shadow-xl backdrop-blur-md transition-all hover:scale-105 group"
      >
        <ArrowLeft className="h-4.5 w-4.5 mr-2 text-amber-400 group-hover:-translate-x-1 transition-transform" />
        <span className="text-white">Trang chủ</span>
      </Link>

      {/* Main Container Card */}
      <div className="relative z-10 w-[94%] sm:w-[88%] max-w-[1440px] min-h-[720px] bg-slate-900/40 border border-white/20 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 my-6">
        {/* ===== LEFT COLUMN: BRANDING PANEL (Increased size of information by 30%) ===== */}
        <div className="lg:col-span-4 bg-slate-900/85 p-7 sm:p-9 lg:p-11 flex flex-col justify-between border-r border-white/10 text-white relative">
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

          {/* Bottom Gift Card */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-950/70 border border-amber-500/40 flex items-center gap-4 shadow-md">
            <div className="h-11 w-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h5 className="text-sm font-black text-amber-300">Đăng ký ngay hôm nay</h5>
              <p className="text-xs text-slate-200 leading-normal mt-0.5">Nhận ngay tài liệu &quot;Cẩm nang mua nhà&quot;!</p>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN: FORM PANEL (Fixed icon overlapping with pl-12) ===== */}
        <div className="lg:col-span-8 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white/20 backdrop-blur-2xl border-l border-white/10 text-white">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-black font-heading text-white tracking-wide">Tạo tài khoản</h1>
            <p className="text-sm sm:text-base text-slate-200 mt-1.5 font-medium">Đăng ký để trải nghiệm các tính năng tuyệt vời</p>
            <div className="w-20 h-1.5 bg-amber-500 mx-auto rounded-full mt-3.5" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Họ và tên */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-extrabold text-slate-100">
                  Họ và tên <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                  <Input
                    id="fullName"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-12 pr-4 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-extrabold text-slate-100">
                  Số điện thoại <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                  <Input
                    id="phone"
                    placeholder="0987 654 321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-12 pr-4 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-mono font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tên đăng nhập */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-extrabold text-slate-100">
                  Tên đăng nhập <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                  <Input
                    id="username"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 pr-4 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-extrabold text-slate-100">
                  Email (Không bắt buộc)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 pr-4 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-mono font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 z-10"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-extrabold text-slate-100">
                  Xác nhận mật khẩu <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 pr-12 h-12.5 bg-white text-slate-950 placeholder:text-slate-400 text-sm sm:text-base rounded-2xl border-none shadow-md font-mono font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-center gap-2.5 pt-2">
              <Checkbox
                id="terms"
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(!!v)}
                className="data-[state=checked]:bg-amber-500 border-white/40 h-5 w-5"
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-slate-100 leading-none cursor-pointer font-semibold">
                Tôi đồng ý với{' '}
                <span className="text-amber-400 underline font-extrabold">Điều khoản sử dụng</span> và{' '}
                <span className="text-amber-400 underline font-extrabold">Chính sách bảo mật</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-orange-500/35 transition-all mt-3"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang đăng ký...
                </span>
              ) : (
                'Đăng ký tài khoản'
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <span className="relative bg-slate-900/80 px-4 text-xs uppercase font-extrabold text-slate-300 tracking-wider rounded-full py-0.5">
                HOẶC ĐĂNG KÝ VỚI
              </span>
            </div>

            {/* Social register buttons */}
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
                onClick={() => toast.info('Đăng ký qua Facebook đang được bảo trì.')}
                className="h-12.5 bg-white/95 hover:bg-white border-none text-slate-950 text-sm sm:text-base font-extrabold rounded-2xl shadow-md flex items-center justify-center gap-2.5"
              >
                <span className="text-blue-600 font-black text-lg">f</span>
                Facebook
              </Button>
            </div>

            {/* Login Link */}
            <div className="text-center pt-3">
              <p className="text-sm text-slate-200 font-medium">
                Đã có tài khoản?{' '}
                <Link href="/login" className="text-amber-400 hover:text-amber-300 font-extrabold underline text-sm sm:text-base ml-1">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
