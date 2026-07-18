'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/Logo';
import { Menu, Home, Building2, Phone, Search, Heart, MessageSquare, LogIn, LayoutDashboard, LogOut, User, Settings, Calendar } from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function CustomerHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { user, role, signOut, loading: authLoading } = useAuth();

  useEffect(() => {
    if (pathname === '/customer/properties') {
      setSearchValue(searchParams?.get('q') || '');
    } else {
      setSearchValue('');
    }
  }, [pathname, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value) params.set('q', value);
    else params.delete('q');
    const qs = params.toString();
    router.replace(`/customer/properties${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const dashboardHref = (() => {
    if (role === 'super_admin') return '/super-admin';
    if (role === 'landlord') return '/landlord';
    return '/admin';
  })();

  const navLinks = useMemo(() => {
    const base = [
      { href: '/customer', label: 'Trang chủ', icon: Home },
      { href: '/customer/properties', label: 'Tìm Kiếm', icon: Building2 },
      { href: '/customer/appointments/track', label: 'Lịch hẹn', icon: Calendar },
      { href: '/customer/favorites', label: 'Yêu thích', icon: Heart },
    ];
    if (role === 'sales_agent') {
      base.push({ href: '/admin', label: 'Khu vực CRM', icon: LayoutDashboard });
    }
    return base;
  }, [role]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-white/80 dark:bg-bg-base/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-4">

        {/* Left: Logo */}
        <Link href="/customer" className="flex items-center flex-shrink-0 mr-4">
          <Logo className="text-[28px]" />
        </Link>

        {/* Center: Search bar */}
        <div className="hidden md:flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <Input
              placeholder="Tìm bất động sản, địa chỉ, khu vực..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-bg-subtle border-border-subtle text-ink placeholder:text-ink-muted/60 focus:bg-white dark:focus:bg-bg-base focus:ring-1 focus:ring-accent focus:border-accent focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Right: Nav + Contact + Mobile toggle */}
        <div className="flex items-center gap-2 justify-end">
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-accent text-white shadow-none hover:bg-accent-500'
                      : 'text-ink-muted hover:text-accent hover:bg-accent-soft'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          

          <ThemeToggle />

          {!authLoading && !user && (
            <Button size="sm" className="h-9 px-4 text-xs font-semibold" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-1.5" />
                Đăng nhập
              </Link>
            </Button>
          )}

          {/* Mobile hamburger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-5 mt-8">
                {/* Mobile search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Tìm bất động sản..."
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 text-lg font-medium text-slate-600 hover:text-slate-900"
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
                
                <hr className="my-2 border-slate-100" />


                {!authLoading && (
                  <>
                    {user ? (
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/profile">
                            <User className="h-4 w-4 mr-2" />
                            Hồ sơ của tôi
                          </Link>
                        </Button>
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Cài đặt
                          </Link>
                        </Button>
                        <Button asChild onClick={() => setIsOpen(false)}>
                          <Link href={dashboardHref}>
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Vào trang quản trị
                          </Link>
                        </Button>
                        <Button variant="ghost" onClick={() => { signOut(); setIsOpen(false); }}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Đăng xuất
                        </Button>
                      </div>
                    ) : (
                      <Button asChild onClick={() => setIsOpen(false)}>
                        <Link href="/login">
                          <LogIn className="h-4 w-4 mr-2" />
                          Đăng nhập
                        </Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {!authLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 rounded-full p-0 flex items-center justify-center bg-accent-soft hover:bg-accent-soft border border-accent/20">
                  <User className="h-4 w-4 text-accent" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 border-b">
                  Tài khoản
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/customer/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500 group-focus:text-accent-foreground transition-colors" />
                    Hồ sơ của tôi
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/customer/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-500 group-focus:text-accent-foreground transition-colors" />
                    Cài đặt
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={dashboardHref} className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-slate-500 group-focus:text-accent-foreground transition-colors" />
                    Trang quản trị
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
