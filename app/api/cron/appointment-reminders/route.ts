import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    // 80 to 95 minutes in the future
    const windowStart = new Date(now.getTime() + 80 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 95 * 60 * 1000);

    // 1. Fetch appointments that haven't been reminded yet
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .in('status', ['confirmed', 'Confirm', 'pending', 'Pending'])
      .or('reminded_90m.is.null,reminded_90m.eq.false');

    if (error) {
      console.error('[AppointmentReminderCron] Error fetching:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let remindedCount = 0;

    for (const apt of appointments || []) {
      if (!apt.date) continue;

      // Parse appointment date & time
      // Format apt.date is YYYY-MM-DD or ISO, time is HH:mm
      let aptDateTimeStr = apt.date;
      if (apt.time && !apt.date.includes('T')) {
        aptDateTimeStr = `${apt.date}T${apt.time.length === 5 ? apt.time + ':00' : apt.time}`;
      }

      const aptTime = new Date(aptDateTimeStr);
      if (isNaN(aptTime.getTime())) continue;

      // Check if within the 90m window
      if (aptTime >= windowStart && aptTime <= windowEnd) {
        const roomTitle = apt.room_title || 'Phòng';
        const saleName = apt.assigned_to_name || 'Sale';
        const customerName = apt.customer_name || 'Khách hàng';

        // 1. Notify Sale & Landlord via In-App notifications
        await supabase.from('notifications').insert([
          {
            company_id: apt.company_id,
            title: `⏰ NHẮC LỊCH DẪN KHÁCH (CÒN 90 PHÚT)`,
            body: `Còn 90 phút nữa (lúc ${apt.time || ''}) bạn có lịch dẫn khách ${customerName} xem ${roomTitle}. Vui lòng chuẩn bị di chuyển!`,
            type: 'appointment',
            recipient_id: apt.assigned_to,
            link: `/admin/appointments?id=${apt.id}`,
          },
          {
            company_id: apt.company_id,
            title: `⏰ NHẮC LỊCH XEM PHÒNG (CÒN 90 PHÚT)`,
            body: `Sale ${saleName} sẽ dẫn khách ${customerName} đến xem ${roomTitle} lúc ${apt.time || ''}. Vui lòng chuẩn bị hỗ trợ mở cửa.`,
            type: 'appointment',
            link: `/admin/appointments?id=${apt.id}`,
          },
        ] as any);

        // 2. Mark as reminded
        await supabase
          .from('appointments')
          .update({ reminded_90m: true, updated_at: now.toISOString() } as any)
          .eq('id', apt.id);

        remindedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      remindedCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[AppointmentReminderCron] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
