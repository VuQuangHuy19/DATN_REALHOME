import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createAppointmentWithNotification } from '@/features/notifications/services/appointmentNotificationService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const saleId = searchParams.get('saleId');
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (companyId) query = query.eq('company_id', companyId);
    if (saleId) query = query.eq('assigned_to', saleId);

    const { data, error } = await query;

    if (error) {
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
    const { room_id, customer_name, customer_phone, date, time, note, company_id, assigned_sale_id } = body;

    if (!customer_name || !customer_phone || !date || !time) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin khách hàng, ngày hoặc giờ hẹn' },
        { status: 400 }
      );
    }

    const appointment = await createAppointmentWithNotification({
      room_id,
      customer_name,
      customer_phone,
      date,
      time,
      note,
      company_id,
      assigned_sale_id,
    });

    return NextResponse.json({ success: true, data: appointment });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu mã lịch hẹn (id)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Sync to leads table if customer_phone and company_id match
    try {
      if (data && data.customer_phone && data.company_id) {
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .select('id, assigned_to, status')
          .eq('company_id', data.company_id)
          .eq('phone', data.customer_phone)
          .maybeSingle();

        if (lead) {
          const leadPatch: any = {};
          if ('assigned_to' in updateData && lead.assigned_to !== data.assigned_to) {
            leadPatch.assigned_to = data.assigned_to;
          }
          if ('status' in updateData) {
            let mappedStatus: string | null = null;
            if (data.status === 'confirmed' || data.status === 'Confirm') {
              mappedStatus = 'appointment';
            } else if (data.status === 'completed' || data.status === 'Viewed') {
              mappedStatus = 'viewed';
            } else if (data.status === 'cancelled' || data.status === 'Cancel') {
              mappedStatus = 'lost';
            }
            if (mappedStatus && lead.status !== mappedStatus) {
              leadPatch.status = mappedStatus;
            }
          }
          if (Object.keys(leadPatch).length > 0) {
            await supabaseAdmin
              .from('leads')
              .update({ ...leadPatch, updated_at: new Date().toISOString() })
              .eq('id', lead.id);
          }
        }
      }
    } catch (syncErr) {
      console.error('Error syncing appointment to lead via API:', syncErr);
    }

    // Trigger notification if status is confirmed/Confirm
    if ('status' in updateData && (updateData.status === 'confirmed' || updateData.status === 'Confirm')) {
      try {
        fetch(`${req.nextUrl.origin}/api/appointments/notify-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: id, newStatus: updateData.status }),
        }).catch(err => console.error('Lỗi khi gọi API notify-status:', err));
      } catch (e) {
        console.error('Lỗi try-catch API notify-status:', e);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu mã lịch hẹn (id)' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
