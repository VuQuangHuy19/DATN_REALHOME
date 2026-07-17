'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  Menu,
  X,
  UserCog,
  Shield,
  Bell,
  ClipboardList,
  TrendingUp,
  List,
  UserCheck,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  children?: { label: string; href: string; icon?: React.ElementType; permission?: string }[];
}

const getNavItems = (isEn: boolean): NavItem[] => [
  { label: isEn ? 'View Client Page' : 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: isEn ? 'Dashboard' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  {
    label: isEn ? 'Properties' : 'Bất động sản',
    href: '/admin/realhome/buildings',
    icon: Building2,
    children: [
      { label: isEn ? 'Buildings' : 'Tòa nhà', href: '/admin/realhome/buildings', icon: Building2, permission: 'buildings.read' },
      { label: isEn ? 'Rooms' : 'Phòng', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
      { label: isEn ? 'Categories' : 'Danh mục', href: '/admin/categories', icon: List, permission: 'buildings.read' },
    ],
  },
  {
    label: isEn ? 'Customers' : 'Khách hàng',
    href: '/admin/customers/leads',
    icon: UserSearch,
    children: [
      { label: isEn ? 'Leads' : 'Khách hàng tiềm năng', href: '/admin/customers/leads', icon: UserSearch, permission: 'leads.read' },
      { label: isEn ? 'Consultations' : 'Yêu cầu tư vấn', href: '/admin/customers/consultations', icon: MessageSquare, permission: 'consultations.read' },
      { label: isEn ? 'Appointments' : 'Lịch hẹn', href: '/admin/customers/appointments', icon: CalendarDays, permission: 'appointments.read' },
    ],
  },
  { label: isEn ? 'Landlords' : 'Chủ nhà', href: '/admin/landlords', icon: UserCheck, permission: 'landlords.read' },
  { label: isEn ? 'Contracts' : 'Hợp đồng', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
  {
    label: isEn ? 'Invoices & Services' : 'Hóa đơn & Dịch vụ',
    href: '/admin/services/readings',
    icon: Receipt,
    children: [
      { label: isEn ? 'Service Readings' : 'Chỉ số dịch vụ', href: '/admin/services/readings', icon: ClipboardList, permission: 'services.read' },
      { label: isEn ? 'Monthly Invoices' : 'Hóa đơn tháng', href: '/admin/services/invoices', icon: FileText, permission: 'invoices.read' },
    ],
  },
  {
    label: isEn ? 'Human Resources' : 'Nhân sự',
    href: '/admin/hr/employees',
    icon: Users,
    children: [
      { label: isEn ? 'Employees' : 'Nhân viên', href: '/admin/hr/employees', icon: Users, permission: 'employees.read' },
      { label: isEn ? 'KPI' : 'KPI', href: '/admin/hr/kpi', icon: TrendingUp, permission: 'reports.read' },
    ],
  },
  {
    label: isEn ? 'System' : 'Hệ thống',
    href: '/admin/system/accounts',
    icon: Settings,
    children: [
      { label: isEn ? 'Accounts' : 'Tài khoản', href: '/admin/system/accounts', icon: UserCog, permission: 'accounts.read' },
      { label: isEn ? 'Roles & Permissions' : 'Vai trò & Phân quyền', href: '/admin/system/roles', icon: Shield, permission: 'roles.read' },
      { label: isEn ? 'Notifications' : 'Thông báo', href: '/admin/system/notifications', icon: Bell },
      { label: isEn ? 'Activity Logs' : 'Nhật ký hoạt động', href: '/admin/system/activity-logs', icon: ClipboardList, permission: 'accounts.read' },
    ],
  },
];

const getLandlordNavItems = (isEn: boolean): NavItem[] => [
  { label: isEn ? 'View Client Page' : 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: isEn ? 'Dashboard' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  {
    label: isEn ? 'Properties' : 'Bất động sản',
    href: '/admin/realhome/buildings',
    icon: Building2,
    children: [
      { label: isEn ? 'Buildings' : 'Tòa nhà', href: '/admin/realhome/buildings', icon: Building2, permission: 'buildings.read' },
      { label: isEn ? 'Rooms' : 'Phòng', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
    ],
  },
  { label: isEn ? 'Contracts' : 'Hợp đồng', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
  {
    label: isEn ? 'Invoices & Services' : 'Hóa đơn & Dịch vụ',
    href: '/admin/services/readings',
    icon: Receipt,
    children: [
      { label: isEn ? 'Service Readings' : 'Chỉ số dịch vụ', href: '/admin/services/readings', icon: ClipboardList, permission: 'services.read' },
      { label: isEn ? 'Monthly Invoices' : 'Hóa đơn tháng', href: '/admin/services/invoices', icon: FileText, permission: 'invoices.read' },
    ],
  },
];

const getSalesNavItems = (isEn: boolean): NavItem[] => [
  { label: isEn ? 'View Client Page' : 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: isEn ? 'Dashboard' : 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { label: isEn ? 'My Customers' : 'Khách hàng của tôi', href: '/admin/customers/leads', icon: UserSearch, permission: 'leads.read' },
  { label: isEn ? 'Appointments' : 'Lịch hẹn', href: '/admin/customers/appointments', icon: CalendarDays, permission: 'appointments.read' },
  { label: isEn ? 'Available Rooms' : 'Tra cứu phòng trống', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
  { label: isEn ? 'Contracts' : 'Hợp đồng', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission, role } = useAuth();
  const { language } = useAppPreferences();
  const isEn = language === 'en';

  const [expandedItems, setExpandedItems] = useState<string[]>([
    isEn ? 'Properties' : 'Bất động sản', 
    isEn ? 'Customers' : 'Khách hàng', 
    isEn ? 'Human Resources' : 'Nhân sự', 
    isEn ? 'System' : 'Hệ thống',
  ]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const canViewItem = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => !child.permission || hasPermission(child.permission));
    }
    return !item.permission || hasPermission(item.permission);
  };

  const currentNavItems = role === 'landlord'
    ? getLandlordNavItems(isEn)
    : role === 'sales_agent'
    ? getSalesNavItems(isEn)
    : getNavItems(isEn);

  const visibleNavItems = currentNavItems.filter(canViewItem);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isGroupActive = (item: NavItem) => {
    if (item.children) return item.children.some((c) => isActive(c.href));
    return isActive(item.href);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center px-6 h-16 border-b border-border-subtle flex-shrink-0">
        <Image src="/logo.png" alt="RealHome Logo" width={150} height={64} className="h-16 w-auto object-contain" />
      </div>

      <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.label);
          const groupActive = isGroupActive(item);

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    groupActive
                      ? 'bg-accent-soft text-ink font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </div>
                  {isExpanded ? (
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
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )}

              {hasChildren && isExpanded && item.children && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-3">
                  {item.children
                    .filter((child) => !child.permission || hasPermission(child.permission))
                    .map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                            pathname === child.href || pathname.startsWith(child.href + '/')
                              ? 'bg-accent-soft text-ink font-semibold border-l-2 border-accent pl-2.5 rounded-r-lg rounded-l-none'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-bg-base hover:text-ink'
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
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-bg-subtle text-ink border-r border-border-subtle transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
