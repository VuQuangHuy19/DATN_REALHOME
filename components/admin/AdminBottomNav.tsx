'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';
import { cn } from '@/lib/utils';
import {
  Building2,
  Handshake,
  Wallet,
  SlidersHorizontal,
  LayoutGrid,
  Grid,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Home,
  UserCheck,
  Wrench,
  UserCog,
  Shield,
  CalendarDays,
  DoorOpen,
  Sliders,
  UserSearch,
  MessageSquare,
  Receipt,
  ClipboardList,
  ShieldCheck,
  Bell,
  TrendingUp,
  Briefcase,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Logo } from '@/components/Logo';
import { useAdminModule, AdminModuleId } from '@/features/admin/context/admin-module-context';
import { supabase } from '@/lib/supabase/client';

// Role display
const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  company_admin: { label: 'Quản trị viên', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  admin: { label: 'Quản trị viên', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  manager: { label: 'Trưởng nhóm', color: 'text-violet-700', bg: 'bg-violet-100' },
  accountant: { label: 'Kế toán', color: 'text-amber-700', bg: 'bg-amber-100' },
  super_admin: { label: 'Super Admin', color: 'text-rose-700', bg: 'bg-rose-100' },
  sales_agent: { label: 'Sale / Môi giới', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  landlord: { label: 'Chủ nhà', color: 'text-blue-700', bg: 'bg-blue-100' },
};

export function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, role, signOut, profile, company } = useAuth();
  const { language } = useAppPreferences();
  const isEn = language === 'en';
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [pendingAppts, setPendingAppts] = useState(0);
  const [pendingContracts, setPendingContracts] = useState(0);

  // Fetch pending appointments & contracts count for badges
  useEffect(() => {
    if (!company?.id) return;
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'pending')
      .then(({ count }: { count: number | null }) => {
        if (count && count > 0) setPendingAppts(count);
      });

    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .in('status', ['pending', 'draft'])
      .then(({ count }: { count: number | null }) => {
        if (count && count > 0) setPendingContracts(count);
      });
  }, [company?.id]);

  const roleConfig = ROLE_LABELS[role ?? ''] ?? { label: role ?? 'User', color: 'text-slate-700', bg: 'bg-slate-100' };
  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(-2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')
    : 'U';

  const adminNavTabs = [
    { label: isEn ? 'Overview' : 'Trang chủ', href: '/admin', icon: LayoutGrid },
    { label: isEn ? 'Properties' : 'Nguồn hàng', href: '/admin/realhome/buildings', icon: Building2 },
    { label: isEn ? 'Appointments' : 'Lịch hẹn', href: '/admin/customers/appointments', icon: CalendarDays, badge: pendingAppts },
    { label: isEn ? 'Contracts' : 'Hợp đồng', href: '/admin/contracts', icon: FileText, badge: pendingContracts },
  ];

  const landlordNavTabs = [
    { label: isEn ? 'Overview' : 'Tổng quan', href: '/landlord', icon: LayoutGrid },
    { label: isEn ? 'Properties' : 'Tòa & Phòng', href: '/admin/realhome/buildings', icon: Building2 },
    { label: isEn ? 'Contracts' : 'Hợp đồng', href: '/admin/contracts', icon: FileText },
    { label: isEn ? 'Invoices' : 'Hóa đơn', href: '/admin/services/invoices', icon: Receipt },
  ];

  const salesNavTabs = [
    { label: isEn ? 'Dashboard' : 'Dashboard', href: '/broker', icon: Briefcase },
    { label: isEn ? 'Rooms' : 'Phòng trống', href: '/broker/rooms', icon: DoorOpen },
    { label: isEn ? 'Appointments' : 'Lịch hẹn', href: '/broker/appointments', icon: CalendarDays, badge: pendingAppts },
    { label: isEn ? 'My Leads' : 'Khách hàng', href: '/broker/leads', icon: UserSearch },
  ];

  const navTabs = role === 'landlord'
    ? landlordNavTabs
    : role === 'sales_agent'
    ? salesNavTabs
    : adminNavTabs;

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/broker' || href === '/landlord') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-border-subtle shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex items-center justify-around h-16 px-1 select-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          const badge = (tab as any).badge;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative cursor-pointer',
                active ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
              )}
            >
              {active && (
                <span className="absolute -top-3 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-in fade-in zoom-in" />
              )}
              <div className="relative">
                <Icon className={cn('h-5 w-5 mb-0.5 transition-transform', active && 'scale-110')} />
                {/* Notification badge */}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 border border-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[68px] text-center">{tab.label}</span>
            </Link>
          );
        })}

        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center px-3 py-1.5 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 cursor-pointer'
              )}
            >
              <Grid className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{isEn ? 'Menu' : 'Danh mục'}</span>
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="rounded-t-3xl p-0 bg-white dark:bg-zinc-900 border-t border-border max-h-[88vh] flex flex-col">
            {/* Sheet Header — User info + close */}
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 flex items-center justify-center text-sm font-extrabold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-sm font-bold text-ink truncate text-left">
                    {profile?.full_name ?? 'Người dùng'}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', roleConfig.bg, roleConfig.color)}>
                      {roleConfig.label}
                    </span>
                    {company?.name && (
                      <span className="text-[10px] text-ink-muted truncate">{company.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Quick Switch to 4 Modules */}
              {role !== 'sales_agent' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Chuyển phân hệ nhanh</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setMoreSheetOpen(false); router.push('/admin/realhome/buildings'); }}
                      className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-left flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-blue-900 dark:text-blue-200 block">Nguồn Hàng</span>
                        <span className="text-[10px] text-blue-600/70 dark:text-blue-300">BĐS, Phòng, Chủ nhà</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setMoreSheetOpen(false); router.push('/admin/customers/leads'); }}
                      className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-left flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                        <Handshake className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 block">Bán Hàng</span>
                        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-300">CRM, Lịch hẹn, HĐ</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setMoreSheetOpen(false); router.push('/admin/commission-policies'); }}
                      className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-left flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-600 text-white shrink-0">
                        <Wallet className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-amber-900 dark:text-amber-200 block">Tài Chính</span>
                        <span className="text-[10px] text-amber-600/70 dark:text-amber-300">Hoa hồng, Dòng tiền</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { setMoreSheetOpen(false); router.push('/admin/hr/employees'); }}
                      className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-left flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-600 text-white shrink-0">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-purple-900 dark:text-purple-200 block">Quản Trị</span>
                        <span className="text-[10px] text-purple-600/70 dark:text-purple-300">KPIs, Phân quyền</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Categorized Menu Links */}
              <div className="space-y-4">
                {/* Phân hệ 1: Nguồn hàng */}
                <div>
                  <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Nguồn hàng & BĐS
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link
                      href={role === 'sales_agent' ? '/broker/rooms' : '/admin/realhome/buildings'}
                      onClick={() => setMoreSheetOpen(false)}
                      className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors"
                    >
                      <DoorOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {role === 'sales_agent' ? 'Tra cứu Phòng trống' : 'Tòa nhà'}
                    </Link>
                    {role !== 'sales_agent' && (
                      <>
                        <Link href="/admin/realhome/rooms" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <DoorOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Tra cứu Phòng
                        </Link>
                        <Link href="/admin/landlords" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <UserCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Chủ sở hữu
                        </Link>
                        <Link href="/admin/managers" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <UserCog className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Người quản lý
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Phân hệ 2: Bán hàng */}
                <div>
                  <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Handshake className="h-3 w-3" /> CRM & Bán hàng
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href={role === 'sales_agent' ? '/broker/leads' : '/admin/customers/leads'} onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                      <UserSearch className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Khách hàng CRM
                    </Link>
                    <Link href={role === 'sales_agent' ? '/broker/appointments' : '/admin/customers/appointments'} onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                      <CalendarDays className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="flex-1 truncate">Lịch hẹn</span>
                      {pendingAppts > 0 && <span className="ml-auto bg-rose-500 text-white text-[9px] font-extrabold px-1 py-0.5 rounded-full">{pendingAppts}</span>}
                    </Link>
                    <Link href={role === 'sales_agent' ? '/broker/contracts' : '/admin/contracts'} onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                      <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Hợp đồng
                    </Link>
                    {role !== 'sales_agent' && (
                      <Link href="/admin/customers/consultations" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Tư vấn
                      </Link>
                    )}
                  </div>
                </div>

                {/* Phân hệ 3: Tài chính */}
                <div>
                  <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> Tài Chính & Hoa Hồng
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href={role === 'sales_agent' ? '/broker/commission-policies' : '/admin/commission-policies'} onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                      <Sliders className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      {role === 'sales_agent' ? 'Hoa hồng & KPI' : 'Cơ chế hoa hồng'}
                    </Link>
                    {role !== 'sales_agent' && (
                      <>
                        <Link href="/admin/services/invoices" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <Receipt className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Hóa đơn tháng
                        </Link>
                        <Link href="/admin/services/readings" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Chỉ số dịch vụ
                        </Link>
                      </>
                    )}
                    {role === 'sales_agent' && (
                      <Link href="/broker/kyc" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Xác thực KYC
                      </Link>
                    )}
                  </div>
                </div>

                {/* Phân hệ 4: Quản trị */}
                {role !== 'sales_agent' && (
                  <div>
                    <p className="text-[10px] font-extrabold text-purple-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <SlidersHorizontal className="h-3 w-3" /> Quản Trị Chung
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {hasPermission('employees.read') && (
                        <Link href="/admin/hr/employees" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Nhân sự
                        </Link>
                      )}
                      {hasPermission('reports.read') && (
                        <Link href="/admin/hr/kpi" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <TrendingUp className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Báo cáo KPI
                        </Link>
                      )}
                      {hasPermission('roles.read') && (
                        <Link href="/admin/system/roles" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                          <Shield className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Phân quyền RBAC
                        </Link>
                      )}
                      <Link href="/admin/kyc" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Xác thực KYC
                      </Link>
                      <Link href="/admin/system/notifications" onClick={() => setMoreSheetOpen(false)} className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 active:bg-slate-100 transition-colors">
                        <Settings className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Cài đặt
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer — Sign out always visible */}
            <div className="shrink-0 p-4 border-t border-border bg-white dark:bg-zinc-900">
              <button
                onClick={() => { setMoreSheetOpen(false); signOut(); }}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-200 dark:border-rose-800 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {isEn ? 'Sign Out' : 'Đăng xuất'}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
