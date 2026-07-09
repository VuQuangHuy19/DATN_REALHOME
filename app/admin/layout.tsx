'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ShieldAlert } from 'lucide-react';

const pathPermissions: Record<string, string> = {
  '/admin/realhome/buildings': 'buildings.read',
  '/admin/realhome/rooms': 'rooms.read',
  '/admin/customers/leads': 'leads.read',
  '/admin/customers/consultations': 'consultations.read',
  '/admin/customers/appointments': 'appointments.read',
  '/admin/landlords': 'landlords.read',
  '/admin/contracts': 'contracts.read',
  '/admin/services/readings': 'services.read',
  '/admin/services/invoices': 'invoices.read',
  '/admin/hr/employees': 'employees.read',
  '/admin/hr/kpi': 'reports.read',
  '/admin/system/accounts': 'accounts.read',
  '/admin/system/roles': 'roles.read',
  '/admin/system/activity-logs': 'accounts.read',
  '/admin/categories': 'buildings.read',
};

function AdminContent({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth();

  const requiredPerm = Object.entries(pathPermissions).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )?.[1];

  const hasAccess = !requiredPerm || hasPermission(requiredPerm);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-auto">
          {hasAccess ? (
            children
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="bg-white p-8 rounded-xl border shadow-sm max-w-md w-full text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <ShieldAlert className="h-6 w-6 text-red-650" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Không có quyền truy cập</h2>
                <p className="text-slate-500 text-sm">
                  Tài khoản của bạn không được cấp quyền truy cập vào mục này. Vui lòng liên hệ với quản trị viên nếu bạn cần hỗ trợ.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthGuard allowedRoles={['company_admin', 'manager', 'sales_agent']}>
      <AdminContent pathname={pathname}>{children}</AdminContent>
    </AuthGuard>
  );
}
