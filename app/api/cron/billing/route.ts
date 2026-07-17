import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/billing
 * Cron job định kỳ quét thời hạn dùng thử/gói đăng ký của các công ty.
 * 1. Chuyển status = 'suspended' đối với công ty quá hạn.
 * 2. Gửi thông báo in-app và email nhắc nhở gia hạn trước 7 ngày, 3 ngày, 1 ngày.
 */
export async function GET(request: Request) {
  // Bảo vệ API cron bằng token bí mật để tránh người ngoài tự trigger vô tội vạ
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'Realhome2026_Cron';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // ─── PHẦN 1: QUÉT VÀ KHÓA CÁC CÔNG TY QUÁ HẠN ───────────────────────────────────────
    // Lấy tất cả công ty đang active hoặc trial để kiểm tra thời hạn
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('id, name, owner_email, owner_name, status, trial_ends_at')
      .neq('status', 'suspended');

    if (compErr) throw compErr;

    let suspendedCount = 0;
    let notifiedCount = 0;

    for (const company of companies) {
      let isExpired = false;
      const isTrialExpired = company.trial_ends_at && new Date(company.trial_ends_at) < now;

      if (isTrialExpired) {
        // Nếu trial hết hạn, kiểm tra xem có subscription nào active không
        const { data: activeSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
          .limit(1)
          .maybeSingle();

        if (!activeSub) {
          isExpired = true;
        }
      }

      if (isExpired) {
        // Tiến hành tạm khóa công ty
        await supabaseAdmin
          .from('companies')
          .update({ status: 'suspended', updated_at: now.toISOString() })
          .eq('id', company.id);

        suspendedCount++;

        // Gửi thông báo tới tất cả admin của công ty
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('company_id', company.id)
          .eq('role', 'company_admin')
          .eq('is_active', true);

        if (admins && admins.length > 0) {
          const notificationInserts = admins.map((admin: any) => ({
            company_id: company.id,
            title: 'Tài khoản doanh nghiệp đã bị khóa do hết hạn',
            body: `Doanh nghiệp ${company.name} đã hết hạn sử dụng. Vui lòng thanh toán gia hạn để khôi phục quyền ghi.`,
            type: 'system',
            recipient_id: admin.id,
            link: '/admin/system/billing',
            is_read: false
          }));

          await supabaseAdmin.from('notifications').insert(notificationInserts);
        }

        // Gửi email cho chủ công ty
        if (company.owner_email) {
          await sendEmail({
            to: company.owner_email,
            subject: `[RealHome] Thông báo tạm khóa tài khoản doanh nghiệp - ${company.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #dc2626; margin-bottom: 20px;">Thông báo hết hạn sử dụng dịch vụ</h2>
                <p>Kính chào Quý khách <strong>${company.owner_name}</strong>,</p>
                <p>Chúng tôi xin thông báo tài khoản doanh nghiệp <strong>${company.name}</strong> của quý khách đã bị khóa chức năng cập nhật (Thêm/Sửa/Xóa) do hết hạn dùng thử hoặc hết hạn gói dịch vụ mà chưa được gia hạn.</p>
                <p>Dữ liệu của quý khách vẫn được bảo toàn nguyên vẹn ở chế độ Chỉ đọc (Read-only).</p>
                <p>Vui lòng đăng nhập vào tài khoản Admin và truy cập trang <strong>Cài đặt hệ thống > Thanh toán</strong> để thực hiện gia hạn nhanh chóng qua PayOS.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động từ RealHome Business.</p>
              </div>
            `
          }).catch(err => console.error(`Lỗi gửi mail khóa công ty ${company.name}:`, err));
        }
      } else {
        // ─── PHẦN 2: GỬI NHẮC NHỞ GIA HẠN CHO CÁC CÔNG TY SẮP HẾT HẠN ────────────────────
        // Lấy ngày hết hạn thực tế (trial_ends_at hoặc ends_at của subscription)
        let expiryDate: Date | null = null;
        if (company.trial_ends_at) {
          expiryDate = new Date(company.trial_ends_at);
        }

        // Ưu tiên ngày hết hạn của subscription đang active nếu có
        const { data: activeSub } = await supabaseAdmin
          .from('subscriptions')
          .select('ends_at')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .order('ends_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSub?.ends_at) {
          expiryDate = new Date(activeSub.ends_at);
        }

        if (expiryDate) {
          const diffTime = expiryDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Nhắc nhở tại mốc 7 ngày, 3 ngày, 1 ngày
          if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
            notifiedCount++;
            
            // In-app notifications cho Admins
            const { data: admins } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('company_id', company.id)
              .eq('role', 'company_admin')
              .eq('is_active', true);

            if (admins && admins.length > 0) {
              const notificationInserts = admins.map((admin: any) => ({
                company_id: company.id,
                title: `Gói dịch vụ sắp hết hạn trong ${diffDays} ngày`,
                body: `Tài khoản doanh nghiệp của bạn sẽ bị tạm khóa nếu không gia hạn trước ngày ${expiryDate!.toLocaleDateString('vi-VN')}.`,
                type: 'system',
                recipient_id: admin.id,
                link: '/admin/system/billing',
                is_read: false
              }));
              await supabaseAdmin.from('notifications').insert(notificationInserts);
            }

            // Gửi email cho chủ doanh nghiệp
            if (company.owner_email) {
              await sendEmail({
                to: company.owner_email,
                subject: `[RealHome] Cảnh báo hết hạn gói dịch vụ trong ${diffDays} ngày - ${company.name}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #ea580c; margin-bottom: 20px;">Cảnh báo hết hạn dịch vụ</h2>
                    <p>Kính chào Quý khách <strong>${company.owner_name}</strong>,</p>
                    <p>Tài khoản doanh nghiệp <strong>${company.name}</strong> của quý khách sẽ hết hạn sử dụng vào ngày <strong>${expiryDate!.toLocaleDateString('vi-VN')}</strong> (còn <strong>${diffDays} ngày</strong>).</p>
                    <p>Để tránh bị gián đoạn công việc và tạm khóa tài khoản, kính mong quý khách sớm thực hiện gia hạn dịch vụ.</p>
                    <p>Vui lòng đăng nhập vào trang quản trị RealHome và truy cập <strong>Cài đặt hệ thống > Thanh toán</strong> để thực hiện gia hạn dịch vụ nhanh chóng.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">Đây là email tự động từ RealHome Business.</p>
                  </div>
                `
              }).catch(err => console.error(`Lỗi gửi mail nhắc nhở ${company.name}:`, err));
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      suspendedCompanies: suspendedCount,
      notifiedCompanies: notifiedCount
    });
  } catch (err: any) {
    console.error('Lỗi chạy billing cron job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
