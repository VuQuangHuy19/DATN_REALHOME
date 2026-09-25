import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { signJWT } from '@/lib/auth-utils';
import { hashPassword, verifyPassword } from '@/lib/password-utils';

export const runtime = 'nodejs';

/**
 * POST /api/company/setup
 * Cho phép người dùng (đã đăng nhập hoặc khách vãng lai/tab ẩn danh) tự tạo công ty và trở thành Company Admin.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_name, company_phone, company_address, owner_name, owner_email, password } = body;

    let targetProfile: any = null;

    // 1. Thử lấy thông tin xác thực từ request (Phiên làm việc hiện tại)
    const auth = await requireApiAuth(request, ['customer', 'company_admin', 'manager', 'sales_agent', 'landlord', 'tenant'] as any);

    if (!isApiError(auth)) {
      // Người dùng ĐÃ đăng nhập
      targetProfile = auth.profile;

      if (targetProfile.company_id) {
        return NextResponse.json(
          { error: 'Tài khoản của bạn đã được liên kết với một công ty.' },
          { status: 400 }
        );
      }
    } else {
      // Người dùng CHƯA đăng nhập (Tab ẩn danh / Guest)
      if (!company_name || !company_phone || !owner_name || !owner_email || !password) {
        return NextResponse.json(
          { error: 'Vui lòng cung cấp đầy đủ Email và Mật khẩu khởi tạo để đăng ký tài khoản Chủ doanh nghiệp.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự.' },
          { status: 400 }
        );
      }

      const inputEmail = owner_email.trim().toLowerCase();
      const inputPhone = company_phone.trim();

      // Kiểm tra xem profile đã tồn tại trong CSDL chưa
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`email.eq.${inputEmail},phone.eq.${inputPhone}`)
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.company_id) {
          return NextResponse.json(
            { error: 'Email hoặc Số điện thoại này đã được gán cho một công ty khác.' },
            { status: 400 }
          );
        }

        // Kiểm tra mật khẩu nếu profile đã có password_hash
        if (existingProfile.password_hash) {
          const { valid } = await verifyPassword(password, existingProfile.password_hash);
          if (!valid) {
            return NextResponse.json(
              { error: 'Tài khoản đã tồn tại trên hệ thống. Mật khẩu nhập vào không chính xác.' },
              { status: 401 }
            );
          }
        }
        targetProfile = existingProfile;
      } else {
        // Tạo tài khoản Supabase Auth
        let userId = crypto.randomUUID();
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
            email: inputEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              full_name: owner_name.trim(),
            },
          });
          if (authUser?.user) {
            userId = authUser.user.id;
          }
        } catch (err) {
          console.log('Không thể tạo Supabase Auth User, tiếp tục với UUID:', err);
        }

        // Băm mật khẩu và tạo profile mới
        const passwordHash = await hashPassword(password);
        const { data: newProfile, error: profileInsertErr } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: inputEmail,
            full_name: owner_name.trim(),
            phone: inputPhone,
            password_hash: passwordHash,
            role: 'company_admin',
            is_active: true,
          } as any)
          .select()
          .single();

        if (profileInsertErr || !newProfile) {
          console.error('Lỗi khởi tạo profile chủ doanh nghiệp:', profileInsertErr);
          return NextResponse.json(
            { error: `Không thể khởi tạo tài khoản: ${profileInsertErr?.message || 'Lỗi CSDL'}` },
            { status: 500 }
          );
        }
        targetProfile = newProfile;
      }
    }

    if (!company_name || !company_phone || !owner_name) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ: Tên công ty, Số điện thoại, Tên đại diện.' },
        { status: 400 }
      );
    }

    // 2. Tạo mã company code ngắn tự động
    const rawCode = company_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 6);
    const companyCode = `${rawCode}-${Date.now().toString().slice(-4)}`;

    // 3. Tạo bản ghi Company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: company_name.trim(),
        code: companyCode,
        owner_name: owner_name.trim(),
        owner_email: targetProfile.email || owner_email?.trim() || '',
        phone: company_phone.trim(),
        address: company_address?.trim() || '',
        plan: 'starter',         // Mặc định gói Starter (dùng thử)
        status: 'trial',         // Trạng thái dùng thử, chờ nâng cấp
        total_users: 1,
        total_properties: 0,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 ngày trial
      } as any)
      .select('id, name, code, plan, status')
      .single();

    if (companyError) {
      console.error('Lỗi tạo công ty:', companyError);
      return NextResponse.json(
        { error: `Không thể tạo công ty: ${companyError.message}` },
        { status: 500 }
      );
    }

    // 4. Nâng quyền profile lên company_admin và gán company_id
    const { error: updateProfileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: company.id,
        role: 'company_admin',
        full_name: owner_name.trim(),
      })
      .eq('id', targetProfile.id);

    if (updateProfileErr) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: `Không thể cập nhật quyền tài khoản: ${updateProfileErr.message}` },
        { status: 500 }
      );
    }

    // 5. Cấp phát JWT token & cookie cho tài khoản
    const tokenPayload = {
      sub: targetProfile.id,
      role: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        id: targetProfile.id,
        role: 'company_admin',
        company_id: company.id,
      },
      id: targetProfile.id,
      email: targetProfile.email,
      user_role: 'company_admin',
      company_id: company.id,
    };

    const token = await signJWT(tokenPayload, '60m');

    const response = NextResponse.json({
      success: true,
      company,
      token,
      message: `Công ty "${company.name}" đã được khởi tạo thành công!`,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('Lỗi /api/company/setup:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
