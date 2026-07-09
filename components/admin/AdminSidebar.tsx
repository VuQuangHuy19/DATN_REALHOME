'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
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

const navItems: NavItem[] = [
  { label: 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  {
    label: 'Bất động sản',
    href: '/admin/realhome/buildings',
    icon: Building2,
    children: [
      { label: 'Tòa nhà', href: '/admin/realhome/buildings', icon: Building2, permission: 'buildings.read' },
      { label: 'Phòng', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
    ],
  },
  {
    label: 'Khách hàng',
    href: '/admin/customers/leads',
    icon: UserSearch,
    children: [
      { label: 'Khách hàng tiềm năng', href: '/admin/customers/leads', icon: UserSearch, permission: 'leads.read' },
      { label: 'Yêu cầu tư vấn', href: '/admin/customers/consultations', icon: MessageSquare, permission: 'consultations.read' },
      { label: 'Lịch hẹn', href: '/admin/customers/appointments', icon: CalendarDays, permission: 'appointments.read' },
    ],
  },
  { label: 'Chủ nhà', href: '/admin/landlords', icon: UserCheck, permission: 'landlords.read' },
  { label: 'Hợp đồng', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
  {
    label: 'Hóa đơn & Dịch vụ',
    href: '/admin/services/readings',
    icon: Receipt,
    children: [
      { label: 'Chỉ số dịch vụ', href: '/admin/services/readings', icon: ClipboardList, permission: 'services.read' },
      { label: 'Hóa đơn tháng', href: '/admin/services/invoices', icon: FileText, permission: 'invoices.read' },
    ],
  },
  {
    label: 'Nhân sự',
    href: '/admin/hr/employees',
    icon: Users,
    children: [
      { label: 'Nhân viên', href: '/admin/hr/employees', icon: Users, permission: 'employees.read' },
      { label: 'KPI', href: '/admin/hr/kpi', icon: TrendingUp, permission: 'reports.read' },
    ],
  },
  {
    label: 'Hệ thống',
    href: '/admin/system/accounts',
    icon: Settings,
    children: [
      { label: 'Tài khoản', href: '/admin/system/accounts', icon: UserCog, permission: 'accounts.read' },
      { label: 'Vai trò & Phân quyền', href: '/admin/system/roles', icon: Shield, permission: 'roles.read' },
      { label: 'Thông báo', href: '/admin/system/notifications', icon: Bell },
      { label: 'Nhật ký hoạt động', href: '/admin/system/activity-logs', icon: ClipboardList, permission: 'accounts.read' },
    ],
  },
];

const landlordNavItems: NavItem[] = [
  { label: 'Xem trang khách', href: '/customer/properties', icon: Home },
  { label: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  {
    label: 'Bất động sản',
    href: '/admin/realhome/buildings',
    icon: Building2,
    children: [
      { label: 'Tòa nhà', href: '/admin/realhome/buildings', icon: Building2, permission: 'buildings.read' },
      { label: 'Phòng', href: '/admin/realhome/rooms', icon: DoorOpen, permission: 'rooms.read' },
    ],
  },
  { label: 'Hợp đồng', href: '/admin/contracts', icon: FileText, permission: 'contracts.read' },
  {
    label: 'Hóa đơn & Dịch vụ',
    href: '/admin/services/readings',
    icon: Receipt,
    children: [
      { label: 'Chỉ số dịch vụ', href: '/admin/services/readings', icon: ClipboardList, permission: 'services.read' },
      { label: 'Hóa đơn tháng', href: '/admin/services/invoices', icon: FileText, permission: 'invoices.read' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission, role } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    'Bất động sản', 'Khách hàng', 'Nhân sự', 'Hệ thống',
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

  const currentNavItems = role === 'landlord' ? landlordNavItems : navItems;
  const visibleNavItems = currentNavItems.filter(canViewItem);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isGroupActive = (item: NavItem) => {
    if (item.children) return item.children.some((c) => isActive(c.href));
    return isActive(item.href);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center px-6 h-16 border-b border-slate-800 flex-shrink-0">
        <img src="/logo.png" alt="RealHome Logo" className="h-16 w-auto object-contain" />
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
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )}

              {hasChildren && isExpanded && item.children && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
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
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
          'fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col',
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
