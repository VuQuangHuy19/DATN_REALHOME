'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, CreditCard, Package,
  Shield, LogOut, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
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

  const isActive = (href: string) =>
    href === '/super-admin' ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-white shadow-sm"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col',
        'bg-accent-900 border-r border-white/8 transition-transform duration-300 ease-in-out md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
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
                onClick={() => setMobileOpen(false)}
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

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
