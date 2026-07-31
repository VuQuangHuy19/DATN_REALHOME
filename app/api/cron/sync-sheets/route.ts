import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseGoogleSheetFull } from '@/src/features/import/services/googleSheetAiParser';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/cron/sync-sheets
 * Tự động đồng bộ lại tất cả Google Sheet đang ở trạng thái ACTIVE.
 * Được gọi định kỳ (ví dụ: mỗi 6 giờ hoặc hằng ngày) qua Vercel Cron / cron job bên ngoài.
 *
 * Luồng: Đọc Sheet → Bóc tách phòng → Gọi commit để:
 *   1. Cập nhật giá / trạng thái phòng từ Sheet mới nhất
 *   2. Đánh dấu phòng không còn trong Sheet → "Đã thuê"
 *   3. Nhận diện ngày tháng → available_date (sắp trống)
 */
export async function GET(req: Request) {
  try {
    // Bảo mật cơ bản: kiểm tra CRON_SECRET nếu có cấu hình
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy các Sheet đang ở trạng thái ACTIVE (chưa bị tắt đồng bộ)
    const { data: syncConfigs, error } = await supabaseAdmin
      .from('landlord_sheet_syncs')
      .select('*')
      .eq('status', 'ACTIVE')
      .limit(50);

    if (error) {
      console.error('[Cron Sync] Lỗi đọc bảng landlord_sheet_syncs:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!syncConfigs || syncConfigs.length === 0) {
      return NextResponse.json({ message: 'Không có Google Sheet nào cần đồng bộ.' });
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const config of syncConfigs) {
      try {
        console.log(`[Cron Sync] Bắt đầu tự động quét Sheet ID: ${config.sheet_id} | URL: ${config.sheet_url}`);

        // 1. Bóc tách thông minh: Programmatic parser trước, fallback AI
        const parsed = await parseGoogleSheetFull(config.sheet_url);

        if (!parsed || !parsed.buildings || parsed.buildings.length === 0) {
          console.warn(`[Cron Sync] Sheet ${config.sheet_id} không bóc tách được dữ liệu, bỏ qua.`);
          continue;
        }

        // 2. Gọi nội bộ commit endpoint để cập nhật DB
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3050';
        const commitUrl = `${baseUrl}/api/sync/google-sheet/commit`;

        const commitRes = await fetch(commitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: config.company_id,
            landlord_id: config.landlord_id,
            sheet_url: config.sheet_url,
            buildings: parsed.buildings,
          }),
        });

        const commitData = await commitRes.json();

        if (!commitRes.ok) {
          throw new Error(commitData.error || 'Commit thất bại');
        }

        console.log(
          `[Cron Sync] Sheet ${config.sheet_id} đồng bộ xong: ` +
          `${commitData.totalRoomsCreated || 0} phòng mới, ` +
          `${commitData.totalRoomsUpdated || 0} phòng cập nhật, ` +
          `${commitData.totalRoomsMarkedRented || 0} phòng đánh dấu "Đã thuê".`
        );

        // 3. Cập nhật thời gian đồng bộ thành công
        await supabaseAdmin
          .from('landlord_sheet_syncs')
          .update({
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', config.id);

        syncedCount++;

        // Delay nhỏ giữa các sheet để tránh rate limit API
        await new Promise((r) => setTimeout(r, 2000));

      } catch (err: any) {
        const errMsg = err?.message || 'Lỗi đồng bộ tự động.';
        console.error(`[Cron Sync Error for ${config.sheet_id}]: ${errMsg}`);
        errors.push(`Sheet ${config.sheet_id}: ${errMsg}`);

        // Ghi lại lỗi vào DB
        await supabaseAdmin
          .from('landlord_sheet_syncs')
          .update({
            error_message: errMsg,
          })
          .eq('id', config.id);
      }
    }

    return NextResponse.json({
      success: true,
      syncedSheets: syncedCount,
      totalConfigs: syncConfigs.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[Cron Auto-Sync Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
