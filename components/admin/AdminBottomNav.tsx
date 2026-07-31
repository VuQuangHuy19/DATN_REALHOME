'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  UserSearch,
  Receipt,
  Grid,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Home,
  UserCheck,
  Wrench,
  Bell,
  UserCog,
  Shield,
  CalendarDays,
  DoorOpen,
  Sliders
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Logo } from '@/components/Logo';

export function AdminBottomNav() {
  const pathname = usePathname();
  const { hasPermission, role, signOut, profile, company } = useAuth();
  const { language } = useAppPreferences();
  const isEn = language === 'en';
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const adminNavTabs = [
    { label: isEn ? 'Overview' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
    { label: isEn ? 'Properties' : 'BĐS', href: '/admin/realhome/buildings', icon: Building2 },
    { label: isEn ? 'Leads' : 'Khách hàng', href: '/admin/customers/leads', icon: UserSearch },
    { label: isEn ? 'Invoices' : 'Hóa đơn', href: '/admin/services/invoices', icon: Receipt },
  ];

  const landlordNavTabs = [
    { label: isEn ? 'Overview' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
    { label: isEn ? 'Properties' : 'Tòa & Phòng', href: '/admin/realhome/buildings', icon: Building2 },
    { label: isEn ? 'Contracts' : 'Hợp đồng', href: '/admin/contracts', icon: FileText },
    { label: isEn ? 'Invoices' : 'Hóa đơn', href: '/admin/services/invoices', icon: Receipt },
  ];

  const salesNavTabs = [
    { label: isEn ? 'Overview' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
    { label: isEn ? 'My Leads' : 'Khách hàng', href: '/admin/customers/leads', icon: UserSearch },
    { label: isEn ? 'Appointments' : 'Lịch hẹn', href: '/admin/customers/appointments', icon: CalendarDays },
    { label: isEn ? 'Rooms' : 'Phòng trống', href: '/admin/realhome/rooms', icon: DoorOpen },
  ];

  const navTabs = role === 'landlord'
    ? landlordNavTabs
    : role === 'sales_agent'
    ? salesNavTabs
    : adminNavTabs;

  const fullMenuItems = [
    { label: isEn ? 'View Client Page' : 'Xem trang khách', href: '/customer/properties', icon: Home },
    { label: isEn ? 'Commission & Policies' : 'Cơ chế & Hoa hồng', href: '/admin/commission-policies', icon: Sliders },
    { label: isEn ? 'Contracts' : 'Quản lý Hợp đồng', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
    { label: isEn ? 'Landlords' : 'Chủ sở hữu & Quản lý', href: '/admin/landlords', icon: UserCheck, permission: 'landlords.read' },
    { label: isEn ? 'Maintenance' : 'Bảo trì & Sửa chữa', href: '/admin/services/maintenance', icon: Wrench, permission: 'services.read' },
    { label: isEn ? 'Human Resources' : 'Quản lý Nhân sự', href: '/admin/hr/employees', icon: Users, permission: 'employees.read' },
    { label: isEn ? 'SaaS Billing' : 'Gói dịch vụ & Gia hạn', href: '/admin/system/billing', icon: CreditCard },
    { label: isEn ? 'Accounts' : 'Quản lý Tài khoản', href: '/admin/system/accounts', icon: UserCog, permission: 'accounts.read' },
    { label: isEn ? 'Roles' : 'Vai trò & Phân quyền', href: '/admin/system/roles', icon: Shield, permission: 'roles.read' },
    { label: isEn ? 'Settings' : 'Cài đặt hệ thống', href: '/admin/settings', icon: Settings },
  ];

  const visibleMenuItems = fullMenuItems.filter(
    (item) => {
      if (role === 'sales_agent' && item.href === '/admin/system/billing') return false;
      return !item.permission || hasPermission(item.permission);
    }
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-border-subtle shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex items-center justify-around h-16 px-1 select-none">
        {navTabs.map((tab) => {
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

        {/* Nút Xem Tất Cả Danh Mục (Sheet Bottom Drawer) */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
              )}
            >
              <Grid className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{isEn ? 'More' : 'Danh mục'}</span>
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="rounded-t-3xl p-6 bg-white dark:bg-zinc-900 border-t border-border max-h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border text-left flex flex-row items-center justify-between">
              <div>
                <Logo className="text-[20px] mb-1" />
                <SheetTitle className="text-sm font-bold text-ink">
                  {profile?.full_name || 'Menu Quản Trị'} ({company?.name || 'RealHome'})
                </SheetTitle>
              </div>
            </SheetHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
              {visibleMenuItems.map((item) => {
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

            <div className="pt-4 border-t border-border flex items-center justify-between">
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
                {isEn ? 'Sign Out' : 'Đăng xuất tài khoản'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
