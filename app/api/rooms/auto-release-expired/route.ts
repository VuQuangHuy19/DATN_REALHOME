import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET/POST /api/rooms/auto-release-expired
 * Tự động giải phóng các phòng đang ở trạng thái 'reserved' nhưng:
 * 1. Hết hạn giữ chỗ tạm 15 phút (reserved_until < NOW())
 * 2. HOẶC không có hợp đồng đặt cọc nào còn hiệu lực ('active', 'signed')
 */
async function handleAutoRelease() {
  try {
    const nowISO = new Date().toISOString();

    // 1. Lấy tất cả phòng có status = 'reserved'
    const { data: reservedRooms, error: roomsErr } = await supabaseAdmin
      .from('rooms')
      .select('id, code, reserved_until, company_id')
      .eq('status', 'reserved');

    if (roomsErr) throw roomsErr;
    if (!reservedRooms || reservedRooms.length === 0) {
      return NextResponse.json({ success: true, releasedCount: 0, releasedRoomCodes: [] });
    }

    const reservedRoomIds = reservedRooms.map((r: any) => r.id);

    // 2. Lấy tất cả hợp đồng cọc còn hiệu lực ('active', 'signed') cho các phòng này
    const { data: activeDeposits, error: depErr } = await supabaseAdmin
      .from('deposit_contracts')
      .select('room_id')
      .in('room_id', reservedRoomIds)
      .in('status', ['active', 'signed']);

    if (depErr) throw depErr;

    const validRoomIdsWithDeposit = new Set((activeDeposits ?? []).map((d: any) => d.room_id).filter(Boolean));

    // 3. Lọc ra các phòng cần được nhả về 'available'
    const roomsToRelease = reservedRooms.filter((room: any) => {
      // Nếu phòng có HĐ cọc thực tế còn hiệu lực -> GIỮ NGUYÊN
      if (validRoomIdsWithDeposit.has(room.id)) {
        return false;
      }
      // Nếu không có HĐ cọc thực tế:
      // - Đã hết hạn reserved_until (< now)
      // - Hoặc reserved_until là null / không có mốc thời gian -> Coi là kẹt khóa tạm
      if (!room.reserved_until || new Date(room.reserved_until) < new Date(nowISO)) {
        return true;
      }
      return false;
    });

    if (roomsToRelease.length === 0) {
      return NextResponse.json({ success: true, releasedCount: 0, releasedRoomCodes: [] });
    }

    const idsToRelease = roomsToRelease.map((r: any) => r.id);
    const codesToRelease = roomsToRelease.map((r: any) => r.code);

    // 4. Giải phóng hàng loạt về status = 'available'
    const { error: updateErr } = await supabaseAdmin
      .from('rooms')
      .update({
        status: 'available',
        reserved_until: null,
        reserved_by_profile_id: null,
        updated_at: nowISO,
      })
      .in('id', idsToRelease);

    if (updateErr) throw updateErr;

    console.log(`[Auto-Release] Đã tự động nhả ${roomsToRelease.length} phòng hết hạn khóa tạm:`, codesToRelease);

    return NextResponse.json({
      success: true,
      releasedCount: roomsToRelease.length,
      releasedRoomCodes: codesToRelease,
    });
  } catch (error: any) {
    console.error('Lỗi khi tự động giải phóng phòng hết hạn:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  return handleAutoRelease();
}

export async function POST() {
  return handleAutoRelease();
}
