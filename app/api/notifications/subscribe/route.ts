import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { saveSubscription } from '@/src/features/notifications/services/push-subscriptions';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Yêu cầu đăng nhập, mọi role đều có thể nhận thông báo
  const authResult = await requireApiAuth(request, [
    'super_admin', 'company_admin', 'manager', 'sales_agent', 'landlord'
  ]);

  if (isApiError(authResult)) {
    return authResult; // Trả về 401 hoặc 403
  }

  const { userId, profile } = authResult;

  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Dữ liệu subscription không hợp lệ' },
        { status: 400 }
      );
    }

    // Nếu là super_admin thì company_id có thể null, tạm thời bypass bằng cách ép kiểu 
    // vì bảng push_subscriptions yêu cầu company_id NOT NULL.
    // Đối với hệ thống này, hầu hết user đều có company_id (hoặc xử lý riêng cho super_admin).
    if (!profile.company_id) {
       return NextResponse.json(
        { error: 'User không thuộc company nào, không thể đăng ký thông báo.' },
        { status: 400 }
      );
    }

    await saveSubscription(
      userId,
      profile.company_id,
      endpoint,
      keys.p256dh,
      keys.auth
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Subscribe] Lỗi:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lưu subscription' },
      { status: 500 }
    );
  }
}
