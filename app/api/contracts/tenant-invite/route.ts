import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateOnboardingToken } from '@/lib/auth/onboarding-token';
import { sendEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const {
      company_id,
      email,
      full_name,
      phone,
      contract_code,
      room_code,
      building_name,
      rental_contract_id,
    } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    const companyId = company_id || auth.profile.company_id;

    // 1. Kiểm tra xem profile đã tồn tại chưa
    let profileId: string | null = null;
    let isActive = false;

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      profileId = existingProfile.id;
      isActive = existingProfile.is_active;
    } else {
      // 2. Tạo profile mới cho Khách thuê (role: 'tenant', is_active: false)
      const userId = crypto.randomUUID();
      const { data: newProf, error: profErr } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          company_id: companyId,
          email,
          full_name: full_name || 'Khách thuê',
          phone: phone || null,
          role: 'tenant',
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profErr) {
        console.error('Lỗi tạo profile cho khách thuê:', profErr);
      } else if (newProf) {
        profileId = newProf.id;
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (isActive) {
      // Nếu tài khoản đã active -> gửi email thông báo truy cập Cổng thông tin khách thuê
      const portalLink = `${siteUrl}/customer/tenant-portal`;
      await sendEmail({
        to: email,
        subject: `[RealHome] Hợp đồng mới - Cổng thông tin khách thuê`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Hợp đồng mới đã được khởi tạo</h2>
            <p>Xin chào <strong>${full_name || 'Khách thuê'}</strong>,</p>
            <p>Hợp đồng của bạn ${room_code ? `cho phòng <strong>${room_code}</strong>${building_name ? ` (${building_name})` : ''}` : ''} đã được cập nhật thành công trên hệ thống <strong>RealHome</strong>.</p>
            <p>Tài khoản của bạn đã hoạt động. Vui lòng đăng nhập Cổng thông tin khách thuê để tra cứu chi tiết hợp đồng, lịch thanh toán và hóa đơn dịch vụ.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${portalLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Truy cập Cổng thông tin khách thuê</a>
            </div>
          </div>
        `,
      });

      return NextResponse.json({
        success: true,
        message: 'Tài khoản đã được kích hoạt từ trước. Đã gửi mail thông báo truy cập.',
        isActive: true,
      });
    }

    // 3. Nếu chưa kích hoạt -> Tạo token onboarding (Hiệu lực 72 giờ cho khách thuê)
    const tokenPayload = generateOnboardingToken(72);
    const { error: inviteErr } = await supabaseAdmin
      .from('tenant_invitations')
      .insert({
        email,
        company_id: companyId,
        rental_contract_id: rental_contract_id || null,
        phone: phone || null,
        full_name: full_name || null,
        token: tokenPayload.rawToken,
        expires_at: tokenPayload.expiresAt.toISOString(),
        status: 'pending',
      } as any);

    if (inviteErr) {
      console.error('Lỗi ghi tenant_invitations:', inviteErr);
    }

    const inviteLink = `${siteUrl}/onboarding?token=${tokenPayload.rawToken}`;

    // 4. Gửi email kích hoạt tài khoản
    await sendEmail({
      to: email,
      subject: `[RealHome] Lời mời kích hoạt tài khoản Cổng thông tin khách thuê${contract_code ? ` - HĐ ${contract_code}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0 0 8px 0;">Chào mừng bạn đến với RealHome</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Cổng thông tin quản lý thuê nhà dành cho Khách thuê</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p>Xin chào <strong>${full_name || 'Khách thuê'}</strong>,</p>
          <p>Hợp đồng của bạn ${room_code ? `cho phòng <strong>${room_code}</strong>${building_name ? ` (${building_name})` : ''}` : ''} đã được khởi tạo thành công trên hệ thống RealHome.</p>
          <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu và hoàn tất việc kích hoạt tài khoản của bạn. Sau khi kích hoạt, bạn có thể đăng nhập để theo dõi hợp đồng, hóa đơn, đóng tiền và báo sự cố phòng.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Kích hoạt tài khoản ngay</a>
          </div>
          <p style="color: #64748b; font-size: 13px;">Nếu nút trên không hoạt động, bạn có thể sao chép liên kết sau dán vào trình duyệt:</p>
          <p style="color: #4f46e5; font-size: 12px; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 6px;">${inviteLink}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động từ RealHome. Vui lòng không trả lời trực tiếp email này.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Đã gửi email mời kích hoạt tài khoản cho khách thuê thành công!',
      inviteLink,
      expiresAt: tokenPayload.expiresAt,
    });
  } catch (err: any) {
    console.error('Lỗi khi mời khách thuê kích hoạt tài khoản:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
