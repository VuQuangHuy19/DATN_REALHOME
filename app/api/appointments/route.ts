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
