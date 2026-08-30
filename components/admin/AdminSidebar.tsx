'use client';

import Link from 'next/link';
import { Logo, LogoIcon } from '@/components/Logo';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Home,
  UserSearch,
  MessageSquare,
  CalendarDays,
  Users,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  UserCog,
  Shield,
  Bell,
  ClipboardList,
  TrendingUp,
  List,
  UserCheck,
  Receipt,
  Wrench,
  CreditCard,
  Sliders,
  SlidersHorizontal,
  ShieldCheck,
  User,
  PanelLeft,
  LogOut,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAdminModule } from '@/features/admin/context/admin-module-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  sectionLabel?: string; // optional section divider label ABOVE this item
  sectionColor?: string; // tailwind text color class for the divider
  children?: { label: string; href: string; icon?: React.ElementType; permission?: string }[];
}

const getNavItems = (isEn: boolean): NavItem[] => [
  { label: isEn ? 'View Client Page' : 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: isEn ? 'Dashboard' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  {
    label: isEn ? 'Properties & Buildings' : 'Quản lý nguồn hàng',
    href: '/admin/realhome/buildings',
    icon: Building2,
    sectionLabel: isEn ? 'Operations' : 'Nghiệp vụ',
    sectionColor: 'text-blue-500',
    children: [
      { label: isEn ? 'Buildings & Rooms' : 'Tòa nhà', href: '/admin/realhome/buildings', icon: Building2, permission: 'buildings.read' },
      { label: isEn ? 'Available Rooms' : 'Phòng trống', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
      { label: isEn ? 'Landlords & Owners' : 'Chủ sở hữu', href: '/admin/landlords', icon: UserCheck, permission: 'landlords.read' },
      { label: isEn ? 'Building Managers' : 'Người quản lý tòa', href: '/admin/managers', icon: UserCog, permission: 'landlords.read' },
      { label: isEn ? 'Categories & Amenities' : 'Danh mục tiện ích BĐS', href: '/admin/categories', icon: List, permission: 'buildings.read' },
    ],
  },
  {
    label: isEn ? 'Sales & CRM' : 'Bán hàng & CRM',
    href: '/admin/customers/leads',
    icon: UserSearch,
    children: [
      { label: isEn ? 'Leads & CRM' : 'Chăm sóc khách hàng', href: '/admin/customers/leads', icon: UserSearch, permission: 'leads.read' },
      { label: isEn ? 'Consultations' : 'Tư vấn & Lịch sử CSKH', href: '/admin/customers/consultations', icon: MessageSquare, permission: 'consultations.read' },
      { label: isEn ? 'Appointments' : 'Lịch hẹn xem phòng', href: '/admin/customers/appointments', icon: CalendarDays, permission: 'appointments.read' },
      { label: isEn ? 'Contracts & Deposits' : 'Hợp đồng & Giữ cọc', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
    ],
  },
  {
    label: isEn ? 'Finance & Commission' : 'Tài chính & Hoa hồng',
    href: '/admin/finance/profit',
    icon: Receipt,
    sectionLabel: isEn ? 'Finance' : 'Tài chính',
    sectionColor: 'text-amber-500',
    children: [
      { label: isEn ? 'Profit & P&L Report' : 'Báo cáo Kế toán', href: '/admin/finance/profit', icon: TrendingUp },
      { label: isEn ? 'Commission Engine' : 'Cơ chế Hoa hồng Sales', href: '/admin/commission-policies', icon: Sliders },
      { label: isEn ? 'Monthly Invoices' : 'Hóa đơn & Sổ quỹ', href: '/admin/services/invoices', icon: FileText, permission: 'invoices.read' },
      { label: isEn ? 'Service Readings' : 'Chỉ số điện nước', href: '/admin/services/readings', icon: ClipboardList, permission: 'services.read' },
    ],
  },
  {
    label: isEn ? 'Governance' : 'Quản trị',
    href: '/admin/hr/employees',
    icon: Users,
    sectionLabel: isEn ? 'Admin' : 'Quản trị',
    sectionColor: 'text-purple-500',
    children: [
      { label: isEn ? 'Employees & Staff' : 'Đội ngũ Nhân sự', href: '/admin/hr/employees', icon: Users, permission: 'employees.read' },
      { label: isEn ? 'User Accounts' : 'Tài khoản người dùng', href: '/admin/system/accounts', icon: UserCog, permission: 'accounts.read' },
      { label: isEn ? 'KPI Target & Evaluation' : 'Cấu hình KPIs', href: '/admin/hr/kpi', icon: TrendingUp, permission: 'reports.read' },
      { label: isEn ? 'Roles & RBAC Matrix' : 'Vai trò & Phân quyền', href: '/admin/system/roles', icon: Shield, permission: 'roles.read' },
      { label: isEn ? 'Identity Verification (KYC)' : 'Xác thực KYC', href: '/admin/kyc', icon: ShieldCheck },
    ],
  },
  {
    label: isEn ? 'Settings' : 'Cài đặt',
    href: '/admin/system/notifications',
    icon: Settings,
    children: [
      { label: isEn ? 'System Notifications' : 'Thông báo hệ thống', href: '/admin/system/notifications', icon: Bell },
      { label: isEn ? 'Feature Toggles & Privacy' : 'Cấu hình chức năng', href: '/admin/system/feature-toggles', icon: SlidersHorizontal },
      { label: isEn ? 'Activity & Audit Logs' : 'Nhật ký hoạt động (Audit Logs)', href: '/admin/system/activity-logs', icon: ClipboardList },
      { label: isEn ? 'SaaS Billing & Logs' : 'Gói dịch vụ', href: '/admin/system/billing', icon: CreditCard },
    ],
  },
];

const getLandlordNavItems = (isEn: boolean): NavItem[] => [
  { label: isEn ? 'View Client Page' : 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: isEn ? 'Dashboard' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { label: isEn ? 'Identity Verification (KYC)' : 'Xác thực KYC', href: '/admin/kyc', icon: ShieldCheck },
  {
    label: isEn ? 'Properties & Buildings' : ' Quản lý nguồn hàng',
    href: '/admin/realhome/buildings',
    icon: Building2,
    children: [
      { label: isEn ? 'Buildings & Rooms' : 'Tòa nhà & Sơ đồ phòng', href: '/admin/realhome/buildings', icon: Building2, permission: 'buildings.read' },
      { label: isEn ? 'Rooms' : 'Phòng trọ', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
    ],
  },
  { label: isEn ? 'Contracts' : 'Hợp đồng & Giữ cọc', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
  {
    label: isEn ? 'Finance & Commission' : 'Tài chính & Hoa hồng',
    href: '/admin/services/readings',
    icon: Receipt,
    children: [
      { label: isEn ? 'Service Readings' : 'Chỉ số điện nước & Dịch vụ', href: '/admin/services/readings', icon: ClipboardList, permission: 'services.read' },
      { label: isEn ? 'Monthly Invoices' : 'Hóa đơn tháng & Sổ quỹ', href: '/admin/services/invoices', icon: FileText, permission: 'invoices.read' },
    ],
  },
];

const getSalesNavItems = (isEn: boolean): NavItem[] => [
  { label: isEn ? 'Dashboard' : 'Tổng quan', href: '/broker', icon: LayoutDashboard },
  { label: isEn ? 'Available Rooms' : 'Tra cứu phòng trống', href: '/broker/rooms', icon: DoorOpen, permission: 'rooms.read' },
  { label: isEn ? 'Appointments' : 'Lịch hẹn dẫn xem phòng', href: '/broker/appointments', icon: CalendarDays, permission: 'appointments.read' },
  { label: isEn ? 'My Customers' : 'Khách hàng CRM & Lead', href: '/broker/leads', icon: UserSearch, permission: 'leads.read' },
  { label: isEn ? 'Contracts' : 'Hợp đồng & Giữ cọc', href: '/broker/contracts', icon: FileText, permission: 'contracts.read' },
  { label: isEn ? 'Identity Verification (KYC)' : 'Xác thực KYC', href: '/broker/kyc', icon: ShieldCheck },
];

// Role display config
const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  company_admin: { label: 'Quản trị viên', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  admin: { label: 'Quản trị viên', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  manager: { label: 'Trưởng nhóm', color: 'text-violet-700', bg: 'bg-violet-100' },
  accountant: { label: 'Kế toán', color: 'text-amber-700', bg: 'bg-amber-100' },
  super_admin: { label: 'Super Admin', color: 'text-rose-700', bg: 'bg-rose-100' },
  sales_agent: { label: 'Sale / Môi giới', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  landlord: { label: 'Chủ nhà', color: 'text-blue-700', bg: 'bg-blue-100' },
};

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission, role, profile, signOut } = useAuth();
  const { language } = useAppPreferences();
  const isEn = language === 'en';
  const { activeModule, isSidebarCollapsed, toggleSidebar } = useAdminModule();

  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateMobile = () => setIsMobile(media.matches);
    updateMobile();
    media.addEventListener('change', updateMobile);
    return () => media.removeEventListener('change', updateMobile);
  }, []);

  const currentNavItems = useMemo(() => {
    return role === 'landlord'
      ? getLandlordNavItems(isEn)
      : role === 'sales_agent'
        ? getSalesNavItems(isEn)
        : getNavItems(isEn);
  }, [role, isEn]);

  const roleConfig = ROLE_DISPLAY[role ?? ''] ?? { label: role ?? 'User', color: 'text-slate-700', bg: 'bg-slate-100' };
  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(-2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')
    : 'U';

  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!pathname) return;
    if (activeModule !== 'all') {
      if (activeModule === 'governance') {
        const govLabels = [
          isEn ? 'Governance' : 'Quản trị',
          isEn ? 'Settings' : 'Cài đặt',
        ];
        setExpandedItems((prev) => Array.from(new Set([...prev, ...govLabels])));
      } else {
        const moduleParentMap: Record<string, string> = {
          supply: isEn ? 'Properties & Buildings' : 'Quản lý nguồn hàng',
          sales: isEn ? 'Sales & CRM' : 'Bán hàng & CRM',
          finance: isEn ? 'Finance & Commission' : 'Tài chính & Hoa hồng',
        };
        const activeLabel = moduleParentMap[activeModule];
        if (activeLabel) {
          setExpandedItems((prev) => (prev.includes(activeLabel) ? prev : [...prev, activeLabel]));
        }
      }
    } else {
      const activeParent = currentNavItems.find((item) =>
        item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href))
      );
      if (activeParent) {
        setExpandedItems((prev) => (prev.includes(activeParent.label) ? prev : [...prev, activeParent.label]));
      }
    }
  }, [pathname, activeModule, currentNavItems, isEn]);

  const toggleExpand = (label: string) => {
    if (isSidebarCollapsed) {
      toggleSidebar();
    }
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const canViewItem = (item: NavItem) => {
    if (role === 'sales_agent') return true;
    if (item.children) {
      return item.children.some((child) => !child.permission || hasPermission(child.permission));
    }
    return !item.permission || hasPermission(item.permission);
  };

  // Lọc theo Active Module
  const filteredByModuleNavItems = currentNavItems.filter((item) => {
    if (activeModule === 'all') return true;
    const alwaysVisible = [
      isEn ? 'View Client Page' : 'Xem trang khách',
      isEn ? 'Dashboard' : 'Tổng quan',
    ];
    if (alwaysVisible.includes(item.label)) return true;

    const moduleAllowedLabels: Record<string, string[]> = {
      supply: [
        'Quản lý nguồn hàng', 'Properties & Buildings',
        'Bất động sản', 'Chủ sở hữu & Quản lý',
        'Properties', 'Landlords & Managers', 'Available Rooms',
        'Tra cứu phòng trống'
      ],
      sales: [
        'Bán hàng & CRM', 'Sales & CRM',
        'Khách hàng', 'Hợp đồng',
        'Customers', 'Contracts', 'My Customers', 'Appointments',
        'Khách hàng & CSKH', 'Lịch hẹn dẫn xem phòng', 'Hợp đồng & Giữ cọc'
      ],
      finance: [
        'Tài chính & Hoa hồng', 'Finance & Commission',
        'Hóa đơn & Dịch vụ', 'Cơ chế & Hoa hồng',
        'Invoices & Services', 'Commission & Policies'
      ],
      governance: [
        'Quản trị', 'Governance',
        'Cài đặt', 'Settings',
        'Quản trị & Hệ thống', 'Governance & System',
        'Nhân sự', 'Hệ thống', 'Xác thực KYC', 'Identity Verification (KYC)',
        'Human Resources', 'System'
      ],
    };

    const allowed = moduleAllowedLabels[activeModule] || [];
    return allowed.includes(item.label);
  });

  const visibleNavItems = filteredByModuleNavItems.filter(canViewItem);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isGroupActive = (item: NavItem) => {
    if (item.children) return item.children.some((c) => isActive(c.href));
    return isActive(item.href);
  };

  if (isMobile) return null;

  // Collapsed tooltip fix: use fixed positioning offset from sidebar width

  return (
    <aside
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 bg-bg-subtle text-ink border-r border-border-subtle flex-col transition-all duration-300 select-none overflow-x-hidden',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className={cn('flex items-center h-16 border-b border-border-subtle shrink-0 px-3 overflow-hidden', isSidebarCollapsed ? 'justify-center' : 'justify-between px-4')}>
        {!isSidebarCollapsed ? (
          <>
            <a href="/customer/properties" title="RealHome" className="hover:opacity-90 transition-opacity cursor-pointer">
              <Logo className="text-[22px]" />
            </a>
            <button
              onClick={toggleSidebar}
              title="Thu gọn thanh bên"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            title="Mở thanh bên"
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-all cursor-pointer group flex items-center justify-center"
          >
            <LogoIcon className="group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {/* Nav Menu Items */}
      <nav className="p-2 space-y-0.5 overflow-y-auto overflow-x-hidden flex-1 scrollbar-none pb-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.label);
          const groupActive = isGroupActive(item);

          if (isSidebarCollapsed) {
            return (
              <div key={item.label} className="relative group/mini flex justify-center py-0.5">
                {/* Section divider dot in collapsed mode */}
                {item.sectionLabel && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-600" />
                )}
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer',
                    groupActive || isActive(item.href)
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </Link>
                {/* Tooltip - fixed so it doesn't clip */}
                <div className="fixed left-[68px] z-[60] px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/mini:opacity-100 transition-opacity whitespace-nowrap">
                  {item.label}
                </div>
              </div>
            );
          }

          // Full Expanded Item
          return (
            <div key={item.label}>
              {/* Section divider label */}
              {item.sectionLabel && (
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <span className={cn('text-[10px] font-extrabold uppercase tracking-widest', item.sectionColor ?? 'text-slate-400')}>
                    {item.sectionLabel}
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
              )}

              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    groupActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('h-4 w-4 shrink-0', groupActive ? 'text-indigo-600' : '')} />
                    <span className="truncate text-xs">{item.label}</span>
                  </div>
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                    : <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
                </button>
              ) : item.href.startsWith('/customer') ? (
                <a
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    isActive(item.href)
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 font-semibold border-l-2 border-indigo-500 pl-2.5 rounded-r-lg rounded-l-none'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    isActive(item.href)
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 font-semibold border-l-2 border-indigo-500 pl-2.5 rounded-r-lg rounded-l-none'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )}

              {hasChildren && isExpanded && item.children && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-3">
                  {item.children
                    .filter((child) => !child.permission || hasPermission(child.permission))
                    .map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all',
                            childActive
                              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
                          )}
                        >
                          {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ─── Sticky Footer: Role badge + User info ─── */}
      <div className={cn(
        'shrink-0 border-t border-border-subtle',
        isSidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'
      )}>
        {isSidebarCollapsed ? (
          // Collapsed: just avatar initials
          <div
            title={profile?.full_name ?? 'User'}
            className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 flex items-center justify-center text-xs font-extrabold cursor-default select-none"
          >
            {initials}
          </div>
        ) : (
          // Expanded: full user info + role + sign out
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 flex items-center justify-center text-xs font-extrabold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink truncate leading-tight">
                {profile?.full_name ?? 'Người dùng'}
              </p>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', roleConfig.bg, roleConfig.color)}>
                {roleConfig.label}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
