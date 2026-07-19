import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyJWT } from '@/lib/auth-utils';
import crypto from 'crypto';
import { generateOnboardingToken } from '@/lib/auth/onboarding-token';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

function parseCookie(cookieString: string, key: string): string | null {
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k.trim() === key) return decodeURIComponent(v.trim());
  }
  return null;
}

async function authenticate(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = parseCookie(cookieHeader, 'auth_token');
  if (!token) return null;
  return verifyJWT(token);
}

/** POST /api/managers  — Tạo quản lý mới và gửi email kích hoạt nếu có email */
export async function POST(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { created_by, updated_by, ...insertData } = body;

    // 0. Nếu có landlord_id, tạo mã code cho quản lý (landlord_code - x)
    if (insertData.landlord_id) {
      const { data: landlord } = await supabaseAdmin
        .from('landlords')
        .select('code')
        .eq('id', insertData.landlord_id)
        .single();
      
      if (landlord) {
        // Đếm số lượng manager hiện có của landlord này
        const { count } = await supabaseAdmin
          .from('managers')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', insertData.landlord_id);
          
        const nextX = (count || 0) + 1;
        const landlordCode = landlord.code || 'MNG'; // Fallback nếu landlord không có mã
        insertData.code = `${landlordCode}-${nextX}`;
      }
    }

    // 1. Chèn bản ghi quản lý vào database
    const { data: manager, error: managerError } = await supabaseAdmin
      .from('managers')
      .insert(insertData)
      .select()
      .single();

    if (managerError) return NextResponse.json({ error: managerError.message }, { status: 400 });

    let inviteLink = null;
    let emailSent = false;
    let emailError = null;

    // 2. Nếu quản lý có email, tự động tạo profile chưa kích hoạt và gửi email mời onboarding
    if (manager && manager.email) {
      const trimmedEmail = manager.email.trim().toLowerCase();
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, manager_id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (!existingProfile) {
        const profileId = crypto.randomUUID();

        // Tạo profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: profileId,
            company_id: manager.company_id,
            email: trimmedEmail,
            full_name: manager.name,
            phone: manager.phone,
            role: 'manager',
            is_active: false,
            manager_id: manager.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (!profileError) {
          // Sinh token onboarding (hiệu lực 48 giờ)
          const tokenPayload = generateOnboardingToken(48);

          // Lưu thông tin lời mời kích hoạt vào bảng tenant_invitations
          const { error: inviteError } = await supabaseAdmin
            .from('tenant_invitations')
            .insert({
              email: trimmedEmail,
              company_id: manager.company_id,
              profile_id: profileId,
              token_hash: tokenPayload.tokenHash,
              expires_at: tokenPayload.expiresAt.toISOString(),
            });

          if (!inviteError) {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            inviteLink = `${siteUrl}/onboarding?token=${tokenPayload.rawToken}`;

            try {
              const result = await sendEmail({
                to: trimmedEmail,
                subject: 'Lời mời kích hoạt tài khoản Quản lý tòa nhà - RealHome Business',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; margin-bottom: 20px; text-align: center;">Chào mừng bạn đến với RealHome Business</h2>
                    <p>Xin chào <strong>${manager.name}</strong>,</p>
                    <p>Bạn đã được phân công làm **Quản lý vận hành** trên hệ thống RealHome Business.</p>
                    <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu truy cập và bắt đầu theo dõi trạng thái các tòa nhà, phòng, hợp đồng và khách thuê thuộc quyền quản lý của bạn. Đường liên kết này có hiệu lực trong vòng 48 giờ.</p>
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
                emailError = result.error || 'Lỗi gửi email Mailjet không xác định';
              }
            } catch (err: any) {
              emailError = err.message || 'Lỗi gửi email không xác định';
            }
          } else {
            console.error('Lỗi tạo invitation token cho quản lý:', inviteError.message);
          }
        } else {
          console.error('Lỗi tạo profile cho quản lý:', profileError.message);
        }
      } else {
        // Profile đã tồn tại, đảm bảo manager_id được liên kết và role là manager
        if (existingProfile.manager_id !== manager.id) {
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({
              manager_id: manager.id,
              role: 'manager',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProfile.id);

          if (updateProfileError) {
            console.error('Lỗi cập nhật manager_id cho profile có sẵn:', updateProfileError.message);
          } else {
            emailSent = true; // Xem như thành công vì đã kết nối tài khoản
            console.log(`Đã cập nhật manager_id (${manager.id}) cho profile có sẵn (${trimmedEmail})`);
          }
        } else {
          emailSent = true; // Đã liên kết trước đó
        }
      }
    }

    return NextResponse.json({ data: manager, inviteLink, emailSent, emailError }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PUT /api/managers  — Cập nhật quản lý và gửi email kích hoạt nếu mới thêm email */
export async function PUT(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, created_by, updated_by, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { data: manager, error: managerError } = await supabaseAdmin
      .from('managers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (managerError) return NextResponse.json({ error: managerError.message }, { status: 400 });

    let inviteLink = null;
    let emailSent = false;
    let emailError = null;

    if (manager && manager.email) {
      const trimmedEmail = manager.email.trim().toLowerCase();
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, manager_id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (!existingProfile) {
        const profileId = crypto.randomUUID();

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: profileId,
            company_id: manager.company_id,
            email: trimmedEmail,
            full_name: manager.name,
            phone: manager.phone,
            role: 'manager',
            is_active: false,
            manager_id: manager.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (!profileError) {
          const tokenPayload = generateOnboardingToken(48);

          const { error: inviteError } = await supabaseAdmin
            .from('tenant_invitations')
            .insert({
              email: trimmedEmail,
              company_id: manager.company_id,
              profile_id: profileId,
              token_hash: tokenPayload.tokenHash,
              expires_at: tokenPayload.expiresAt.toISOString(),
            });

          if (!inviteError) {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            inviteLink = `${siteUrl}/onboarding?token=${tokenPayload.rawToken}`;

            try {
              const result = await sendEmail({
                to: trimmedEmail,
                subject: 'Lời mời kích hoạt tài khoản Quản lý tòa nhà - RealHome Business',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; margin-bottom: 20px; text-align: center;">Chào mừng bạn đến với RealHome Business</h2>
                    <p>Xin chào <strong>${manager.name}</strong>,</p>
                    <p>Bạn đã được phân công làm **Quản lý vận hành** trên hệ thống RealHome Business.</p>
                    <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu truy cập và bắt đầu theo dõi trạng thái các tòa nhà, phòng, hợp đồng và khách thuê thuộc quyền quản lý của bạn. Đường liên kết này có hiệu lực trong vòng 48 giờ.</p>
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
                emailError = result.error || 'Lỗi gửi email Mailjet không xác định';
              }
            } catch (err: any) {
              emailError = err.message || 'Lỗi gửi email không xác định';
            }
          } else {
            console.error('Lỗi tạo invitation token cho quản lý:', inviteError.message);
          }
        } else {
          console.error('Lỗi tạo profile cho quản lý:', profileError.message);
        }
      } else {
        if (existingProfile.manager_id !== manager.id) {
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({
              manager_id: manager.id,
              role: 'manager',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProfile.id);

          if (!updateProfileError) {
            emailSent = true;
          }
        } else {
          emailSent = true;
        }
      }
    }

    return NextResponse.json({ data: manager, inviteLink, emailSent, emailError }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

