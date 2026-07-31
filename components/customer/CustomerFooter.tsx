'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  QrCode,
  Send,
  ChevronDown,
  ChevronUp,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function CustomerFooter() {
  const pathname = usePathname();
  const isTenantPortal = pathname?.startsWith('/customer/tenant-portal');
  const [showBranches, setShowBranches] = useState(true);
  const [emailSub, setEmailSub] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSub.trim()) {
      toast.error('Vui lòng nhập địa chỉ email của bạn');
      return;
    }
    toast.success('Cảm ơn bạn đã đăng ký nhận tin tức bất động sản mới nhất từ RealHome!');
    setEmailSub('');
  };

  return (
    <footer className={cn(
      "w-full max-w-full overflow-x-hidden border-t border-border-subtle bg-slate-100/80 dark:bg-bg-subtle text-slate-700 dark:text-slate-300 transition-all duration-200",
      isTenantPortal && "lg:pl-64"
    )}>
      {/* ===== TẦNG 1: TOP CONTACT BAR ===== */}
      <div className="border-b border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/customer" className="flex items-center shrink-0">
            <Logo className="text-[28px] md:text-[32px]" />
          </Link>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-6 sm:gap-10 text-xs sm:text-sm">
            {/* Hotline */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">HOTLINE</span>
                <a href="tel:0857844999" className="font-extrabold text-slate-900 dark:text-white font-mono hover:text-amber-500 transition-colors">
                  0857.844.999
                </a>
              </div>
            </div>

            {/* Hỗ trợ khách hàng */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">HỖ TRỢ KHÁCH HÀNG</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">hotro.realhome.com</span>
              </div>
            </div>

            {/* Chăm sóc khách hàng */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">CHĂM SÓC KHÁCH HÀNG</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">cskh@realhome.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TẦNG 2: 4 CỘT NỘI DUNG CHÍNH ===== */}
      <div className="container mx-auto px-4 py-10 border-b border-slate-200/80 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* CỘT 1: CÔNG TY CỔ PHẦN REALHOME VIỆT NAM */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider font-heading">
              CÔNG TY CỔ PHẦN REALHOME VIỆT NAM
            </h3>
            
            <ul className="space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Tầng 1, Tòa nhà RealHome, 113 Yên Hòa, Cầu Giấy, Hà Nội</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>(024) 3562 5939 - (024) 3562 5940</span>
              </li>
            </ul>

            {/* App download block */}
            <div className="pt-2 flex items-center gap-3">
              <div className="h-16 w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center p-1 shrink-0">
                <QrCode className="h-12 w-12 text-slate-700 dark:text-slate-300" />
              </div>

              <div className="flex flex-col gap-1.5">
                <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-slate-700">
                  <span>Google Play</span>
                </button>
                <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-slate-700">
                  <span>App Store</span>
                </button>
              </div>
            </div>
          </div>

          {/* CỘT 2: LIÊN KẾT NHANH */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider font-heading">
              LIÊN KẾT NHANH
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/customer" className="hover:text-amber-500 transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/customer/properties" className="hover:text-amber-500 transition-colors">
                  Bất động sản
                </Link>
              </li>
              <li>
                <Link href="/customer/tenant-portal" className="hover:text-amber-500 transition-colors">
                  Cổng quản trị
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: DỊCH VỤ */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider font-heading">
              DỊCH VỤ
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>Mua bán bất động sản</li>
              <li>Cho thuê bất động sản</li>
              <li>Quản lý bất động sản</li>
              <li>Tư vấn đầu tư</li>
            </ul>
          </div>

          {/* CỘT 4: ĐĂNG KÝ NHẬN TIN & QUỐC GIA & NGÔN NGỮ */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider font-heading mb-3">
                ĐĂNG KÝ NHẬN TIN
              </h3>
              <form onSubmit={handleSubscribe} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={emailSub}
                  onChange={(e) => setEmailSub(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs h-10 rounded-xl"
                />
                <Button type="submit" size="icon" className="h-10 w-10 rounded-xl bg-red-600 hover:bg-red-700 text-white shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <div className="pt-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider font-heading mb-2">
                QUỐC GIA & NGÔN NGỮ
              </h3>
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span>VN  Việt Nam</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ===== TẦNG 3: KHỐI CHI NHÁNH (MẶC ĐỊNH MỞ) ===== */}
      <div className="container mx-auto px-4 py-6 border-b border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setShowBranches(!showBranches)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
        >
          {showBranches ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>Xem chi nhánh của Realhome.com.vn</span>
        </button>

        {showBranches && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-200 mb-1">Chi nhánh TP. Hồ Chí Minh</p>
              <p>Tầng 2, 3, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP HCM</p>
              <p className="mt-0.5 text-slate-500 font-mono">Hotline: 0857.844.999</p>
            </div>

            <div>
              <p className="font-bold text-slate-900 dark:text-slate-200 mb-1">Chi nhánh Đà Nẵng</p>
              <p>Tầng 9 Vĩnh Trung Plaza, 255-257 Hùng Vương, Phường Thanh Khê, Đà Nẵng</p>
              <p className="mt-0.5 text-slate-500 font-mono">Hotline: 0857.844.999</p>
            </div>

            <div>
              <p className="font-bold text-slate-900 dark:text-slate-200 mb-1">Chi nhánh Hải Phòng</p>
              <p>Phòng 502, TD Business Center, Lô 20A Lê Hồng Phong, Hải Phòng</p>
              <p className="mt-0.5 text-slate-500 font-mono">Hotline: 0857.844.999</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== TẦNG 4: BOTTOM LEGAL & COPYRIGHT BAR ===== */}
      <div className="bg-slate-200/60 dark:bg-slate-950 py-6 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Thông tin ĐKKD */}
          <div className="space-y-1 text-center lg:text-left">
            <p>Copyright © 2024 - 2026 Realhome.com.vn</p>
            <p>Giấy ĐKKD số 0104630479 do Sở KHĐT TP Hà Nội cấp lần đầu ngày 02/06/2010</p>
            <p>Người đại diện theo pháp luật: Ông Bạch Dương</p>
          </div>

          {/* Trách nhiệm sàn */}
          <div className="space-y-1 text-center lg:text-left">
            <p>Chịu trách nhiệm sàn GDTMĐT: Ông Bạch Dương</p>
            <p>Quy chế, quy định giao dịch có hiệu lực từ 08/08/2023</p>
            <p>Ghi rõ nguồn &quot;Realhome.com.vn&quot; khi phát hành lại thông tin từ website này.</p>
          </div>

          {/* Badge Bộ công thương & Social Icons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ĐÃ ĐĂNG KÝ BỘ CÔNG THƯƠNG
            </div>

            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center text-xs">
                f
              </span>
              <span className="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center text-[10px]">
                ▶
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-700 text-white font-bold text-[10px]">
                Zalo
              </span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
