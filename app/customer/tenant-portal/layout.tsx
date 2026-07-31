'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Home, FileText, Wallet, Wrench, Sparkles,
  Settings, Menu, ChevronLeft, LogOut, User, X, Grid
} from 'lucide-react';
import { AIChatWidget } from '@/components/ui/AIChatWidget';

const SIDEBAR_LINKS = [
  { href: '/customer/tenant-portal', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/customer/tenant-portal/apartments', label: 'Căn hộ của tôi', icon: Home },
  { href: '/customer/tenant-portal/contracts', label: 'Hợp đồng', icon: FileText },
  { href: '/customer/tenant-portal/finance', label: 'Tài chính & Ví', icon: Wallet },
  { href: '/customer/tenant-portal/maintenance', label: 'Bảo trì & Bàn giao', icon: Wrench },
  { href: '/customer/tenant-portal/services', label: 'Dịch vụ bổ sung', icon: Sparkles },
  { href: '/customer/tenant-portal/settings', label: 'Cài đặt & Hồ sơ', icon: Settings },
];

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { user, profile, signOut } = useAuth();
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Khách thuê';

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Top Logo Container - height h-16 (64px) matching top header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 flex-shrink-0 bg-slate-950">
        <Link href="/customer/properties" prefetch={true} onClick={onNavigate} title="Về trang chủ RealHome" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Logo className="text-[22px]" variant="dark" />
        </Link>
      </div>

      {/* User Info Header */}
      <div className="px-5 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Tài khoản khách</p>
            <p className="text-sm font-extrabold text-white truncate">
              {userName}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {profile?.email || user?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {SIDEBAR_LINKS.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href) && pathname !== '/customer/tenant-portal';
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 flex-shrink-0', isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300')} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 space-y-1">
        <Link
          href="/customer/properties"
          prefetch={true}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Về trang chủ</span>
        </Link>
        <button
          onClick={() => { signOut(); onNavigate?.(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-all font-medium w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

function DesktopTenantSidebar({ pathname }: { pathname: string }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateMobile = () => setIsMobile(media.matches);
    updateMobile();
    media.addEventListener('change', updateMobile);
    return () => media.removeEventListener('change', updateMobile);
  }, []);

  if (isMobile) return null;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-950 border-r border-slate-800 fixed inset-y-0 left-0 z-[60] shadow-xl">
      <SidebarNav pathname={pathname} />
    </aside>
  );
}

function TenantBottomNav() {
  const pathname = usePathname();
  const { signOut, profile, user } = useAuth();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Khách thuê';

  const isActive = (link: typeof SIDEBAR_LINKS[0]) =>
    link.exact
      ? pathname === link.href
      : pathname.startsWith(link.href) && pathname !== '/customer/tenant-portal';

  const tenantTabs = [
    { href: '/customer/tenant-portal', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
    { href: '/customer/tenant-portal/apartments', label: 'Căn hộ', icon: Home },
    { href: '/customer/tenant-portal/contracts', label: 'Hợp đồng', icon: FileText },
    { href: '/customer/tenant-portal/finance', label: 'Tài chính', icon: Wallet },
  ];

  const tenantMoreItems = [
    { href: '/customer/tenant-portal/maintenance', label: 'Bảo trì & Bàn giao', icon: Wrench },
    { href: '/customer/tenant-portal/services', label: 'Dịch vụ bổ sung', icon: Sparkles },
    { href: '/customer/tenant-portal/settings', label: 'Cài đặt & Hồ sơ', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.4)] flex items-center justify-around h-16 px-1 select-none text-slate-300">
      {tenantTabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative',
              active ? 'text-amber-400 font-bold' : 'text-slate-400 font-medium hover:text-white'
            )}
          >
            {active && (
              <span className="absolute -top-3 w-8 h-1 bg-amber-400 rounded-full animate-in fade-in zoom-in" />
            )}
            <Icon className={cn('h-5 w-5 mb-0.5 transition-transform', active && 'scale-110')} />
            <span className="text-[10px] tracking-tight truncate max-w-[68px] text-center">{tab.label}</span>
          </Link>
        );
      })}

      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-slate-400 font-medium hover:text-white">
            <Grid className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Danh mục</span>
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="rounded-t-3xl p-6 bg-slate-950 text-white border-t border-slate-800 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-slate-800 text-left">
            <Logo variant="dark" className="text-[20px] mb-1" />
            <SheetTitle className="text-sm font-bold text-amber-400">
              Cổng Khách Thuê ({userName})
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {tenantMoreItems.map((item) => {
              const ItemIcon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMoreSheetOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                    active
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300')}>
                    <ItemIcon className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <Link
              href="/customer/properties"
              prefetch={true}
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setMoreSheetOpen(false);
                signOut();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function TenantMobileHeader() {
  const { profile, user } = useAuth();
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Khách thuê';

  return (
    <header className="lg:hidden h-16 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between text-white shrink-0">
      <div className="flex items-center gap-2">
        <Link href="/customer/properties" className="flex items-center shrink-0 mr-1 hover:opacity-90 transition-opacity">
          <Logo variant="dark" className="text-[18px] sm:text-[20px]" />
        </Link>
        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs">
          🔑 Cổng Khách Thuê
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-300 max-w-[120px] truncate">{userName}</span>
      </div>
    </header>
  );
}

export default function TenantPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Desktop Sidebar - z-[60] full height dark column */}
      <DesktopTenantSidebar pathname={pathname} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full max-w-full min-w-0 overflow-x-hidden">
        <TenantMobileHeader />
        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 min-w-0 max-w-full overflow-x-hidden">
          {children}
        </main>
        <TenantBottomNav />
      </div>

      {/* Floating AI Chatbot Widget */}
      <AIChatWidget />
    </div>
  );
}
