import { supabaseAdmin } from './supabase/admin';

/**
 * Lấy toàn bộ dữ liệu session bao gồm profile, company và permissions từ database phía máy chủ.
 * Cơ chế này chạy ở server-side dùng supabaseAdmin nên bỏ qua được các ràng buộc RLS client-side.
 */
export async function fetchUserSessionData(userId: string) {
  // 1. Lấy thông tin profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, company_id, is_active, phone, avatar_url, landlord_id, created_at, updated_at')
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

    // Kiểm tra và tự động cập nhật trạng thái suspended nếu hết hạn dùng thử/đăng ký
    if (company && company.status !== 'suspended') {
      try {
        const now = new Date();
        const isTrialActive = company.trial_ends_at && new Date(company.trial_ends_at) > now;
        
        if (!isTrialActive) {
          const { data: activeSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('company_id', company.id)
            .eq('status', 'active')
            .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
            .limit(1)
            .maybeSingle();

          if (!activeSub) {
            await supabaseAdmin
              .from('companies')
              .update({ status: 'suspended', updated_at: now.toISOString() })
              .eq('id', company.id);
            company.status = 'suspended';
          }
        }
      } catch (e) {
        console.error('Lỗi kiểm tra trạng thái đăng ký công ty:', e);
      }
    }
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
