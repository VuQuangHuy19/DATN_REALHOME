'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ArrowLeft } from 'lucide-react';
import React from 'react';
import { AIChatWidget } from '@/components/ui/AIChatWidget';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';
import { cn } from '@/lib/utils';
import { useAdminModule, AdminModuleProvider } from '@/features/admin/context/admin-module-context';

function BrokerContent({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { isSidebarCollapsed } = useAdminModule();
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-bg-base w-full max-w-full">
      <AdminSidebar />
      <div className={cn(
        "flex-1 flex flex-col ml-0 transition-all duration-300 w-full max-w-full min-w-0 min-h-screen",
        isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <AdminHeader />
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 w-full max-w-full min-w-0">
          {pathname !== '/broker' && (
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/broker');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition-all cursor-pointer group"
              >
                <ArrowLeft className="h-4 w-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                <span>Quay lại trang trước</span>
              </button>
            </div>
          )}
          {children}
        </main>
        <AdminBottomNav />
        <AIChatWidget role="manager" />
      </div>
    </div>
  );
}

export default function BrokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthGuard allowedRoles={['sales_agent', 'company_admin', 'admin', 'manager', 'super_admin']}>
      <AdminModuleProvider>
        <BrokerContent pathname={pathname}>{children}</BrokerContent>
      </AdminModuleProvider>
    </AuthGuard>
  );
}
