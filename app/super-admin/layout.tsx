'use client';

import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

function SuperAdminHeader() {
  const { profile, signOut } = useAuth();
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'SA';

  return (
    <header className="h-16 bg-white border-b border-border-subtle px-6 flex items-center justify-between shadow-none">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink-muted">RealHome</span>
        <span className="text-border-subtle">/</span>
        <span className="text-sm font-semibold text-ink">Super Admin</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-ink">{profile?.full_name || 'Super Admin'}</p>
          <p className="text-xs text-ink-muted">Super Admin</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-accent-soft flex items-center justify-center">
          <span className="text-xs font-bold text-accent">{initials}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất">
          <LogOut className="h-4 w-4 text-ink-muted" />
        </Button>
      </div>
    </header>
  );
}

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Building2, CreditCard, Package } from 'lucide-react';

function SuperAdminBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/super-admin' ? pathname === href : pathname.startsWith(href);

  const tabs = [
    { label: 'Tổng quan', href: '/super-admin', icon: LayoutDashboard },
    { label: 'Công ty', href: '/super-admin/companies', icon: Building2 },
    { label: 'Gói đăng ký', href: '/super-admin/subscriptions', icon: CreditCard },
    { label: 'Gói dịch vụ', href: '/super-admin/plans', icon: Package },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-border-subtle shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex items-center justify-around h-16 px-1 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative',
              active ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
            )}
          >
            {active && (
              <span className="absolute -top-3 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-in fade-in zoom-in" />
            )}
            <Icon className={cn('h-5 w-5 mb-0.5 transition-transform', active && 'scale-110')} />
            <span className="text-[10px] tracking-tight truncate max-w-[68px] text-center">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['super_admin']}>
      <div className="flex min-h-screen bg-bg-base">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col ml-0 md:ml-64">
          <SuperAdminHeader />
          <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">{children}</main>
          <SuperAdminBottomNav />
        </div>
      </div>
    </AuthGuard>
  );
}
