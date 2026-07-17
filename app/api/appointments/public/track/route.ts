import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizePhoneVN, isValidVNPhone } from '@/lib/phone';

export async function GET(request: Request) {
  // 1. Rate limit: 10 request / 5 phút / IP
  const rl = checkRateLimit(request, 'appointments-track', {
    limit: 10,
    windowMs: 5 * 60 * 1000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const phoneParam = searchParams.get('phone');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const companyId = searchParams.get('companyId');

    if (!phoneParam) {
      return NextResponse.json({ error: 'Vui lòng cung cấp số điện thoại.' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneVN(phoneParam);
    if (!isValidVNPhone(normalizedPhone)) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('appointments')
      .select('*, profiles:assigned_to(full_name, phone, email)')
      .eq('customer_phone', normalizedPhone)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (fromDate) {
      query = query.gte('date', fromDate);
    }
    if (toDate) {
      query = query.lte('date', toDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Lỗi khi query appointments (track):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, appointments: data }, { status: 200 });
  } catch (error: unknown) {
    console.error('Lỗi API track appointments:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
