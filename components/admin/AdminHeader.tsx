'use client';

import { Bell, Search, User, LogOut, Settings, Lock, CreditCard, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import WebPushManager from '@/features/notifications/components/WebPushManager';

import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';

import { useAdminModule, AdminModuleId } from '@/features/admin/context/admin-module-context';
import { Building2, Handshake, Wallet, SlidersHorizontal, LayoutGrid } from 'lucide-react';

export function AdminHeader() {
  const { profile, company, signOut, user, role } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id, company?.id);
  const { language } = useAppPreferences();
  const isEn = language === 'en';
  const router = useRouter();
  const { activeModule, setActiveModule, badgeCounts, isSidebarCollapsed, toggleSidebar } = useAdminModule();

  const MODULES: { id: AdminModuleId; label: string; icon: React.ElementType; color: string; badge?: number }[] = [
    { id: 'all', label: 'Tất cả', icon: LayoutGrid, color: 'text-slate-600 dark:text-slate-300' },
    { id: 'supply', label: '1. Nguồn Hàng', icon: Building2, color: 'text-blue-600 dark:text-blue-400', badge: badgeCounts.supply },
    { id: 'sales', label: '2. Bán Hàng', icon: Handshake, color: 'text-emerald-600 dark:text-emerald-400', badge: badgeCounts.sales },
    { id: 'finance', label: '3. Tài Chính', icon: Wallet, color: 'text-amber-600 dark:text-amber-400', badge: badgeCounts.finance },
    { id: 'governance', label: '4. Quản Trị', icon: SlidersHorizontal, color: 'text-purple-600 dark:text-purple-400', badge: badgeCounts.governance },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    buildings: Array<{ id: string; name: string; code: string }>;
    landlords: Array<{ id: string; name: string; code: string; phone: string }>;
    rooms: Array<{ id: string; code: string; price: number; status: string }>;
    leads: Array<{ id: string; full_name: string; phone: string }>;
  }>({ buildings: [], landlords: [], rooms: [], leads: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ buildings: [], landlords: [], rooms: [], leads: [] });
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const q = searchQuery.trim();
        
        // Query buildings
        const { data: bData } = await supabase
          .from('buildings')
          .select('id, name, code')
          .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
          .limit(4);

        // Query landlords (by name, code or phone)
        const { data: lndData } = await supabase
          .from('landlords')
          .select('id, name, code, phone')
          .or(`name.ilike.%${q}%,code.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(4);

        // Query rooms
        const { data: rData } = await supabase
          .from('rooms')
          .select('id, code, price, status')
          .ilike('code', `%${q}%`)
          .limit(4);

        // Query leads
        const { data: lData } = await supabase
          .from('leads')
          .select('id, full_name, phone')
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(4);

        setSearchResults({
          buildings: bData || [],
          landlords: lndData || [],
          rooms: rData || [],
          leads: lData || [],
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowDropdown(false);
      router.push(`/admin/realhome/rooms?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white/95 dark:bg-bg-subtle/95 backdrop-blur-md border-b border-border-subtle px-4 md:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">


        {/* Logo RealHome trên Mobile */}
        <Link href="/customer/properties" className="md:hidden flex items-center shrink-0 hover:opacity-90 transition-opacity">
          <Logo className="text-[18px] sm:text-[20px]" />
        </Link>
        <Badge className="md:hidden bg-accent-soft text-accent border border-accent/20 font-semibold px-2 py-0.5 rounded-lg text-[10px] shrink-0">
          {role === 'sales_agent' ? '💼 Sale' : role === 'landlord' ? '🏠 Chủ nhà' : '🏢 Quản lý'}
        </Badge>

        {/* Module Switcher Pills — Chỉ hiện khi không phải môi giới hoặc màn hình đủ lớn */}
        <div className="hidden 2xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto scrollbar-none max-w-full shrink-0">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isSelected = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveModule(m.id);
                  if (window.location.pathname !== '/admin') {
                    router.push('/admin');
                  }
                }}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative shrink-0 whitespace-nowrap',
                  isSelected
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', m.color)} />
                <span>{m.label}</span>
                {m.badge && m.badge > 0 ? (
                  <span
                    className={cn(
                      'ml-0.5 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full',
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {m.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
        <div className="hidden sm:block">
          <WebPushManager />
        </div>

        {/* Realtime Notification Bell */}
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
              <div className="h-7 w-7 rounded-full bg-accent-soft flex items-center justify-center">
                <User className="h-4 w-4 text-accent" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-ink leading-tight">
                  {profile?.full_name || (isEn ? 'User' : 'Người dùng')}
                </p>
                <p className="text-xs text-ink-muted leading-tight">
                  {company?.name || '—'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 sm:w-60 min-w-[220px]">
            {role !== 'sales_agent' && (
              <DropdownMenuItem asChild>
                <Link href="/admin/system/billing" className="flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  <CreditCard className="h-4 w-4 shrink-0" />
                  {isEn ? 'SaaS Billing & Plan' : 'Gói dịch vụ & Gia hạn'}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/admin/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {isEn ? 'Profile' : 'Hồ sơ'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {isEn ? 'Settings' : 'Cài đặt'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/change-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {isEn ? 'Change Password' : 'Đổi mật khẩu'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              {isEn ? 'Sign Out' : 'Đăng xuất'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
