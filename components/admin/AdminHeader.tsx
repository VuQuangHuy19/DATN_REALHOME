'use client';

import { Bell, Search, User, LogOut, Settings, Lock, CreditCard } from 'lucide-react';
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
import { useNotifications } from '@/lib/hooks/useNotifications';
import WebPushManager from '@/src/features/notifications/components/WebPushManager';

import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import { Logo } from '@/components/Logo';

export function AdminHeader() {
  const { profile, company, signOut, user } = useAuth();
  const { unreadCount } = useNotifications(user?.id, company?.id);
  const { language } = useAppPreferences();
  const isEn = language === 'en';
  const router = useRouter();

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
    <header className="h-16 bg-white dark:bg-bg-subtle border-b border-border-subtle px-4 md:px-6 flex items-center justify-between shadow-none">
      <div className="flex items-center gap-1.5 sm:gap-4 flex-1 min-w-0">
        {/* Logo RealHome trên Mobile */}
        <Link href="/customer/properties" className="md:hidden flex items-center shrink-0 hover:opacity-90 transition-opacity">
          <Logo className="text-[18px] sm:text-[20px]" />
        </Link>
        <Badge className="md:hidden bg-accent-soft text-accent border border-accent/20 font-semibold px-2 py-0.5 rounded-lg text-[10px] shrink-0">
          🏢 Quản lý
        </Badge>
        <div ref={searchRef} className="hidden md:block relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            placeholder={isEn ? "Tìm kiếm tòa nhà, phòng, khách hàng..." : "Tìm kiếm tòa nhà, phòng, khách hàng..."}
            className="pl-9 w-full rounded-lg border-border text-sm"
          />

          {/* Floating Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto p-2">
              {isSearching ? (
                <p className="p-3 text-xs text-ink-muted text-center italic">Đang tìm kiếm...</p>
              ) : searchResults.buildings.length === 0 && searchResults.landlords.length === 0 && searchResults.rooms.length === 0 && searchResults.leads.length === 0 ? (
                <p className="p-3 text-xs text-ink-muted text-center">Không tìm thấy kết quả phù hợp với &quot;{searchQuery}&quot;</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {searchResults.buildings.length > 0 && (
                    <div>
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-bg-subtle rounded-md">Tòa nhà</p>
                      {searchResults.buildings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setShowDropdown(false);
                            router.push(`/admin/realhome/buildings`);
                          }}
                          className="p-2 hover:bg-accent-soft/40 rounded-lg cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-ink">{b.name}</span>
                          <span className="text-[10px] text-ink-muted font-mono bg-bg-subtle px-1.5 py-0.5 rounded">{b.code}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.landlords.length > 0 && (
                    <div>
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-bg-subtle rounded-md">Chủ nhà</p>
                      {searchResults.landlords.map((lnd) => (
                        <div
                          key={lnd.id}
                          onClick={() => {
                            setShowDropdown(false);
                            router.push(`/admin/landlords`);
                          }}
                          className="p-2 hover:bg-accent-soft/40 rounded-lg cursor-pointer flex justify-between items-center"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink">{lnd.name}</span>
                            {lnd.code && <span className="text-[10px] text-accent font-mono font-bold bg-accent/10 px-1.5 py-0.5 rounded">Mã: {lnd.code}</span>}
                          </div>
                          {lnd.phone && <span className="text-[11px] text-ink-muted font-mono">{lnd.phone}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.rooms.length > 0 && (
                    <div>
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-bg-subtle rounded-md">Phòng trọ</p>
                      {searchResults.rooms.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setShowDropdown(false);
                            router.push(`/admin/realhome/rooms`);
                          }}
                          className="p-2 hover:bg-accent-soft/40 rounded-lg cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-bold text-ink">Phòng {r.code}</span>
                          <span className="text-xs font-semibold text-accent">{Number(r.price).toLocaleString('vi-VN')} đ/tháng</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.leads.length > 0 && (
                    <div>
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-bg-subtle rounded-md">Khách hàng CRM</p>
                      {searchResults.leads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            setShowDropdown(false);
                            router.push(`/admin/customers/leads`);
                          }}
                          className="p-2 hover:bg-accent-soft/40 rounded-lg cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-ink">{l.full_name}</span>
                          <span className="text-xs text-ink-muted">{l.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
                  {profile?.full_name || (isEn ? 'User' : 'Người dùng')}
                </p>
                <p className="text-xs text-ink-muted leading-tight">
                  {company?.name || '—'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 sm:w-60 min-w-[220px]">
            <DropdownMenuItem asChild>
              <Link href="/admin/system/billing" className="flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                <CreditCard className="h-4 w-4 shrink-0" />
                {isEn ? 'SaaS Billing & Plan' : 'Gói dịch vụ & Gia hạn'}
              </Link>
            </DropdownMenuItem>
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
