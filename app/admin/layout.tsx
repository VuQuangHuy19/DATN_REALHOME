'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ShieldAlert, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AIChatWidget } from '@/components/ui/AIChatWidget';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';

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

import { cn } from '@/lib/utils';
import { useAdminModule } from '@/features/admin/context/admin-module-context';

function AdminContent({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { hasPermission, company } = useAuth();
  const { isSidebarCollapsed } = useAdminModule();
  const router = useRouter();

  const requiredPerm = Object.entries(pathPermissions).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )?.[1];

  const hasAccess = !requiredPerm || hasPermission(requiredPerm);
  const isSuspended = company?.status === 'suspended';
  const showBanner = isSuspended && pathname !== '/admin/system/billing';

  const [syncJob, setSyncJob] = useState<{
    jobId: string;
    status: 'syncing' | 'done' | 'error';
    total: number;
    completed: number;
  } | null>(null);
  const [showDoneMsg, setShowDoneMsg] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restored persistent job from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('active_sync_job_id');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.jobId) {
          setSyncJob({
            jobId: parsed.jobId,
            status: 'syncing',
            total: parsed.total || 0,
            completed: 0,
          });
        }
      }
    } catch {}
  }, []);

  // Nhận event từ SheetImportPreviewDialog khi bắt đầu sync
  useEffect(() => {
    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent).detail as { job_id: string; total_tasks: number };
      if (!detail?.job_id) return;
      setSyncJob({
        jobId: detail.job_id,
        status: 'syncing',
        total: detail.total_tasks || 0,
        completed: 0,
      });
      setShowDoneMsg(false);
      try {
        localStorage.setItem('active_sync_job_id', JSON.stringify({ jobId: detail.job_id, total: detail.total_tasks || 0 }));
      } catch {}
    };
    window.addEventListener('import-sync-started', handleStart);
    return () => window.removeEventListener('import-sync-started', handleStart);
  }, []);

  // Polling trạng thái job mỗi 8 giây
  useEffect(() => {
    if (!syncJob?.jobId || syncJob.status !== 'syncing') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sync/drive-status?job_id=${syncJob.jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setSyncJob(prev => prev ? {
          ...prev,
          status: data.status,
          total: data.total_tasks,
          completed: data.completed_tasks,
        } : null);

        if (data.status === 'done') {
          setShowDoneMsg(true);
          try {
            localStorage.removeItem('active_sync_job_id');
          } catch {}
          // Tự ẩn sau 4 giây
          setTimeout(() => {
            setSyncJob(null);
            setShowDoneMsg(false);
          }, 4000);
        }
      } catch {
        // polling errors are non-critical
      }
    };

    poll(); // chạy ngay lập tức lần đầu
    pollIntervalRef.current = setInterval(poll, 8000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [syncJob?.jobId, syncJob?.status]);

  // Dừng polling khi job hoàn tất
  useEffect(() => {
    if (syncJob?.status === 'done' && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  }, [syncJob?.status]);

  // Realtime broadcast fallback (vẫn giữ để đảm bảo)
  useEffect(() => {
    if (!company?.id) return;
    const channel = supabase.channel(`import-progress-${company.id}`);
    channel.on('broadcast', { event: 'sync-complete' }, () => {
      setSyncJob(prev => prev ? { ...prev, status: 'done', completed: prev.total } : null);
      setShowDoneMsg(true);
      try {
        localStorage.removeItem('active_sync_job_id');
      } catch {}
      setTimeout(() => {
        setSyncJob(null);
        setShowDoneMsg(false);
      }, 4000);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [company?.id]);

  const syncPercent = syncJob && syncJob.total > 0
    ? Math.round((syncJob.completed / syncJob.total) * 100)
    : 0;

  return (
    <div className="flex min-h-screen bg-bg-base w-full max-w-full">
      <AdminSidebar />
      <div className={cn(
        "flex-1 flex flex-col ml-0 transition-all duration-300 w-full max-w-full min-w-0 min-h-screen",
        isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
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
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 w-full max-w-full min-w-0">
          {pathname !== '/admin' && (
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/admin');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition-all cursor-pointer group"
              >
                <ArrowLeft className="h-4 w-4 text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
                <span>Quay lại trang trước</span>
              </button>
            </div>
          )}
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
        <AdminBottomNav />
        <AIChatWidget role="manager" />
      </div>

      {/* Persistent Floating Drive Sync Status Badge */}
      {syncJob && (
        <div className={`fixed bottom-24 right-6 z-50 bg-white border shadow-2xl rounded-2xl px-5 py-4 flex flex-col gap-2 min-w-[260px] max-w-[320px] animate-in slide-in-from-bottom-4 fade-in duration-300 ${syncJob.status === 'done' ? 'border-emerald-200' : 'border-blue-100'}`}>
          <div className="flex items-center gap-3">
            {syncJob.status === 'done' ? (
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${syncJob.status === 'done' ? 'text-emerald-700' : 'text-slate-700'}`}>
                {syncJob.status === 'done'
                  ? '✅ Đã nạp xong toàn bộ ảnh!'
                  : 'Đang tải ảnh từ Google Drive...'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {syncJob.status === 'done'
                  ? `${syncJob.total} ảnh/video đã được nén & lưu vào Cloudflare R2`
                  : `Đã xử lý ${syncJob.completed}/${syncJob.total} ảnh`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {syncJob.status === 'syncing' && syncJob.total > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${syncPercent}%` }}
              />
            </div>
          )}

          {syncJob.status === 'done' && (
            <div className="w-full bg-emerald-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { AdminModuleProvider } from '@/features/admin/context/admin-module-context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthGuard allowedRoles={['company_admin', 'admin', 'manager', 'accountant', 'super_admin']}>
      <AdminModuleProvider>
        <AdminContent pathname={pathname}>{children}</AdminContent>
      </AdminModuleProvider>
    </AuthGuard>
  );
}
