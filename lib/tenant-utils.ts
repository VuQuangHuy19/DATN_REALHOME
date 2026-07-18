import { supabaseAdmin } from './supabase/admin';
import { DBCompany } from './supabase/types';

export type TenantInfo = Pick<DBCompany, 'id' | 'name' | 'domain' | 'logo_url' | 'theme_color'>;

/**
 * Lấy thông tin công ty dựa trên tên miền (domain).
 * Dùng supabaseAdmin vì truy vấn này có thể được gọi trước khi có Auth context (ví dụ: ở trang chủ, login).
 */
export async function getTenantByDomain(domain: string | null): Promise<TenantInfo | null> {
  if (!domain) return null;

  // Xóa port nếu có (vd: localhost:3000 -> localhost)
  const cleanDomain = domain.split(':')[0];

  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, domain, logo_url, theme_color')
    .eq('domain', cleanDomain)
    .single();

  if (error || !data) {
    return null;
  }

  return data as TenantInfo;
}

/**
 * Hàm hỗ trợ tạo CSS Variables cho Tailwind CSS dựa trên theme_color.
 */
export function getTenantStyleVariables(themeColor?: string | null) {
  if (!themeColor) {
    // Trả về biến mặc định (Xanh Navy hiện tại)
    return {
      '--primary-color': '#1e3a8a', // text-slate-900 / blue đậm
    } as React.CSSProperties;
  }

  return {
    '--primary-color': themeColor,
  } as React.CSSProperties;
}
