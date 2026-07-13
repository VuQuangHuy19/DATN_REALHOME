'use client';

import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

function SuperAdminHeader() {
  const { profile, signOut } = useAuth();
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'SA';

  return (
    <header className="h-16 bg-white border-b border-border-subtle px-6 flex items-center justify-between shadow-none">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink-muted">RealHome</span>
        <span className="text-border-subtle">/</span>
        <span className="text-sm font-semibold text-ink">Super Admin</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-ink">{profile?.full_name || 'Super Admin'}</p>
          <p className="text-xs text-ink-muted">Super Admin</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-accent-soft flex items-center justify-center">
          <span className="text-xs font-bold text-accent">{initials}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất">
          <LogOut className="h-4 w-4 text-ink-muted" />
        </Button>
      </div>
    </header>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['super_admin']}>
      <div className="flex min-h-screen bg-bg-base">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col ml-0 md:ml-64">
          <SuperAdminHeader />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
