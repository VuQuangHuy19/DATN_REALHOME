'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, DoorOpen, FileText, Receipt,
  ClipboardList, Bell, LogOut, User, Menu, X, ChevronDown, ChevronRight, Calendar, Wrench
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/lib/hooks/useNotifications';

import { Grid, CalendarDays } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string; icon?: React.ElementType }[];
}

const landlordNav: NavItem[] = [
  { label: 'Tổng quan', href: '/landlord', icon: LayoutDashboard },
  {
    label: 'Bất động sản',
    href: '/landlord/buildings',
    icon: Building2,
    children: [
      { label: 'Tòa nhà', href: '/landlord/buildings', icon: Building2 },
      { label: 'Phòng', href: '/landlord/rooms', icon: DoorOpen },
    ],
  },
  { label: 'Hợp đồng', href: '/landlord/contracts', icon: FileText },
  { label: 'Lịch hẹn', href: '/landlord/appointments', icon: Calendar },
  {
    label: 'Hóa đơn & Dịch vụ',
    href: '/landlord/invoices',
    icon: Receipt,
    children: [
      { label: 'Chỉ số dịch vụ', href: '/landlord/readings', icon: ClipboardList },
      { label: 'Hóa đơn tháng', href: '/landlord/invoices', icon: FileText },
    ],
  },
  { label: 'Bảo trì & Sự cố', href: '/landlord/maintenance', icon: Wrench },
];

function LandlordSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['Bất động sản', 'Hóa đơn & Dịch vụ']);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateMobile = () => setIsMobile(media.matches);
    updateMobile();
    media.addEventListener('change', updateMobile);
    return () => media.removeEventListener('change', updateMobile);
  }, []);

  const toggle = (label: string) =>
    setExpanded((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));

  const isActive = (href: string) =>
    href === '/landlord' ? pathname === '/landlord' : pathname === href || pathname.startsWith(href + '/');

  if (isMobile) return null;

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border-subtle bg-bg-subtle text-ink">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border-subtle flex-shrink-0">
        <Link href="/customer/properties" title="Về trang chủ RealHome" className="hover:opacity-90 transition-opacity flex items-center gap-2">
          <Logo align="start" className="h-8" />
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-accent-soft text-accent px-2 py-0.5 rounded-full">Chủ nhà</span>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
        {landlordNav.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;
          const isExpand = expanded.includes(item.label);
          const groupActive = item.children
            ? item.children.some((c) => isActive(c.href))
            : isActive(item.href);

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggle(item.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    groupActive
                      ? 'bg-accent-soft text-ink font-semibold'
                      : 'text-ink-muted hover:bg-bg-subtle hover:text-ink'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </div>
                  {isExpand ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-accent-soft text-ink font-semibold border-l-2 border-accent pl-2.5 rounded-r-lg rounded-l-none'
                      : 'text-ink-muted hover:bg-bg-subtle hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )}

              {hasChildren && isExpand && item.children && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                          isActive(child.href)
                            ? 'bg-accent-soft text-ink font-semibold border-l-2 border-accent pl-2.5 rounded-r-lg rounded-l-none'
                            : 'text-ink-muted hover:bg-bg-subtle hover:text-ink'
                        )}
                      >
                        {ChildIcon && <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function LandlordHeader() {
  const { profile, company, signOut, user } = useAuth();
  const { unreadCount } = useNotifications(user?.id, company?.id);

  return (
    <header className="h-16 bg-white border-b border-border-subtle px-3 sm:px-4 md:px-6 flex items-center justify-between shrink-0 max-w-full overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Logo RealHome trên Mobile */}
        <Link href="/customer/properties" className="md:hidden flex items-center shrink-0 mr-0.5 hover:opacity-90 transition-opacity">
          <Logo align="start" className="h-6 sm:h-7 text-[16px] sm:text-[18px]" />
        </Link>
        <Badge className="bg-accent-soft text-accent border border-accent/20 font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs hover:bg-accent-soft shrink-0">
          🏠 <span className="hidden xs:inline">Cổng </span>Chủ nhà
        </Badge>
        <span className="text-ink-muted text-sm hidden sm:block truncate">{company?.name}</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Bell */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10" asChild>
          <Link href="/landlord/notifications">
            <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-ink-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-danger rounded-full text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-1.5 sm:px-2 h-10">
              <div className="h-7 w-7 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-accent" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-ink leading-tight">
                  {profile?.full_name || 'Chủ nhà'}
                </p>
                <p className="text-xs text-ink-muted leading-tight font-medium">Chủ nhà</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/landlord/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4 text-slate-500" />
                Hồ sơ cá nhân
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="flex items-center gap-2 text-red-650 focus:text-red-650 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function LandlordBottomNav() {
  const pathname = usePathname();
  const { signOut, profile, company } = useAuth();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/landlord' ? pathname === '/landlord' : pathname === href || pathname.startsWith(href + '/');

  const landlordBottomTabs = [
    { label: 'Tổng quan', href: '/landlord', icon: LayoutDashboard },
    { label: 'Tòa nhà', href: '/landlord/buildings', icon: Building2 },
    { label: 'Hợp đồng', href: '/landlord/contracts', icon: FileText },
    { label: 'Hóa đơn', href: '/landlord/invoices', icon: Receipt },
  ];

  const landlordMoreItems = [
    { label: 'Phòng trọ', href: '/landlord/rooms', icon: DoorOpen },
    { label: 'Lịch hẹn', href: '/landlord/appointments', icon: Calendar },
    { label: 'Chỉ số dịch vụ', href: '/landlord/readings', icon: ClipboardList },
    { label: 'Bảo trì & Sự cố', href: '/landlord/maintenance', icon: Wrench },
    { label: 'Hồ sơ cá nhân', href: '/landlord/profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-border-subtle shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex items-center justify-around h-16 px-1 select-none">
      {landlordBottomTabs.map((tab) => {
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

      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800">
            <Grid className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Danh mục</span>
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="rounded-t-3xl p-6 bg-white dark:bg-zinc-900 border-t border-border max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border text-left">
            <Logo align="start" className="h-7 text-[18px] mb-1" />
            <SheetTitle className="text-sm font-bold text-ink">
              Cổng Chủ Nhà ({profile?.full_name || 'Chủ nhà'})
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {landlordMoreItems.map((item) => {
              const ItemIcon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreSheetOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'border-border-subtle bg-bg-subtle/50 text-slate-700 dark:text-slate-300 hover:bg-bg-subtle'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', active ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 shadow-xs')}>
                    <ItemIcon className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setMoreSheetOpen(false);
                signOut();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất tài khoản
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function LandlordContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-base w-full max-w-full overflow-x-hidden">
      <LandlordSidebar />
      <div className="flex-1 flex flex-col ml-0 md:ml-64 w-full max-w-full min-w-0 overflow-x-hidden">
        <LandlordHeader />
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 w-full max-w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
        <LandlordBottomNav />
      </div>
    </div>
  );
}

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['landlord']}>
      <LandlordContent>{children}</LandlordContent>
    </AuthGuard>
  );
}
