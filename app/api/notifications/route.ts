import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (companyId && companyId !== 'null' && companyId !== 'undefined') {
      query = query.eq('company_id', companyId);
    }

    if (userId && userId !== 'null' && userId !== 'undefined') {
      query = query.or(`recipient_id.eq.${userId},recipient_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API Notifications GET error]', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_id, recipient_id, recipient_role, type, title, body: notifBody, data, appointment_id, link } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: 'Thiếu title' }, { status: 400 });
    }

    const { data: newNotif, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: company_id || null,
        recipient_id: recipient_id || null,
        recipient_role: recipient_role || 'user',
        type: type || 'system',
        title,
        body: notifBody || '',
        data: data || null,
        appointment_id: appointment_id || null,
        link: link || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[API Notifications POST error]', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newNotif }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
