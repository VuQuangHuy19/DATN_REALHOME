import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncGoogleDriveImagesForProperty } from '@/src/lib/services/google-drive';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { building_id, room_id, drive_url } = await req.json();

    if (!building_id && !room_id && !drive_url) {
      return NextResponse.json({ error: 'Cần truyền building_id, room_id hoặc drive_url' }, { status: 400 });
    }

    // 1. Đồng bộ 1 phòng cụ thể
    if (room_id && drive_url) {
      const urls = await syncGoogleDriveImagesForProperty(room_id, drive_url);
      return NextResponse.json({ success: true, count: urls.length, urls });
    }

    // 2. Đồng bộ theo Tòa nhà
    if (building_id) {
      // Lấy thông tin Tòa nhà
      const { data: bld } = await supabaseAdmin
        .from('buildings')
        .select('id, code, description, company_id')
        .or(`id.eq.${building_id},code.eq.${building_id}`)
        .maybeSingle();

      if (!bld) {
        return NextResponse.json({ error: 'Không tìm thấy Tòa nhà' }, { status: 404 });
      }

      // Lấy danh sách các phòng thuộc Tòa nhà này
      const { data: rooms } = await supabaseAdmin
        .from('rooms')
        .select('id, description, external_sync_id')
        .or(`building_id.eq.${bld.code},building_id.eq.${bld.id}`);

      let totalSynced = 0;
      const results: Record<string, string[]> = {};

      for (const r of (rooms || [])) {
        // Tìm Drive URL từ parameter truyền vào, hoặc từ mô tả phòng
        let targetDriveUrl = drive_url;

        if (!targetDriveUrl && r.description) {
          const match = r.description.match(/(https:\/\/drive\.google\.com\/[^\s\n]+)/);
          if (match) targetDriveUrl = match[1];
        }

        if (!targetDriveUrl && bld.description) {
          const match = bld.description.match(/(https:\/\/drive\.google\.com\/[^\s\n]+)/);
          if (match) targetDriveUrl = match[1];
        }

        if (targetDriveUrl) {
          console.log(`[Drive API Manual Sync] Đồng bộ phòng ${r.id} từ URL: ${targetDriveUrl}`);
          const urls = await syncGoogleDriveImagesForProperty(r.id, targetDriveUrl, bld.company_id || undefined);
          results[r.id] = urls;
          totalSynced += urls.length;
        }
      }

      return NextResponse.json({
        success: true,
        buildingId: bld.id,
        roomsCount: rooms?.length || 0,
        totalImagesSynced: totalSynced,
        results
      });
    }

    return NextResponse.json({ error: 'Thiếu dữ liệu yêu cầu.' }, { status: 400 });
  } catch (error: any) {
    console.error('[Drive Manual Sync API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
