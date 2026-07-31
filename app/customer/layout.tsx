'use client';

import { Suspense, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { CustomerCompanyProvider } from '@/components/customer/CustomerCompanyProvider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, Search, Heart, MessageSquare, LayoutDashboard, Calendar } from 'lucide-react';
import { CompareProvider } from '@/src/lib/customer/RoomCompareContext';
import { RoomComparisonDrawer } from '@/src/features/properties/components/RoomComparisonDrawer';
import { FloatingConsultation } from '@/components/customer/FloatingConsultation';
import { AIChatWidget } from '@/components/ui/AIChatWidget';

function MobileBottomNav() {
  const pathname = usePathname();
  const { user, role } = useAuth();
  
  const navLinks = useMemo(() => {
    const base = [
      { href: '/customer', label: 'Trang chủ', icon: Home },
      { href: '/customer/properties', label: 'Tìm kiếm', icon: Search },
      { href: '/customer/favorites', label: 'Yêu thích', icon: Heart },
      { href: '/customer/appointments/track', label: 'Lịch hẹn', icon: Calendar },
    ];
    // Nút Menu CHỈ xuất hiện khi khách ĐÃ ĐĂNG NHẬP (luôn chuyển hướng đúng trang quản trị theo role)
    if (user) {
      const r = role as string | null | undefined;
      const menuHref =
        r === 'super_admin' ? '/super-admin' :
        r === 'landlord' ? '/landlord' :
        (r === 'customer' || r === 'tenant') ? '/customer/tenant-portal' :
        '/admin';
      base.push({ href: menuHref, label: 'Menu', icon: LayoutDashboard });
    }
    return base;
  }, [user, role]);

  const isActive = (href: string) => {
    if (href === '/customer') return pathname === '/customer';
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border-subtle h-16 flex items-center justify-between z-40 pb-safe shadow-lg px-1">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={true}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full text-[10px] transition-all duration-200",
              active
                ? "text-blue-600 dark:text-blue-400 font-extrabold scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            )}
          >
            <Icon className={cn("h-5 w-5 mb-0.5 transition-transform", active ? "stroke-[2.5] text-blue-600 dark:text-blue-400" : "stroke-[2]")} />
            <span className="truncate max-w-[55px] text-center">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTenantPortal = pathname?.startsWith('/customer/tenant-portal');

  if (isTenantPortal) {
    return (
      <CustomerCompanyProvider>
        <CompareProvider>
          {children}
        </CompareProvider>
      </CustomerCompanyProvider>
    );
  }

  return (
    <CustomerCompanyProvider>
      <CompareProvider>
        <CustomerHeader />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <MobileBottomNav />
        <RoomComparisonDrawer />
        <FloatingConsultation />
        <AIChatWidget role="tenant" />
        <CustomerFooter />
      </CompareProvider>
    </CustomerCompanyProvider>
  );
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={
        <div className="flex min-h-screen flex-col">
          <CustomerHeader />
          <main className="flex-1 flex items-center justify-center text-slate-400 text-sm">Đang tải...</main>
          <CustomerFooter />
        </div>
      }>
        <CustomerShell>{children}</CustomerShell>
      </Suspense>
    </div>
  );
}
