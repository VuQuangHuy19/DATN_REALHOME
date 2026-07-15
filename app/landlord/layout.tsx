'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, DoorOpen, FileText, Receipt,
  ClipboardList, Bell, LogOut, User, Menu, X, ChevronDown, ChevronRight, Calendar
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/lib/hooks/useNotifications';

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
];

function LandlordSidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['Bất động sản', 'Hóa đơn & Dịch vụ']);

  const toggle = (label: string) =>
    setExpanded((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));

  const isActive = (href: string) =>
    href === '/landlord' ? pathname === '/landlord' : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-border-subtle bg-bg-subtle text-ink transition-transform duration-300 ease-in-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border-subtle flex-shrink-0">
          <Image src="/logo.png" alt="RealHome Logo" width={140} height={56} className="h-14 w-auto object-contain" />
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
                    onClick={() => setMobileOpen(false)}
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
                          onClick={() => setMobileOpen(false)}
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

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}

function LandlordHeader() {
  const { profile, company, signOut, user } = useAuth();
  const { unreadCount } = useNotifications(user?.id, company?.id);

  return (
    <header className="h-16 bg-white border-b border-border-subtle pl-16 pr-6 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge className="bg-accent-soft text-accent border border-accent/20 font-semibold px-3 py-1 rounded-lg text-xs hover:bg-accent-soft">
          🏠 Cổng Chủ nhà
        </Badge>
        <span className="text-ink-muted text-sm hidden sm:block">{company?.name}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Bell */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/landlord/notifications">
            <Bell className="h-5 w-5 text-ink-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-danger rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
              <div className="h-7 w-7 rounded-full bg-accent-soft flex items-center justify-center">
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="flex items-center gap-2 text-red-650 focus:text-red-650 focus:bg-red-50"
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

function LandlordContent({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg-base">
      <LandlordSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <LandlordHeader />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
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
