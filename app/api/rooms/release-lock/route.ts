import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { room_id } = body;

    if (!room_id) {
      return NextResponse.json({ error: 'Thiếu mã phòng' }, { status: 400 });
    }

    // Fetch room to verify that this user holds the lock
    const { data: room, error: roomErr } = await supabaseAdmin
      .from('rooms')
      .select('id, reserved_by_profile_id')
      .eq('id', room_id)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 });
    }

    // If held by current user, release it
    if (room.reserved_by_profile_id === auth.userId) {
      const { error: updateErr } = await supabaseAdmin
        .from('rooms')
        .update({
          status: 'available',
          reserved_until: null,
          reserved_by_profile_id: null,
        })
        .eq('id', room_id);

      if (updateErr) {
        throw updateErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Lỗi khi giải phóng phòng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
