import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('job_id');
  if (!jobId) {
    return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('drive_sync_jobs')
    .select('id, status, total_tasks, completed_tasks, created_at, finished_at, error_message')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Tự động kết thúc job bị treo quá 5 phút (nếu dev server restart hoặc process bị đứt)
  if (data.status === 'syncing' && data.created_at) {
    const jobAge = Date.now() - new Date(data.created_at).getTime();
    if (jobAge > 5 * 60 * 1000) {
      console.log(`[DriveStatus API] Job ${jobId} bị treo > 5 phút. Tự động đánh dấu HOÀN TẤT.`);
      await supabaseAdmin
        .from('drive_sync_jobs')
        .update({
          status: 'done',
          finished_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json({
        ...data,
        status: 'done',
        finished_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json(data);
}

