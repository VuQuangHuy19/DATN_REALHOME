'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
  const { hasPermission, company } = useAuth();

  const requiredPerm = Object.entries(pathPermissions).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )?.[1];

  const hasAccess = !requiredPerm || hasPermission(requiredPerm);
  const isSuspended = company?.status === 'suspended';
  const showBanner = isSuspended && pathname !== '/admin/system/billing';

  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsBackgroundSyncing(true);
    window.addEventListener('import-sync-started', handleStart);
    return () => window.removeEventListener('import-sync-started', handleStart);
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    
    const channel = supabase.channel(`import-progress-${company.id}`);
    channel.on('broadcast', { event: 'sync-complete' }, (payload: any) => {
      setIsBackgroundSyncing(false);
      const msg = payload.payload?.message || 'Đồng bộ ảnh hoàn tất!';
      toast.success(msg);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

  return (
    <div className="flex min-h-screen bg-bg-base">
      <AdminSidebar />
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <AdminHeader />
        {showBanner && (
          <div className="bg-rose-600 text-white px-6 py-3 text-center flex items-center justify-center gap-2 text-sm font-medium animate-pulse shadow-md z-50">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>
              Tài khoản doanh nghiệp của bạn đang bị khóa do hết hạn sử dụng. Các chức năng Thêm/Sửa/Xóa đã bị chặn.
            </span>
            <a href="/admin/system/billing" className="underline font-bold hover:text-rose-100 ml-1 flex items-center gap-0.5">
              Thanh toán ngay <ArrowRight className="h-3.5 w-3.5 inline" />
            </a>
          </div>
        )}
        <main className="flex-1 p-6 overflow-auto">
          {hasAccess ? (
            children
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="bg-white p-8 rounded-lg border border-border-subtle shadow-none max-w-md w-full text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
                  <ShieldAlert className="h-6 w-6 text-danger" />
                </div>
                <h2 className="text-xl font-semibold text-ink">Không có quyền truy cập</h2>
                <p className="text-ink-muted text-sm leading-relaxed">
                  Tài khoản của bạn không được cấp quyền truy cập vào mục này. Vui lòng liên hệ với quản trị viên nếu bạn cần hỗ trợ.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Sync Animation Popup */}
      {isBackgroundSyncing && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border shadow-xl rounded-full px-5 py-3 flex items-center space-x-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <span className="text-sm font-medium text-slate-700">Đang đồng bộ ảnh ngầm...</span>
        </div>
      )}
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
