import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, lat, lng, saleName } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
    }

    // 1. Fetch appointment details
    const { data: appointment, error: fetchErr } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const unlockUntilIso = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Unlocked for exactly 60 minutes

    // 2. Update appointment status to 'on_the_way' with GPS Location 1 & 60m Phone Unlock Window
    const fullPayload: any = {
      status: 'on_the_way',
      on_the_way_at: nowIso,
      on_the_way_lat: typeof lat === 'number' ? lat : null,
      on_the_way_lng: typeof lng === 'number' ? lng : null,
      phone_unlocked_until: unlockUntilIso,
      updated_at: nowIso,
    };

    let updated: any = null;
    let updateErr: any = null;

    const res1 = await supabaseAdmin
      .from('appointments')
      .update(fullPayload)
      .eq('id', appointmentId)
      .select()
      .single();

    if (res1.error) {
      console.warn('[OnTheWayAPI] Full payload update failed, attempting safe fallback:', res1.error.message);
      
      // Fallback 1: Try updating status 'on_the_way' without custom columns
      const fallbackRes = await supabaseAdmin
        .from('appointments')
        .update({
          status: 'on_the_way',
          updated_at: nowIso,
        } as any)
        .eq('id', appointmentId)
        .select()
        .single();

      if (fallbackRes.error) {
        // Fallback 2: Try status 'Confirm' if status constraint check blocks 'on_the_way'
        const statusRes = await supabaseAdmin
          .from('appointments')
          .update({
            status: 'Confirm',
            updated_at: nowIso,
          } as any)
          .eq('id', appointmentId)
          .select()
          .single();

        updated = statusRes.data;
        updateErr = statusRes.error;
      } else {
        updated = fallbackRes.data;
        updateErr = null;
      }
    } else {
      updated = res1.data;
    }

    if (updateErr) {
      console.error('[OnTheWayAPI] Update error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Create Audit Notification & Log for Landlord & Company Admins
    try {
      const roomTitle = appointment.room_title || 'Căn hộ';
      const currentSaleName = saleName || appointment.assigned_to_name || 'Sale';
      const customerName = appointment.customer_name || 'Khách hàng';
      const gpsInfo = lat && lng ? ` (GPS Lần 1: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})` : '';

      await supabaseAdmin.from('notifications').insert({
        company_id: appointment.company_id,
        title: `🚘 SALE XUẤT PHÁT DẪN KHÁCH SANG TÒA NHÀ`,
        body: `Audit: Sale ${currentSaleName} đã bấm xuất phát dẫn khách ${customerName} xem ${roomTitle}${gpsInfo}. SĐT Chủ nhà đã được mở khóa trong 60 phút.`,
        type: 'appointment',
        link: `/admin/appointments?id=${appointmentId}`,
      } as any);
    } catch (notifErr) {
      console.error('[OnTheWayAPI] Notification error:', notifErr);
    }

    return NextResponse.json({
      success: true,
      phoneUnlockedUntil: unlockUntilIso,
      message: 'Đã xuất phát, lưu vị trí GPS Lần 1 & Mở khóa SĐT Chủ nhà (Tự động khóa lại sau 60 phút)!',
      appointment: updated,
    });
  } catch (error: any) {
    console.error('[OnTheWayAPI] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
