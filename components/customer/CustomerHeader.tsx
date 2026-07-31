'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { Menu, Home, Building2, Phone, Search, Heart, MessageSquare, LogIn, LayoutDashboard, LogOut, User, Settings, Calendar, FileText, Receipt, Wrench, Bell, ClipboardList, Briefcase } from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function CustomerHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { user, profile, role, signOut, loading: authLoading } = useAuth();

  // Chỉ hiện nút "Đăng ký Doanh nghiệp" khi là customer và chưa có company
  const isCustomerWithoutCompany = (role as string) === 'customer' && !profile?.company_id;

  const userName = profile?.full_name || user?.user_metadata?.full_name || 'bạn';

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
    const r = role as string | null | undefined;
    if (r === 'super_admin') return '/super-admin';
    if (r === 'landlord') return '/landlord';
    if (r === 'company_admin' || r === 'admin' || r === 'manager' || r === 'sales_agent' || r === 'accountant') return '/admin';
    // Tenant / khách vãng lai -> portal thuê
    return '/customer/tenant-portal';
  })();

  // Nhãn hiển thị cho nút Dashboard trong Dropdown
  const dashboardLabel = (() => {
    const r = role as string | null | undefined;
    if (r === 'super_admin') return 'Trang quản trị hệ thống';
    if (r === 'landlord') return 'Trang quản lý Chủ nhà';
    if (r === 'company_admin' || r === 'admin' || r === 'manager' || r === 'sales_agent' || r === 'accountant') return 'Trang quản trị';
    return 'Cổng quản lý Căn hộ';
  })();

  // Trang settings theo role
  const settingsHref = role && (role as string) !== 'tenant'
    ? '/admin/profile'
    : '/customer/tenant-portal/settings';

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

  const isTenantPortal = pathname.startsWith('/customer/tenant-portal');

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors",
      isTenantPortal && "lg:ml-64 lg:w-[calc(100%-16rem)]"
    )}>
      <div className="container mx-auto px-4 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-4">

        {/* Left: Logo (Hidden on desktop in tenant portal because dark sidebar renders Logo) */}
        <Link href="/customer/properties" className={cn("flex items-center flex-shrink-0 mr-2 md:mr-4", isTenantPortal && "lg:hidden")}>
          <Logo className="text-[20px] md:text-[28px]" />
        </Link>

        {/* Center: Search bar */}
        <div className="hidden md:flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-amber-400 pointer-events-none" />
            <Input
              placeholder="Tìm bất động sản, địa chỉ, khu vực..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-amber-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
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
                  className={`text-sm font-extrabold px-4 py-2 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                      : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          

          <ThemeToggle />

          {!authLoading && !user && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button size="sm" variant="outline" className="hidden sm:inline-flex h-9 px-3 text-xs font-semibold border-slate-300 dark:border-slate-700" asChild>
                <Link href="/register">
                  <User className="h-3.5 w-3.5 mr-1" />
                  Đăng ký
                </Link>
              </Button>
              <Button size="sm" className="h-9 px-3 sm:px-4 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm" asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-1 sm:mr-1.5" />
                  Đăng nhập
                </Link>
              </Button>
            </div>
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
                        {/* Hành động theo role */}
                        {role && (role as string) !== 'tenant' ? (
                          /* Admin / Landlord / Super Admin -> vào trang quản trị */
                          <Button variant="default" className="bg-accent text-white" asChild onClick={() => setIsOpen(false)}>
                            <Link href={dashboardHref} prefetch={true}>
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              {dashboardLabel}
                            </Link>
                          </Button>
                        ) : (
                          /* Tenant / khách đăng nhập thường -> Portal thuê */
                          <Button variant="default" className="bg-accent text-white" asChild onClick={() => setIsOpen(false)}>
                            <Link href="/customer/tenant-portal" prefetch={true}>
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Cổng quản lý Căn hộ
                            </Link>
                          </Button>
                        )}
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/contracts">
                            <FileText className="h-4 w-4 mr-2" />
                            Hợp đồng của tôi
                          </Link>
                        </Button>
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/invoices">
                            <Receipt className="h-4 w-4 mr-2" />
                            Hóa đơn &amp; Thanh toán
                          </Link>
                        </Button>
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/maintenance">
                            <Wrench className="h-4 w-4 mr-2" />
                            Yêu cầu bảo trì
                          </Link>
                        </Button>
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/notifications">
                            <Bell className="h-4 w-4 mr-2" />
                            Thông báo
                          </Link>
                        </Button>
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/customer/tenant-portal/settings">
                            <User className="h-4 w-4 mr-2" />
                            Thông tin cá nhân
                          </Link>
                        </Button>
                        {!!role && (
                          <Button asChild onClick={() => setIsOpen(false)}>
                            <Link href={dashboardHref}>
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Vào trang quản trị
                            </Link>
                          </Button>
                        )}
                        {/* Đăng ký Doanh nghiệp — mobile */}
                        {isCustomerWithoutCompany && (
                          <Button
                            variant="outline"
                            asChild
                            onClick={() => setIsOpen(false)}
                            className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <Link href="/setup-company" className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <div className="flex flex-col items-start">
                                <span className="font-bold">Đăng ký Doanh nghiệp</span>
                                <span className="text-xs font-normal opacity-70">Quản lý BĐS với RealHome</span>
                              </div>
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => { signOut(); setIsOpen(false); }}>
                          <LogOut className="h-4 w-4 mr-2 text-red-600" />
                          <span className="text-red-600 font-semibold">Đăng xuất</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button asChild onClick={() => setIsOpen(false)}>
                          <Link href="/login">
                            <LogIn className="h-4 w-4 mr-2" />
                            Đăng nhập
                          </Link>
                        </Button>
                        <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                          <Link href="/register">
                            <User className="h-4 w-4 mr-2" />
                            Tạo tài khoản mới
                          </Link>
                        </Button>
                      </div>
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
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800">
                  Chào <span className="text-amber-600 dark:text-amber-400">{userName}</span>
                </div>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={dashboardHref} prefetch={true} className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    {dashboardLabel}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={settingsHref} prefetch={true} className="flex items-center gap-2 font-medium cursor-pointer">
                    <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    Thông tin cá nhân
                  </Link>
                </DropdownMenuItem>
                {/* Nút Đăng ký Doanh nghiệp — chỉ hiện với customer chưa có công ty */}
                {isCustomerWithoutCompany && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href="/setup-company"
                        className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                      >
                        <Briefcase className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>Đăng ký Doanh nghiệp</span>
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Quản lý BĐS với RealHome</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer font-semibold"
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
