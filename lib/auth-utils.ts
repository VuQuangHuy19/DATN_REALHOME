import * as jose from 'jose';

/**
 * Hỗ trợ băm mật khẩu bằng thuật toán SHA-256 kết hợp với muối AUTH_SALT.
 * AUTH_SALT được cấu hình ở môi trường server-side (.env.local) để ngăn chặn
 * việc dò quét rainbow table và bảo mật mật khẩu lưu trong cơ sở dữ liệu.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = process.env.AUTH_SALT || '';
  if (!salt) {
    console.warn('CẢNH BÁO: AUTH_SALT chưa được định nghĩa trong môi trường!');
  }
  
  const encoder = new TextEncoder();
  // Kết hợp mật khẩu gốc với muối AUTH_SALT trước khi băm
  const data = encoder.encode(password + salt);
  
  // Sử dụng Web Crypto API (được hỗ trợ ở cả Node.js và Edge Runtime)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Chuyển sang dạng chuỗi thập lục phân (hex string)
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// JWT_SECRET dùng để ký và xác thực token JWT, phải được bảo mật ở phía Server
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET chưa được định nghĩa trong môi trường!');
  }
  return new TextEncoder().encode(secret);
};

/**
 * Ký JWT token chứa thông tin của người dùng (payload).
 */
export async function signJWT(payload: Record<string, any>, expiresIn: string = '7d'): Promise<string> {
  const secret = getJWTSecret();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Xác thực JWT token và giải mã lấy dữ liệu payload. Trả về null nếu token hết hạn hoặc không hợp lệ.
 */
export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    // Token không hợp lệ hoặc đã hết hạn
    return null;
  }
}

/**
 * Lấy toàn bộ dữ liệu session bao gồm profile, company và permissions từ database phía máy chủ.
 * Cơ chế này chạy ở server-side dùng supabaseAdmin nên bỏ qua được các ràng buộc RLS client-side.
 */
export async function fetchUserSessionData(userId: string) {
  const { supabaseAdmin } = await import('./supabase/admin');
  
  // 1. Lấy thông tin profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return { profile: null, company: null, permissions: [] };
  }

  // 2. Lấy thông tin company
  let company = null;
  if (profile.company_id) {
    const { data: companyData } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .maybeSingle();
    company = companyData;
  }

  // 3. Tính toán danh sách quyền (permissions)
  let permissions: string[] = [];
  const role = profile.role;
  const companyId = profile.company_id;

  if (role === 'super_admin' || role === 'company_admin') {
    permissions = ['*'];
  } else if (role === 'landlord') {
    permissions = [
      'buildings.read',
      'rooms.read',
      'contracts.read',
      'invoices.read',
      'services.read',
      'reports.read'
    ];
  } else if (role && companyId) {
    try {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('position')
        .eq('id', userId)
        .maybeSingle();

      if (employee?.position) {
        const { data: roleData } = await supabaseAdmin
          .from('roles')
          .select('permissions')
          .eq('company_id', companyId)
          .eq('name', employee.position)
          .maybeSingle();

        if (roleData?.permissions) {
          permissions = roleData.permissions;
        }
      }
    } catch (e) {
      console.error('Lỗi khi lấy danh sách quyền trên server:', e);
    }
  }

  return {
    profile,
    company,
    permissions,
  };
}
