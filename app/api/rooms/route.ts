import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const companyId = searchParams.get('companyId');

    // Chuẩn hóa tham số đầu vào
    const currentPage = page > 0 ? page : 1;
    const currentLimit = limit > 0 ? limit : 10;

    // Tính toán phạm vi (offset) cho Supabase (0-indexed)
    const from = (currentPage - 1) * currentLimit;
    const to = from + currentLimit - 1;

    let query = supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact' });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // Thực hiện truy vấn dữ liệu theo khoảng range phân trang
    const { data: rooms, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / currentLimit);

    return NextResponse.json({
      data: rooms || [],
      meta: {
        totalItems,
        totalPages,
        currentPage,
        limit: currentLimit,
      },
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
