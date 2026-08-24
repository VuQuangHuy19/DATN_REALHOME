import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, resultStatus, rejectionReason, feedbackNotes, nextFollowupAt } = body;

    if (!appointmentId || !resultStatus) {
      return NextResponse.json({ error: 'Missing appointmentId or resultStatus' }, { status: 400 });
    }

    // 1. Fetch current appointment
    const { data: appointment, error: fetchErr } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Map main appointment status
    let newApptStatus = appointment.status;
    if (resultStatus === 'deposit_pending') {
      newApptStatus = 'Dealed';
    } else if (resultStatus === 'interested' || resultStatus === 'rejected') {
      newApptStatus = 'Viewed';
    } else if (resultStatus === 'no_show') {
      newApptStatus = 'Cancel';
    }

    // 2. Update Appointment (with safe schema fallback)
    let updatedAppt: any = null;
    let updateErr: any = null;

    const fullFeedbackPayload: any = {
      result_status: resultStatus,
      rejection_reason: rejectionReason || null,
      feedback_notes: feedbackNotes || null,
      next_followup_at: nextFollowupAt || null,
      status: newApptStatus,
      updated_at: nowIso,
    };

    const fbRes1 = await supabaseAdmin
      .from('appointments')
      .update(fullFeedbackPayload)
      .eq('id', appointmentId)
      .select()
      .single();

    if (fbRes1.error) {
      if (fbRes1.error.message?.includes('column') || fbRes1.error.message?.includes('schema cache')) {
        const fallbackRes = await supabaseAdmin
          .from('appointments')
          .update({ status: newApptStatus, updated_at: nowIso } as any)
          .eq('id', appointmentId)
          .select()
          .single();
        updatedAppt = fallbackRes.data;
        updateErr = fallbackRes.error;
      } else {
        updateErr = fbRes1.error;
      }
    } else {
      updatedAppt = fbRes1.data;
    }

    if (updateErr) {
      console.error('[AppointmentFeedbackAPI] Update error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Sync to Lead CRM
    let matchedLeadId = appointment.lead_id || null;
    let leadStatusMapped = 'viewed';

    if (resultStatus === 'deposit_pending') leadStatusMapped = 'deposited';
    else if (resultStatus === 'interested') leadStatusMapped = 'viewed';
    else if (resultStatus === 'rejected') leadStatusMapped = 'consulting'; // Sale vẫn tiếp tục chăm dẫn căn khác
    else if (resultStatus === 'no_show') leadStatusMapped = 'lost';

    if (appointment.company_id && (appointment.customer_phone || matchedLeadId)) {
      try {
        let query = supabaseAdmin.from('leads').select('id, status, full_name').eq('company_id', appointment.company_id);
        if (matchedLeadId) {
          query = query.eq('id', matchedLeadId);
        } else if (appointment.customer_phone) {
          query = query.eq('phone', appointment.customer_phone);
        }

        const { data: leads } = await query;
        const matchedLead = leads && leads[0] ? leads[0] : null;

        if (matchedLead) {
          matchedLeadId = matchedLead.id;
          
          // Update Lead status & timestamp
          await supabaseAdmin
            .from('leads')
            .update({
              status: leadStatusMapped as any,
              last_contacted_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', matchedLead.id);

          // Log Activity into lead_activities
          const reasonLabel = rejectionReason ? ` (Lý do: ${rejectionReason})` : '';
          const notesText = feedbackNotes ? ` - Ghi chú: ${feedbackNotes}` : '';
          const activityContent = `[Dẫn khách xem phòng] Kết quả: ${resultStatus.toUpperCase()}${reasonLabel}${notesText}`;

          await supabaseAdmin.from('lead_activities').insert({
            lead_id: matchedLead.id,
            company_id: appointment.company_id,
            type: 'meeting',
            content: activityContent,
            old_status: matchedLead.status,
            new_status: leadStatusMapped,
            created_by: appointment.assigned_to || null,
            created_by_name: appointment.assigned_to_name || 'Sale',
          } as any);

          // Update lead_id back to appointment if not set
          if (!appointment.lead_id) {
            await supabaseAdmin.from('appointments').update({ lead_id: matchedLead.id } as any).eq('id', appointmentId);
          }
        }
      } catch (leadSyncErr) {
        console.error('[AppointmentFeedbackAPI] Lead sync error:', leadSyncErr);
      }
    }

    // 4. Generate 1-Tap Deposit URL if deposit_pending
    let depositUrl: string | null = null;
    if (resultStatus === 'deposit_pending') {
      const params = new URLSearchParams();
      if (appointment.room_id) params.set('room_id', appointment.room_id);
      if (appointment.building_id) params.set('building_id', appointment.building_id);
      if (appointment.customer_name) params.set('customer_name', appointment.customer_name);
      if (appointment.customer_phone) params.set('customer_phone', appointment.customer_phone);
      if (appointment.customer_email) params.set('customer_email', appointment.customer_email);
      if (appointment.assigned_to) params.set('sales_agent_id', appointment.assigned_to);
      depositUrl = `/admin/contracts/create?${params.toString()}`;
    }

    // 5. In-App Notification to Manager / Admin
    try {
      const statusLabels: Record<string, string> = {
        deposit_pending: '🎉 CHỐT ĐẶT CỌC',
        interested: '🌟 KHÁCH THÍCH (SUY NGHĨ)',
        rejected: '❌ KHÁCH KHÔNG ƯNG',
        no_show: '🚫 KHÁCH BÙNG KÈO',
      };
      const label = statusLabels[resultStatus] || resultStatus;
      const saleName = appointment.assigned_to_name || 'Sale';

      await supabaseAdmin.from('notifications').insert({
        company_id: appointment.company_id,
        title: `📊 BÁO CÁO KẾT QUẢ DẪN KHÁCH: ${label}`,
        body: `Sale ${saleName} đã cập nhật báo cáo kết quả dẫn khách ${appointment.customer_name} xem ${appointment.room_title || 'phòng'}. ${feedbackNotes || ''}`,
        type: 'appointment',
        link: `/admin/appointments?id=${appointmentId}`,
      } as any);
    } catch (nErr) {
      console.error('[AppointmentFeedbackAPI] Notification error:', nErr);
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppt,
      depositUrl,
      leadId: matchedLeadId,
      message: 'Đã lưu báo cáo kết quả xem phòng & đồng bộ CRM thành công!',
    });
  } catch (error: any) {
    console.error('[AppointmentFeedbackAPI] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
