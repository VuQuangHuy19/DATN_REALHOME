import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth-utils';

// ─── Route config ─────────────────────────────────────────────────────────────
const SUPER_ADMIN_PREFIXES = ['/super-admin'];
const COMPANY_PREFIXES = ['/admin'];
const LANDLORD_PREFIXES = ['/landlord'];
const PROTECTED_PREFIXES = ['/admin', '/super-admin', '/landlord'];

// Các route bỏ qua hoàn toàn không cần kiểm tra xác thực (API, assets, v.v.)
const SKIP_PREFIXES = ['/api', '/_next', '/favicon', '/customer', '/onboarding'];

// ─── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // 1. Bỏ qua các route không cần auth
  const shouldSkip = SKIP_PREFIXES.some((p) => pathname.startsWith(p));
  if (shouldSkip) {
    return injectHeaders(NextResponse.next({ request }), hostname);
  }

  // 2. Đọc token JWT tùy chỉnh từ HTTP-only cookie
  // Cookie JWT_SECRET được dùng ở server-side để giải mã và kiểm tra chữ ký ở hàm verifyJWT
  const token = request.cookies.get('auth_token')?.value;
  const user = token ? await verifyJWT(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLoginPage = pathname === '/login';

  // 3. Đang ở trang login nhưng đã có session hợp lệ -> chuyển hướng đến trang dashboard tương ứng
  if (isLoginPage && user) {
    const role = user.user_role || user.role;
    const destination =
      role === 'super_admin' ? '/super-admin' :
      role === 'landlord' ? '/landlord' :
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

      // Quản trị viên của công ty cố vào trang super-admin -> về trang admin của họ
      if (isSuperAdminRoute && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      // Super admin cố vào trang của một công ty đơn lẻ -> về trang super-admin
      if (isCompanyRoute && role === 'super_admin') {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      }

      // Chủ nhà (landlord) cố vào /admin -> chuyển sang /landlord
      if (isCompanyRoute && role === 'landlord') {
        return NextResponse.redirect(new URL('/landlord', request.url));
      }

      // Người không phải landlord cố vào /landlord -> chuyển về /admin
      if (isLandlordRoute && role !== 'landlord' && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  // 6. Cho phép đi tiếp và đính kèm các headers bổ trợ cho Server Components
  return injectHeaders(NextResponse.next({ request }), hostname);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Inject headers hỗ trợ cho Server Components và layout:
 * - x-company-domain: subdomain của công ty (multi-tenant routing)
 * - x-forwarded-host: hostname gốc
 */
function injectHeaders(response: NextResponse, hostname: string): NextResponse {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost';
  let companyDomain: string | null = null;

  if (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.startsWith('192.168.')
  ) {
    const withoutPort = hostname.split(':')[0];
    if (withoutPort.endsWith(`.${rootDomain}`)) {
      companyDomain = withoutPort.slice(0, -(rootDomain.length + 1));
    } else if (withoutPort !== rootDomain) {
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
    /*
     * Áp dụng middleware cho tất cả routes TRỪ:
     * - _next/static, _next/image (static assets)
     * - favicon.ico
     * - Các file ảnh tĩnh (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
