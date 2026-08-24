import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentAppointmentId, roomId } = body;

    if (!parentAppointmentId || !roomId) {
      return NextResponse.json({ error: 'Missing parentAppointmentId or roomId' }, { status: 400 });
    }

    // 1. Fetch parent appointment details
    const { data: parentApt, error: parentErr } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', parentAppointmentId)
      .single();

    if (parentErr || !parentApt) {
      return NextResponse.json({ error: 'Parent appointment not found' }, { status: 404 });
    }

    // 2. Fetch target room and building details
    const { data: targetRoom, error: roomErr } = await supabaseAdmin
      .from('rooms')
      .select('*, buildings(id, name, address, area, landlord_id)')
      .eq('id', roomId)
      .single();

    if (roomErr || !targetRoom) {
      return NextResponse.json({ error: 'Target room not found' }, { status: 404 });
    }

    const building = targetRoom.buildings as any;
    const buildingName = building?.name || 'Tòa nhà';
    const buildingAddress = building?.address || '';
    const roomTitle = `Phòng ${targetRoom.code} - ${buildingName}`;

    const now = new Date();
    const localDateStr = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const localTimeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const nowIso = now.toISOString();

    // 3. Create NEW appointment record for Chain Showing (with safe schema fallback)
    let newAppointment: any = null;
    let insertErr: any = null;

    const fullChainPayload: any = {
      company_id: parentApt.company_id,
      customer_name: parentApt.customer_name,
      customer_phone: parentApt.customer_phone,
      customer_email: parentApt.customer_email,
      room_id: targetRoom.id,
      room_title: roomTitle,
      building_id: building?.id || null,
      building_address: buildingAddress,
      area: building?.area || parentApt.area || null,
      date: localDateStr,
      time: localTimeStr,
      status: 'on_the_way',
      on_the_way_at: nowIso,
      assigned_to: parentApt.assigned_to,
      assigned_to_name: parentApt.assigned_to_name,
      notes: `Lịch dẫn nối tiếp cấp tốc từ phòng ${parentApt.room_title || ''}`,
    };

    const chainRes1 = await supabaseAdmin
      .from('appointments')
      .insert(fullChainPayload as any)
      .select()
      .single();

    if (chainRes1.error) {
      if (chainRes1.error.message?.includes('column') || chainRes1.error.message?.includes('schema cache')) {
        delete fullChainPayload.on_the_way_at;
        const fallbackRes = await supabaseAdmin
          .from('appointments')
          .insert(fullChainPayload as any)
          .select()
          .single();
        newAppointment = fallbackRes.data;
        insertErr = fallbackRes.error;
      } else {
        insertErr = chainRes1.error;
      }
    } else {
      newAppointment = chainRes1.data;
    }

    if (insertErr) {
      console.error('[ChainShowingAPI] Insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 4. Send URGENT notification to Landlord & Company admins
    try {
      const saleName = parentApt.assigned_to_name || 'Sale';
      const customerName = parentApt.customer_name || 'Khách hàng';

      await supabaseAdmin.from('notifications').insert({
        company_id: parentApt.company_id,
        title: `⚡ DẪN KHÁCH TRỰC TIẾP (NỐI TIẾP GẤP)`,
        body: `Sale ${saleName} đang DẪN TRỰC TIẾP Khách ${customerName} sang xem ${roomTitle} ngay bây giờ. Vui lòng căn giờ nghe máy/mở cửa!`,
        type: 'appointment',
        link: `/admin/appointments?id=${newAppointment.id}`,
      } as any);
    } catch (nErr) {
      console.error('[ChainShowingAPI] Notification error:', nErr);
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo nhanh lịch dẫn nối tiếp sang ${roomTitle} & bắn thông báo khẩn tới Chủ nhà!`,
      newAppointment,
    });
  } catch (error: any) {
    console.error('[ChainShowingAPI] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
