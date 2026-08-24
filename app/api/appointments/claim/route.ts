import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appointmentId, userId, userName } = body;

    if (!appointmentId || !userId || !userName) {
      return NextResponse.json({ error: 'Thiếu thông tin nhận lịch hẹn' }, { status: 400 });
    }

    // 1. Kiểm tra lịch hẹn hiện tại
    const { data: currentApt, error: checkErr } = await supabaseAdmin
      .from('appointments')
      .select('id, customer_name, customer_phone, company_id, assigned_to, assigned_to_name')
      .eq('id', appointmentId)
      .maybeSingle();

    if (checkErr || !currentApt) {
      return NextResponse.json({ error: 'Không tìm thấy lịch hẹn' }, { status: 404 });
    }

    // Nếu đã được người khác nhận trước đó
    if (currentApt.assigned_to && currentApt.assigned_to !== userId) {
      const claimerName = currentApt.assigned_to_name || 'Sale khác';
      return NextResponse.json(
        {
          error: `⚠️ Lịch hẹn này vừa được Sale [${claimerName}] nhận trước!`,
          alreadyClaimed: true,
          claimedBy: claimerName,
        },
        { status: 409 }
      );
    }

    // 2. Thực hiện Atomic Update (Chỉ update nếu assigned_to đang IS NULL)
    const { data: updatedApt, error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update({
        assigned_to: userId,
        assigned_to_name: userName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .is('assigned_to', null)
      .select()
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Nếu không update được row nào (do 2 sale bấm cùngミリ giây)
    if (!updatedApt) {
      const { data: recheck } = await supabaseAdmin
        .from('appointments')
        .select('assigned_to_name')
        .eq('id', appointmentId)
        .maybeSingle();

      const claimerName = recheck?.assigned_to_name || 'Sale khác';
      return NextResponse.json(
        {
          error: `⚠️ Lịch hẹn này vừa được Sale [${claimerName}] nhận trước!`,
          alreadyClaimed: true,
          claimedBy: claimerName,
        },
        { status: 409 }
      );
    }

    // 3. Đồng bộ phân công Lead trong bảng leads nếu có
    if (updatedApt.customer_phone && updatedApt.company_id) {
      await supabaseAdmin
        .from('leads')
        .update({
          assigned_to: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', updatedApt.company_id)
        .eq('phone', updatedApt.customer_phone);
    }

    // 4. Tạo thông báo lịch sử
    await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: updatedApt.company_id,
        user_id: userId,
        type: 'appointment_claimed',
        title: 'Nhận chăm sóc lịch hẹn thành công',
        message: `Bạn đã nhận chăm sóc khách hàng ${updatedApt.customer_name} (${updatedApt.customer_phone}).`,
        link: `/admin/appointments?id=${updatedApt.id}`,
        read: false,
      });

    return NextResponse.json({ success: true, appointment: updatedApt }, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi nhận chăm sóc lịch hẹn:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
