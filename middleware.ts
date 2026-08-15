import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth-utils';

// ─── Route config ─────────────────────────────────────────────────────────────
const SUPER_ADMIN_PREFIXES = ['/super-admin'];
const COMPANY_PREFIXES = ['/admin'];
const LANDLORD_PREFIXES = ['/landlord'];
const BROKER_PREFIXES = ['/broker'];
const PROTECTED_PREFIXES = ['/admin', '/super-admin', '/landlord', '/broker'];

// Các route bỏ qua hoàn toàn không cần kiểm tra xác thực (API, assets, v.v.)
const SKIP_PREFIXES = ['/api', '/_next', '/favicon'];
// Các route /customer được phép truy cập không cần auth, nhưng middleware VẪN chạy
// để redirect Sale về /broker khi họ đã đăng nhập
const CUSTOMER_PREFIXES = ['/customer', '/onboarding'];

// ─── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // 1. Bỏ qua các route không cần auth (static assets, API, onboarding)
  const shouldSkip = SKIP_PREFIXES.some((p) => pathname.startsWith(p));
  if (shouldSkip) {
    return injectHeaders(NextResponse.next({ request }), hostname);
  }

  // 2. Đọc token JWT tùy chỉnh từ HTTP-only cookie
  let token = request.cookies.get('auth_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  const user = token ? await verifyJWT(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLoginPage = pathname === '/login';

  // 3a. Truy cập root '/' khi đã đăng nhập → redirect thẳng về dashboard tương ứng
  if (pathname === '/' && user) {
    const role = user.user_role || user.role;
    const destination =
      role === 'super_admin' ? '/super-admin' :
      role === 'landlord' ? '/landlord' :
      role === 'sales_agent' ? '/broker' :
      '/admin';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 3b. Sale đăng nhập cố vào /customer/properties → chuyển về /broker/rooms
  const isCustomerRoute = CUSTOMER_PREFIXES.some((p) => pathname.startsWith(p));
  if (isCustomerRoute && user) {
    const role = user.user_role || user.role;
    if (role === 'sales_agent') {
      if (pathname === '/customer/properties' || pathname === '/customer') {
        return NextResponse.redirect(new URL('/broker/rooms', request.url));
      }
      const buildingMatch = pathname.match(/^\/customer\/properties\/([^/]+)$/);
      if (buildingMatch && buildingMatch[1] !== 'rooms') {
        return NextResponse.redirect(new URL(`/broker/properties/${buildingMatch[1]}`, request.url));
      }
      const roomMatch = pathname.match(/^\/customer\/properties\/rooms\/([^/]+)$/);
      if (roomMatch) {
        return NextResponse.redirect(new URL(`/broker/properties/rooms/${roomMatch[1]}`, request.url));
      }
    }
    return injectHeaders(NextResponse.next({ request }), hostname);
  }

  // 3c. Đang ở trang login nhưng đã có session hợp lệ -> chuyển hướng đến trang dashboard tương ứng
  if (isLoginPage && user) {
    const role = user.user_role || user.role;
    const destination =
      role === 'super_admin' ? '/super-admin' :
      role === 'landlord' ? '/landlord' :
      role === 'sales_agent' ? '/broker' :
      '/admin';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 4. Cố truy cập trang quản trị nhưng chưa đăng nhập hoặc token không hợp lệ -> chuyển hướng về /login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Đã đăng nhập -> Kiểm tra phân quyền truy cập các thư mục
  if (isProtected && user) {
    const role = user.user_role || user.role;

    if (role) {
      const isSuperAdminRoute = SUPER_ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
      const isCompanyRoute = COMPANY_PREFIXES.some((p) => pathname.startsWith(p));
      const isLandlordRoute = LANDLORD_PREFIXES.some((p) => pathname.startsWith(p));
      const isBrokerRoute = BROKER_PREFIXES.some((p) => pathname.startsWith(p));

      if (isSuperAdminRoute && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      if (isCompanyRoute && role === 'super_admin') {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      }

      if (isCompanyRoute && role === 'landlord') {
        return NextResponse.redirect(new URL('/landlord', request.url));
      }

      // Môi giới (sales_agent) cố vào /admin -> chuyển sang bàn làm việc Môi giới (/broker)
      if (isCompanyRoute && role === 'sales_agent') {
        return NextResponse.redirect(new URL('/broker', request.url));
      }

      if ((isCompanyRoute || isLandlordRoute || isBrokerRoute || isSuperAdminRoute) && (role === 'customer' || role === 'tenant')) {
        return NextResponse.redirect(new URL('/customer/tenant-portal', request.url));
      }
    }
  }

  return injectHeaders(NextResponse.next({ request }), hostname);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function injectHeaders(response: NextResponse, hostname: string): NextResponse {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost';
  let companyDomain: string | null = null;

  if (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.startsWith('192.168.')
  ) {
    const withoutPort = hostname.split(':')[0];
    if (withoutPort !== rootDomain) {
      companyDomain = withoutPort;
    }
  }

  if (companyDomain) {
    response.headers.set('x-company-domain', companyDomain);
  }
  response.headers.set('x-forwarded-host', hostname);

  return response;
}

// ─── Matcher config ────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
