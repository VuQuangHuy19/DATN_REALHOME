import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { notify } from '@/lib/notifications/notify';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Chỉ nhân viên/admin mới được trigger thông báo này
  const authResult = await requireApiAuth(request, ['super_admin', 'company_admin', 'manager', 'sales_agent']);
  if (isApiError(authResult)) return authResult;

  const { profile } = authResult;

  try {
    const { appointmentId, newStatus } = await request.json();

    if (newStatus === 'Confirm') {
      // 1. Lấy thông tin lịch hẹn
      const { data: apt, error: aptError } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (aptError || !apt) {
        return NextResponse.json({ error: 'Không tìm thấy lịch hẹn' }, { status: 404 });
      }

      // 2. Tìm tài khoản của khách hàng dựa trên số điện thoại
      // Giả sử khách hàng đăng ký với cùng số điện thoại (normalized)
      if (apt.customer_phone) {
        const { data: customerProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', apt.customer_phone)
          .eq('role', 'tenant') // Đảm bảo đúng role khách hàng (nếu hệ thống bạn dùng 'tenant' hoặc tương tự)
          .maybeSingle();

        if (customerProfile) {
          // Khách hàng có tài khoản -> Bắn thông báo In-App + Push
          await notify({
            companyId: apt.company_id || profile.company_id, // Fallback nếu appointment thiếu company_id
            recipientId: customerProfile.id,
            type: 'appointment_confirmed',
            title: 'Lịch hẹn đã được xác nhận',
            message: `Lịch hẹn xem phòng ${apt.room_title || ''} vào lúc ${apt.time || ''} ngày ${apt.date || ''} đã được xác nhận.`,
            channels: ['in_app', 'push'], // Bỏ SMS cho phase này
            link: '/customer/appointments' // Đường dẫn khách hàng vào xem lịch hẹn của mình
          });
        } else {
          // Khách hàng không có tài khoản, sau này sẽ làm SMS ở đây
          console.log(`[Notify] Khách hàng ${apt.customer_phone} chưa có tài khoản, skip in_app/push (sẽ gửi SMS sau)`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API notify-status] Lỗi:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
