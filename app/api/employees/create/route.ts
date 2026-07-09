import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateOnboardingToken } from '@/lib/auth/onboarding-token';
import { sendEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { company_id, name, email, phone, department, position, join_date, status } = body;

    if (!company_id || !email || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin công ty hoặc email nhân sự' }, { status: 400 });
    }

    if (auth.profile.company_id !== company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Lấy tên công ty
    const { data: companyData } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();
    
    const companyName = companyData?.name || 'RealHome';

    // 1. Tạo tài khoản trong Supabase Auth (Chưa kích hoạt password thực tế)
    // Đánh dấu email_confirm: true để tránh các email xác nhận tự động của Supabase
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        company_id,
        role: 'sales_agent',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Tạo bản ghi nhân sự trong bảng employees
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        id: userId,
        company_id,
        name,
        email,
        phone,
        department,
        position,
        join_date: join_date ? new Date(join_date).toISOString() : null,
        status: status || 'active',
      });

    if (employeeError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Lỗi lưu bảng nhân sự: ' + employeeError.message }, { status: 400 });
    }

    // 3. Cập nhật profile liên kết với company nhưng ở trạng thái inactive
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id,
        role: 'sales_agent',
        is_active: false, // Inactive cho đến khi hoàn thành đặt mật khẩu ở màn hình onboarding
        full_name: name,
        phone: phone || null,
      })
      .eq('id', userId);

    if (profileError) {
      await supabaseAdmin.from('employees').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Lỗi đồng bộ phân quyền: ' + profileError.message }, { status: 400 });
    }

    // 4. Tạo onboarding token (Hiệu lực 48 giờ)
    const tokenPayload = generateOnboardingToken(48);

    const { error: inviteError } = await supabaseAdmin
      .from('tenant_invitations')
      .insert({
        email,
        company_id,
        profile_id: userId,
        token_hash: tokenPayload.tokenHash,
        expires_at: tokenPayload.expiresAt.toISOString(),
      });

    if (inviteError) {
      await supabaseAdmin.from('employees').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Lỗi tạo liên kết mời: ' + inviteError.message }, { status: 400 });
    }

    // 5. Gửi email mời qua Mailjet
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const inviteLink = `${siteUrl}/onboarding?token=${tokenPayload.rawToken}`;

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const result = await sendEmail({
        to: email,
        subject: 'Lời mời kích hoạt tài khoản nhân viên RealHome Business',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 20px; text-align: center;">Chào mừng bạn đến với RealHome Business</h2>
            <p>Xin chào <strong>${name}</strong>,</p>
            <p>Bạn đã được mời làm <strong>Nhân viên</strong> cho doanh nghiệp <strong>${companyName}</strong> trên nền tảng RealHome Business.</p>
            <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu và hoàn tất việc kích hoạt tài khoản của bạn. Đường liên kết này có hiệu lực trong vòng 48 giờ.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
            </div>
            <p style="color: #64748b; font-size: 13px;">Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:</p>
            <p style="color: #4f46e5; font-size: 13px; word-break: break-all;">${inviteLink}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động, vui lòng không trả lời email này.</p>
          </div>
        `,
      });

      if (result.success) {
        emailSent = true;
      } else {
        emailError = result.error || 'Lỗi gửi email qua Mailjet không xác định';
      }
    } catch (err: any) {
      emailError = err.message || 'Lỗi gửi email không xác định';
    }

    return NextResponse.json({ success: true, employee_id: userId, emailSent, emailError }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
