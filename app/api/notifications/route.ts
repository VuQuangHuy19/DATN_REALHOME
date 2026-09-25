import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const userRole = searchParams.get('userRole') || searchParams.get('role');
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

    let result = data || [];

    // Filter out sales lead / check-in / audit notifications for tenants
    const isTenantRole = userRole === 'tenant' || userRole === 'customer' || !userRole;
    if (isTenantRole) {
      const salesTypes = [
        'appointment_new', 'appointment_created', 'appointment_claim', 'appointment_confirmed',
        'new_lead', 'lead_new', 'lead', 'checkin', 'check_in', 'checkout', 'audit', 'sales',
        'consultation', 'kyc_review', 'kyc_submitted'
      ];

      const salesKeywords = [
        'dẫn khách', 'check-in', 'checkin', 'xuất phát', 'lịch hẹn xem',
        'vừa đặt lịch', 'xem phòng mới', 'bấm xuất phát', 'timemark',
        'phê duyệt kyc', 'chú ý sale', 'sale '
      ];

      result = result.filter((n: any) => {
        const type = (n.type || '').toLowerCase();
        const title = (n.title || '').toLowerCase();
        const body = (n.body || '').toLowerCase();

        if (salesTypes.some((st) => type === st || type.includes(st))) {
          return false;
        }

        if (salesKeywords.some((kw) => title.includes(kw) || body.includes(kw))) {
          return false;
        }

        if (!n.recipient_id) {
          const recRole = (n.recipient_role || '').toLowerCase();
          if (recRole && recRole !== 'tenant' && recRole !== 'customer' && recRole !== 'user' && recRole !== 'all') {
            return false;
          }
        }

        return true;
      });
    }

    return NextResponse.json({ success: true, data: result });
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

