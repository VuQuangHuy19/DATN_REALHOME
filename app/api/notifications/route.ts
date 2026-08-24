import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu userId' }, { status: 400 });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (companyId) {
      query = query.eq('company_id', companyId);
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

    if (!recipient_id || !title) {
      return NextResponse.json({ success: false, message: 'Thiếu recipient_id hoặc title' }, { status: 400 });
    }

    const { data: newNotif, error } = await supabase
      .from('notifications')
      .insert({
        company_id: company_id || null,
        recipient_id,
        recipient_role: recipient_role || 'user',
        type: type || 'system',
        title,
        body: notifBody || '',
        data: data || null,
        appointment_id: appointment_id || null,
        link: link || null,
        is_read: false,
        created_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newNotif });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
