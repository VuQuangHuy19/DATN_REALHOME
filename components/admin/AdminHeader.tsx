'use client';

import { Bell, Search, User, LogOut, Settings, Lock } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/AuthContext';
import { useNotifications } from '@/lib/hooks/useNotifications';
import WebPushManager from '@/src/features/notifications/components/WebPushManager';

export function AdminHeader() {
  const { profile, company, signOut, user } = useAuth();
  const { unreadCount } = useNotifications(user?.id, company?.id);

  return (
    <header className="h-16 bg-white border-b border-border-subtle pl-16 pr-6 md:px-6 flex items-center justify-between shadow-none">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input placeholder="Tìm kiếm..." className="pl-9 w-full" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <WebPushManager />

        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/admin/system/notifications">
            <Bell className="h-5 w-5 text-ink-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-danger rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
              <div className="h-7 w-7 rounded-full bg-accent-soft flex items-center justify-center">
                <User className="h-4 w-4 text-accent" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-ink leading-tight">
                  {profile?.full_name || 'Người dùng'}
                </p>
                <p className="text-xs text-ink-muted leading-tight">
                  {company?.name || '—'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/admin/system/accounts" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Hồ sơ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/system/roles" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Cài đặt
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/change-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Đổi mật khẩu
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
