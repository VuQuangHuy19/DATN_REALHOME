import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || auth.profile.company_id;

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    if (auth.profile.role !== 'super_admin' && auth.profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role, is_active, kyc_status, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(profiles ?? []);
  } catch (error: any) {
    console.error('Lỗi lấy danh sách tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { full_name, email, phone, role, password } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ Họ tên, Email và Vai trò tài khoản' },
        { status: 400 }
      );
    }

    const companyId = auth.profile.company_id;
    if (!companyId && auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Thiếu thông tin công ty' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Kiểm tra email trùng lặp trong profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Email này đã được sử dụng cho một tài khoản khác trong hệ thống' },
        { status: 400 }
      );
    }

    // 2. Tạo tài khoản trong Supabase Auth
    const initialPassword = password?.trim() || 'RealHome@2026!';
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        company_id: companyId,
        role,
      },
    });

    if (authError) {
      return NextResponse.json({ error: 'Lỗi tạo tài khoản Auth: ' + authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 3. Upsert vào bảng profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      company_id: companyId,
      full_name,
      email: cleanEmail,
      phone: phone || null,
      role: role || 'employee',
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Lỗi đồng bộ hồ sơ: ' + profileError.message }, { status: 400 });
    }

    // 4. Đồng bộ tạo bản ghi trong bảng employees
    await supabaseAdmin.from('employees').upsert({
      id: userId,
      company_id: companyId,
      profile_id: userId,
      full_name,
      email: cleanEmail,
      phone: phone || null,
      role: role || 'employee',
      position: role || 'employee',
      status: 'active',
      updated_at: new Date().toISOString(),
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo tài khoản người dùng mới thành công',
      user: { id: userId, email: cleanEmail, full_name, role },
    });
  } catch (error: any) {
    console.error('Lỗi tạo tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { userId, full_name, phone, role, is_active } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu thông tin mã tài khoản (userId)' }, { status: 400 });
    }

    // Kiểm tra tài khoản mục tiêu
    const { data: targetProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, role, email')
      .eq('id', userId)
      .single();

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản trong hệ thống' }, { status: 404 });
    }

    if (auth.profile.role !== 'super_admin' && targetProfile.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateProfileData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updateProfileData.full_name = full_name;
    if (phone !== undefined) updateProfileData.phone = phone;
    if (role !== undefined) updateProfileData.role = role;
    if (is_active !== undefined) updateProfileData.is_active = is_active;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(updateProfileData)
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Đồng bộ sang bảng employees nếu có
    const updateEmpData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updateEmpData.full_name = full_name;
    if (phone !== undefined) updateEmpData.phone = phone;
    if (role !== undefined) {
      updateEmpData.role = role;
      updateEmpData.position = role;
    }
    if (is_active !== undefined) updateEmpData.status = is_active ? 'active' : 'inactive';

    await supabaseAdmin.from('employees').update(updateEmpData).eq('profile_id', userId);

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Lỗi cập nhật tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { userId, is_active, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
    }

    const { data: targetProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, role, email')
      .eq('id', userId)
      .single();

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    if (auth.profile.role !== 'super_admin' && targetProfile.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'toggle_status') {
      if (!is_active && userId === auth.profile.id) {
        return NextResponse.json(
          { error: 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập' },
          { status: 400 }
        );
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await supabaseAdmin
        .from('employees')
        .update({ status: is_active ? 'active' : 'inactive' })
        .eq('profile_id', userId);

      return NextResponse.json({ success: true, user: updated });
    }

    if (action === 'reset_password') {
      if (!targetProfile.email) {
        return NextResponse.json({ error: 'Tài khoản không có email' }, { status: 400 });
      }
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const { error: resetErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: targetProfile.email,
        options: {
          redirectTo: `${siteUrl}/auth/reset-password`,
        },
      });

      if (resetErr) throw resetErr;

      return NextResponse.json({
        success: true,
        message: `Đã phát lệnh đặt lại mật khẩu cho ${targetProfile.email}`,
      });
    }

    return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Lỗi cập nhật tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu mã tài khoản (userId)' }, { status: 400 });
    }

    if (userId === auth.profile.id) {
      return NextResponse.json(
        { error: 'Không thể tự xóa tài khoản Quản trị viên đang đăng nhập' },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, role, email')
      .eq('id', userId)
      .single();

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản cần xóa' }, { status: 404 });
    }

    if (auth.profile.role !== 'super_admin' && targetProfile.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Xóa trong bảng employees
    await supabaseAdmin.from('employees').delete().eq('profile_id', userId);

    // 2. Xóa trong bảng profiles
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 3. Xóa người dùng trong Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (authDelErr) {
      console.warn('Lỗi khi xóa người dùng trong Auth:', authDelErr);
    }

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công' });
  } catch (error: any) {
    console.error('Lỗi xóa tài khoản:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
