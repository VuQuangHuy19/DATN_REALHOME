import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu userId' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true } as any)
      .or(`recipient_id.eq.${userId},recipient_id.is.null`)
      .eq('is_read', false);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
