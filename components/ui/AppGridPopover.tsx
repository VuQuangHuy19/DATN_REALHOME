'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Building2, Briefcase, Home, Shield, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';

export function AppGridPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { role } = useAuth();

  const apps = [
    {
      id: 'admin',
      name: 'Quản trị hệ thống',
      desc: 'Quản lý Nguồn hàng, Bán hàng, Tài chính & Nhân sự',
      href: '/admin',
      icon: LayoutGrid,
      color: 'bg-blue-500 text-white',
      roleAllowed: ['super_admin', 'company_admin', 'admin', 'manager', 'accountant'],
    },
    {
      id: 'broker',
      name: 'Phân hệ Môi giới',
      desc: 'Smart Dashboard cho Sales Partner & Môi giới',
      href: '/broker',
      icon: Briefcase,
      color: 'bg-emerald-500 text-white',
      roleAllowed: ['super_admin', 'company_admin', 'manager', 'sales_agent', 'landlord'],
    },
    {
      id: 'landlord',
      name: 'Cổng Chủ nhà',
      desc: 'Quản lý tòa nhà, hợp đồng & hóa đơn phòng',
      href: '/landlord',
      icon: Building2,
      color: 'bg-amber-500 text-white',
      roleAllowed: ['super_admin', 'company_admin', 'manager', 'landlord'],
    },
    {
      id: 'customer',
      name: 'Trang Khách thuê',
      desc: 'Xem danh sách nhà đất & Đặt lịch xem phòng',
      href: '/customer/properties',
      icon: Home,
      color: 'bg-indigo-500 text-white',
      roleAllowed: ['super_admin', 'company_admin', 'manager', 'sales_agent', 'landlord', 'customer'],
    },
  ];

  const visibleApps = apps.filter((app) => !role || app.roleAllowed.includes(role));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Chuyển đổi phân hệ ứng dụng"
          className="relative cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors rounded-xl h-9 w-9"
        >
          <LayoutGrid className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-3 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-50"
      >
        <div className="px-2 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-2">
          <p className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            🚀 Chuyển đổi Phân hệ
          </p>
          <p className="text-[11px] text-slate-500">Truy cập nhanh các giao diện hệ thống RealHome</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {visibleApps.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                onClick={() => {
                  setIsOpen(false);
                  router.push(app.href);
                }}
                className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer flex flex-col items-center text-center group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform ${app.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {app.name}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {app.desc}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
