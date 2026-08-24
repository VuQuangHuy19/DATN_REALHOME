import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyJWT } from '@/lib/auth-utils';
import crypto from 'crypto';
import { generateOnboardingToken } from '@/lib/auth/onboarding-token';
import { sendEmail } from '@/lib/mail';
import { normalizeStringForMatching } from '@/lib/utils';

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

/** GET /api/landlords?companyId=xxx  — Lấy danh sách chủ nhà */
export async function GET(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    let query = supabaseAdmin
      .from('landlords')
      .select('*')
      .order('created_at', { ascending: false });

    if (companyId) query = query.eq('company_id', companyId);

    const { data: landlordsData, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Enriched with KYC verification statuses
    let kycMap = new Map<string, string>();
    try {
      const { data: kycData } = await supabaseAdmin
        .from('kyc_verifications')
        .select('landlord_id, user_id, status');

      if (kycData) {
        kycData.forEach((k: any) => {
          if (k.landlord_id) {
            kycMap.set(k.landlord_id, k.status);
          }
        });
      }
    } catch (kycErr) {
      console.warn('KYC verifications table not queried or empty:', kycErr);
    }

    const enrichedLandlords = (landlordsData ?? []).map((l: any) => {
      const kycStatusFromTable = kycMap.get(l.id);
      const finalKycStatus = kycStatusFromTable || l.kyc_status || 'unverified';
      const isVerified = finalKycStatus === 'approved' || finalKycStatus === 'verified' || l.is_kyc_verified === true;

      return {
        ...l,
        kyc_status: finalKycStatus === 'approved' ? 'verified' : finalKycStatus,
        is_kyc_verified: isVerified,
      };
    });

    return NextResponse.json({ data: enrichedLandlords });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/landlords  — Tạo chủ nhà mới */
export async function POST(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { created_by, updated_by, ...insertData } = body;

    // Check trùng chủ nhà trong cùng công ty trước khi tạo mới
    const companyId = insertData.company_id;
    let existingL = null;

    if (companyId) {
      const { data: existingList } = await supabaseAdmin
        .from('landlords')
        .select('*')
        .eq('company_id', companyId);

      const cleanCode = insertData.code ? String(insertData.code).trim().toLowerCase() : '';
      const normCode = insertData.code ? normalizeStringForMatching(insertData.code) : '';
      const normName = insertData.name ? normalizeStringForMatching(insertData.name) : '';
      const cleanPhone = insertData.phone ? String(insertData.phone).replace(/[^\d]/g, '') : '';
      const cleanEmail = insertData.email ? String(insertData.email).trim().toLowerCase() : '';

      existingL = (existingList || []).find((l: any) => {
        if (cleanCode && l.code && String(l.code).trim().toLowerCase() === cleanCode) return true;
        if (normCode && l.code && normalizeStringForMatching(l.code) === normCode) return true;
        if (cleanPhone && cleanPhone.length >= 8 && l.phone && String(l.phone).replace(/[^\d]/g, '') === cleanPhone) return true;
        if (cleanEmail && l.email && String(l.email).trim().toLowerCase() === cleanEmail) return true;
        if (normName && normName.length >= 2 && l.name && normalizeStringForMatching(l.name) === normName) return true;
        return false;
      });
    }

    let landlord = existingL;
    let landlordError = null;

    if (existingL) {
      // Update existing landlord instead of inserting duplicate
      const { data: updated, error: uErr } = await supabaseAdmin
        .from('landlords')
        .update({ ...insertData, updated_at: new Date().toISOString() })
        .eq('id', existingL.id)
        .select()
        .single();
      landlord = updated;
      landlordError = uErr;
    } else {
      const { data: inserted, error: iErr } = await supabaseAdmin
        .from('landlords')
        .insert(insertData)
        .select()
        .single();
      landlord = inserted;
      landlordError = iErr;
    }

    if (landlordError) return NextResponse.json({ error: landlordError.message }, { status: 400 });


    let inviteLink = null;
    let emailSent = false;
    let emailError = null;

    // 2. Nếu chủ nhà có email, tự động tạo profile chưa kích hoạt và gửi email mời onboarding
    if (landlord && landlord.email) {
      const trimmedEmail = landlord.email.trim().toLowerCase();
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, landlord_id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (!existingProfile) {
        const profileId = crypto.randomUUID();

        // Tạo profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: profileId,
            company_id: landlord.company_id,
            email: trimmedEmail,
            full_name: landlord.name,
            phone: landlord.phone,
            role: 'landlord',
            is_active: false,
            landlord_id: landlord.id,
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
              company_id: landlord.company_id,
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
                subject: 'Lời mời kích hoạt tài khoản Chủ nhà - RealHome Business',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #059669; margin-bottom: 20px; text-align: center;">Chào mừng bạn đến với RealHome Business</h2>
                    <p>Xin chào <strong>${landlord.name}</strong>,</p>
                    <p>Bạn đã được thêm làm **Chủ nhà** trên hệ thống quản lý bất động sản RealHome Business.</p>
                    <p>Vui lòng click vào nút bên dưới để thiết lập mật khẩu truy cập và bắt đầu theo dõi trạng thái tòa nhà, phòng, hợp đồng và hóa đơn doanh thu của bạn. Đường liên kết này có hiệu lực trong vòng 48 giờ.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${inviteLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:</p>
                    <p style="color: #059669; font-size: 13px; word-break: break-all;">${inviteLink}</p>
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
            console.error('Lỗi tạo invitation token cho chủ nhà:', inviteError.message);
          }
        } else {
          console.error('Lỗi tạo profile cho chủ nhà:', profileError.message);
        }
      } else {
        // Profile đã tồn tại, đảm bảo landlord_id được liên kết và role là landlord
        if (existingProfile.landlord_id !== landlord.id) {
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({
              landlord_id: landlord.id,
              role: 'landlord',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProfile.id);

          if (updateProfileError) {
            console.error('Lỗi cập nhật landlord_id cho profile có sẵn:', updateProfileError.message);
          } else {
            emailSent = true; // Xem như thành công vì đã kết nối tài khoản
            console.log(`Đã cập nhật landlord_id (${landlord.id}) cho profile có sẵn (${trimmedEmail})`);
          }
        } else {
          emailSent = true; // Đã liên kết trước đó
        }
      }
    }

    return NextResponse.json({ data: landlord, inviteLink, emailSent, emailError }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH /api/landlords — Cập nhật chủ nhà */
export async function PATCH(request: Request, context?: { params?: { id?: string } }) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { created_by, updated_by, id: bodyId, ...updateData } = body;
    const targetId = context?.params?.id || bodyId;

    if (!targetId) {
      return NextResponse.json({ error: 'Thiếu ID chủ nhà' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('landlords')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', targetId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
