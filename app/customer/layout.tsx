'use client';

import { Suspense, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { CustomerCompanyProvider } from '@/components/customer/CustomerCompanyProvider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, Search, Heart, MessageSquare, LayoutDashboard } from 'lucide-react';
import { CompareProvider } from '@/src/lib/customer/RoomCompareContext';
import { RoomComparisonDrawer } from '@/src/features/properties/components/RoomComparisonDrawer';

function MobileBottomNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  
  const navLinks = useMemo(() => {
    const base = [
      { href: '/customer', label: 'Trang chủ', icon: Home },
      { href: '/customer/properties', label: 'Tìm kiếm', icon: Search },
      { href: '/customer/favorites', label: 'Yêu thích', icon: Heart },
      { href: '/customer/request-consultation', label: 'Tư vấn', icon: MessageSquare },
    ];
    if (role === 'sales_agent') {
      base.push({ href: '/admin', label: 'CRM', icon: LayoutDashboard });
    }
    return base;
  }, [role]);

  const isActive = (href: string) => {
    if (href === '/customer') return pathname === '/customer';
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-border-subtle h-16 flex items-center justify-around z-40 pb-safe shadow-none">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full text-[10px] transition-colors",
              active ? "text-accent font-semibold" : "text-ink-muted hover:text-ink"
            )}
          >
            <Icon className={cn("h-5 w-5 mb-0.5", active ? "stroke-[2.5]" : "stroke-[2]")} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <CustomerCompanyProvider>
      <CompareProvider>
        <CustomerHeader />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <MobileBottomNav />
        <RoomComparisonDrawer />
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
