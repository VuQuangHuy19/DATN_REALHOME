'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, CreditCard, Package,
  Shield, LogOut, Menu, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Tổng quan', href: '/super-admin', icon: LayoutDashboard },
  { label: 'Công ty', href: '/super-admin/companies', icon: Building2 },
  { label: 'Gói đăng ký', href: '/super-admin/subscriptions', icon: CreditCard },
  { label: 'Gói dịch vụ', href: '/super-admin/plans', icon: Package },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateMobile = () => setIsMobile(media.matches);
    updateMobile();
    media.addEventListener('change', updateMobile);
    return () => media.removeEventListener('change', updateMobile);
  }, []);

  const isActive = (href: string) =>
    href === '/super-admin' ? pathname === href : pathname.startsWith(href);

  if (isMobile) return null;

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-accent-900 border-r border-white/8">
      {/* Brand header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#3E7CC2]/20 flex-shrink-0">
          <Shield className="h-4.5 w-4.5 text-accent-500" />
        </div>
        <div>
          <span className="text-sm font-bold text-white block leading-tight tracking-tight">Super Admin</span>
          <span className="text-[11px] text-white/50 font-medium">RealHome Platform</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-r-lg rounded-l-none',
                active
                  ? 'bg-white/10 text-white font-semibold border-l-2 border-accent-500 pl-2.5'
                  : 'text-white/60 hover:bg-white/6 hover:text-white/90 rounded-lg border-l-2 border-transparent pl-2.5'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-accent-500' : 'text-white/40')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/6 hover:text-white/80 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Về trang quản trị
        </Link>
      </div>
    </aside>
  );
}
