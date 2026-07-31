import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchPublicGoogleSheetCsv, parseSheetContentWithAI } from '@/src/features/import/services/googleSheetAiParser';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Optional security check
    }

    // Lấy các Sheet đang ở trạng thái ACTIVE
    const { data: syncConfigs, error } = await supabaseAdmin
      .from('landlord_sheet_syncs')
      .select('*')
      .eq('status', 'ACTIVE')
      .limit(50);

    if (error || !syncConfigs || syncConfigs.length === 0) {
      return NextResponse.json({ message: 'Không có Google Sheet nào cần đồng bộ.' });
    }

    let syncedCount = 0;

    for (const config of syncConfigs) {
      try {
        console.log(`[Cron Sync] Bắt đầu tự động quét Sheet ID: ${config.sheet_id}`);

        // 1. Tải CSV từ Sheet
        const csvContent = await fetchPublicGoogleSheetCsv(config.sheet_url);

        // 2. Parse dữ liệu qua AI
        const parsed = await parseSheetContentWithAI(csvContent);

        // 3. Gọi nội bộ commit endpoint hoặc thực thi commit
        const commitUrl = new URL('/api/sync/google-sheet/commit', req.url);
        await fetch(commitUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: config.company_id,
            landlord_id: config.landlord_id,
            sheet_url: config.sheet_url,
            buildings: parsed.buildings,
          }),
        });

        // 4. Cập nhật thời gian đồng bộ
        await supabaseAdmin
          .from('landlord_sheet_syncs')
          .update({
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', config.id);

        syncedCount++;
      } catch (err: any) {
        console.error(`[Cron Sync Error for ${config.sheet_id}]:`, err?.message);
        await supabaseAdmin
          .from('landlord_sheet_syncs')
          .update({
            error_message: err?.message || 'Lỗi đồng bộ tự động.',
          })
          .eq('id', config.id);
      }
    }

    return NextResponse.json({
      success: true,
      syncedSheets: syncedCount,
      totalConfigs: syncConfigs.length,
    });
  } catch (error: any) {
    console.error('[Cron Auto-Sync Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
