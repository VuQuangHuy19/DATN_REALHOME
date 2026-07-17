import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { room_id, company_id } = body;

    if (!room_id || !company_id) {
      return NextResponse.json({ error: 'Thiếu mã phòng hoặc mã công ty' }, { status: 400 });
    }

    if (auth.profile.company_id !== company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch current room status and lock info
    const { data: room, error: roomErr } = await supabaseAdmin
      .from('rooms')
      .select('id, status, reserved_until, reserved_by_profile_id')
      .eq('id', room_id)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 });
    }

    const now = new Date();
    const isLocked =
      room.status === 'reserved' &&
      room.reserved_until &&
      new Date(room.reserved_until) > now &&
      room.reserved_by_profile_id !== auth.userId;

    if (isLocked) {
      return NextResponse.json({ 
        error: 'Phòng này đang được giữ chỗ bởi nhân viên khác!' 
      }, { status: 409 });
    }

    // If already rented or maintenance, cannot reserve
    if (room.status === 'rented' || room.status === 'maintenance') {
      return NextResponse.json({ 
        error: 'Phòng đang ở trạng thái không thể đặt cọc (đã cho thuê hoặc bảo trì).' 
      }, { status: 400 });
    }

    // 2. Set the 15-minute temporary lock
    const reservedUntil = new Date(now.getTime() + 15 * 60000).toISOString();

    const { data: updatedRoom, error: updateErr } = await supabaseAdmin
      .from('rooms')
      .update({
        status: 'reserved',
        reserved_until: reservedUntil,
        reserved_by_profile_id: auth.userId,
      })
      .eq('id', room_id)
      .select()
      .single();

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({ success: true, reserved_until: reservedUntil });
  } catch (error: any) {
    console.error('Lỗi khi giữ phòng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
