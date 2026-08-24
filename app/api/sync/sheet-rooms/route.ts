import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseGoogleSheetFull } from '@/features/import/services/googleSheetAiParser';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/sync/sheet-rooms
 * Đồng bộ thủ công lại tất cả Google Sheet đang ACTIVE của công ty:
 *   1. Cập nhật trạng thái / giá phòng từ Sheet mới nhất
 *   2. Đánh dấu phòng không còn trong Sheet → "Đã thuê"
 *   3. Nhận diện ngày tháng → available_date (sắp trống)
 *   4. Gắn ảnh tòa nhà vào các phòng chưa có ảnh (cùng nguồn Drive)
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const companyId = auth.profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Tài khoản chưa thuộc công ty nào' }, { status: 400 });
    }

    // Lấy các Sheet đang ACTIVE của công ty
    const { data: syncConfigs, error } = await supabaseAdmin
      .from('landlord_sheet_syncs')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('company_id', companyId)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!syncConfigs || syncConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có Google Sheet nào cần đồng bộ. Hãy nhập Sheet trước.',
        syncedSheets: 0,
      });
    }

    let syncedCount = 0;
    let totalRoomsCreated = 0;
    let totalRoomsUpdated = 0;
    let totalRoomsMarkedRented = 0;
    const errors: string[] = [];

    for (const config of syncConfigs) {
      try {
        console.log(`[Sheet Sync Manual] Bắt đầu đồng bộ Sheet ID: ${config.sheet_id}`);

        // 1. Parse Sheet
        const parsed = await parseGoogleSheetFull(config.sheet_url);

        if (!parsed || !parsed.buildings || parsed.buildings.length === 0) {
          console.warn(`[Sheet Sync Manual] Sheet ${config.sheet_id} không bóc tách được, bỏ qua.`);
          continue;
        }

        // 2. Gọi commit để cập nhật DB (tái sử dụng logic commit đã có)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const commitUrl = `${baseUrl}/api/sync/google-sheet/commit`;

        const commitRes = await fetch(commitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            landlord_id: config.landlord_id,
            sheet_url: config.sheet_url,
            buildings: parsed.buildings,
          }),
        });

        const commitData = await commitRes.json();

        if (!commitRes.ok) {
          throw new Error(commitData.error || 'Commit thất bại');
        }

        totalRoomsCreated += commitData.totalRoomsCreated || 0;
        totalRoomsUpdated += commitData.totalRoomsUpdated || 0;
        totalRoomsMarkedRented += commitData.totalRoomsMarkedRented || 0;

        // 3. Cập nhật last_synced_at
        await supabaseAdmin
          .from('landlord_sheet_syncs')
          .update({
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', config.id);

        syncedCount++;

        // Delay nhỏ tránh rate limit
        await new Promise((r) => setTimeout(r, 1500));

      } catch (err: any) {
        const errMsg = err?.message || 'Lỗi đồng bộ.';
        console.error(`[Sheet Sync Manual Error for ${config.sheet_id}]: ${errMsg}`);
        errors.push(errMsg);

        await supabaseAdmin
          .from('landlord_sheet_syncs')
          .update({ error_message: errMsg })
          .eq('id', config.id);
      }
    }

    return NextResponse.json({
      success: true,
      syncedSheets: syncedCount,
      totalSheets: syncConfigs.length,
      totalRoomsCreated,
      totalRoomsUpdated,
      totalRoomsMarkedRented,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[Sheet Sync Manual Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
