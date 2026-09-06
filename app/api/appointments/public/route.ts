import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizePhoneVN, isValidVNPhone } from '@/lib/phone';
import { isValidCustomerName } from '@/lib/validators';
import { notify } from '@/lib/notifications/notify';

export async function POST(request: Request) {
  // ── 1. Rate limit: 5 request / 10 phút / IP ──────────────────────────────
  const rl = checkRateLimit(request, 'appointments-public', {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await request.json();
    const { companyId, customerName, customerPhone, property, viewingDate, viewingTime, createdByUserId, assignedToUserId, assignedToName, leadSource } = body;

    if (!companyId || !customerName || !customerPhone || !property || !viewingDate || !viewingTime) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // ── 2. Validate tên khách hàng ──────────────────────────────────────────
    if (!isValidCustomerName(customerName)) {
      return NextResponse.json(
        { error: 'Tên khách hàng không hợp lệ. Vui lòng nhập tên thật.' },
        { status: 400 }
      );
    }

    // ── 3. Normalize + validate số điện thoại ──────────────────────────────
    const normalizedPhone = normalizePhoneVN(customerPhone);
    if (!isValidVNPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678).' },
        { status: 400 }
      );
    }

    // Chuẩn hóa định dạng ngày về YYYY-MM-DD đề phòng client gửi chuỗi dd/mm/yyyy
    let normalizedDate = viewingDate;
    if (viewingDate && typeof viewingDate === 'string') {
      const parts = viewingDate.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    // 1. Lấy thông tin landlord_id, building_id, company_id, room_type, price, code từ phòng tương ứng
    const { data: roomData } = await supabaseAdmin
      .from('rooms')
      .select('code, landlord_id, building_id, company_id, room_type, price, buildings(id, name, address, area)')
      .eq('id', property.id)
      .maybeSingle();

    const landlordId = roomData?.landlord_id ?? null;
    const buildingId = roomData?.building_id ?? null;
    const effectiveCompanyId = roomData?.company_id || companyId;
    const autoRoomType = roomData?.room_type || property.roomType || null;
    const autoBudget = roomData?.price || property.price || 0;
    const autoArea = (roomData as any)?.buildings?.area || property.area || null;

    // Build standard room title (Phòng [Số phòng] — [Tên/Địa chỉ tòa nhà])
    let resolvedRoomTitle = property.title;
    if (roomData) {
      const codeStr = roomData.code || '';
      const bAddress = (roomData as any).buildings?.name || (roomData as any).buildings?.address || property.address || '';
      if (codeStr && bAddress) {
        resolvedRoomTitle = codeStr.toLowerCase().startsWith('phòng')
          ? `${codeStr} — ${bAddress}`
          : `Phòng ${codeStr} — ${bAddress}`;
      }
    }

    let finalAssignedTo = assignedToUserId || createdByUserId || null;
    let finalAssignedToName = assignedToName || null;

    if (finalAssignedTo && !finalAssignedToName) {
      const { data: staffProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', finalAssignedTo)
        .maybeSingle();
      if (staffProfile) {
        finalAssignedToName = staffProfile.full_name || staffProfile.email || null;
      }
    }

    const finalLeadSource = leadSource || (finalAssignedTo ? 'sale_referral_link' : 'company_mkt');

    // 2. Tạo lịch hẹn (appointments) bằng admin client (bypass RLS)
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .insert({
        company_id: effectiveCompanyId,
        customer_name: customerName,
        customer_phone: normalizedPhone,
        customer_email: null,
        room_id: property.id,
        room_title: resolvedRoomTitle,
        date: normalizedDate,
        time: viewingTime,
        area: autoArea,
        status: 'Pending',
        notes: 'Yêu cầu xem qua website',
        assigned_to: finalAssignedTo,
        assigned_to_name: finalAssignedToName,
        created_by: createdByUserId || null,
        landlord_id: landlordId,
        building_id: buildingId,
        lead_source: finalLeadSource,
      })
      .select()
      .single();

    if (aptError) {
      console.error('Lỗi khi tạo lịch hẹn:', aptError);
      return NextResponse.json({ error: aptError.message }, { status: 400 });
    }

    // 3. Tự động Tra cứu hoặc Tạo lead mới bằng admin client (bypass RLS)
    let finalLead: any = null;
    const { data: existingLeads } = await supabaseAdmin
      .from('leads')
      .select('id, status, interest, preferred_room_type, budget')
      .eq('company_id', effectiveCompanyId)
      .eq('phone', normalizedPhone);

    if (existingLeads && existingLeads.length > 0) {
      finalLead = existingLeads[0];
      await supabaseAdmin
        .from('leads')
        .update({
          status: finalLead.status === 'new' ? 'appointment' : finalLead.status,
          interest: resolvedRoomTitle,
          preferred_area: autoArea ?? undefined,
          preferred_room_type: autoRoomType ?? undefined,
          budget: (finalLead.budget > 0) ? finalLead.budget : autoBudget,
          assigned_to: finalAssignedTo || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', finalLead.id);
    } else {
      const { data: newLead, error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
          company_id: effectiveCompanyId,
          full_name: customerName,
          phone: normalizedPhone,
          email: null,
          source: finalLeadSource === 'sale_referral_link' ? 'referral' : 'website',
          status: 'appointment',
          interest: resolvedRoomTitle,
          budget: autoBudget,
          preferred_area: autoArea,
          preferred_room_type: autoRoomType,
          interested_area: autoArea,
          assigned_to: finalAssignedTo,
          created_by: createdByUserId || null,
          notes: `Đặt lịch xem: ${resolvedRoomTitle} — ${normalizedDate} ${viewingTime}`,
          last_contacted_at: null,
        })
        .select()
        .single();

      if (leadError) {
        console.error('Lỗi khi tạo lead:', leadError);
      } else {
        finalLead = newLead;
      }
    }

    // 4. Tạo lead activity & liên kết lead_id vào lịch hẹn
    if (finalLead) {
      await supabaseAdmin
        .from('appointments')
        .update({ lead_id: finalLead.id })
        .eq('id', appointment.id);

      const { error: actError } = await supabaseAdmin
        .from('lead_activities')
        .insert({
          lead_id: finalLead.id,
          company_id: effectiveCompanyId,
          type: 'note',
          content: `Khách đặt lịch xem qua website: ${property.title} (Lúc ${viewingTime} ngày ${normalizedDate})`,
          old_status: null,
          new_status: null,
          created_by: createdByUserId || null,
          created_by_name: customerName || 'Website',
        });

      if (actError) {
        console.error('Lỗi khi tạo lead activity:', actError);
      }
    }

    // 5. Gửi thông báo broadcast & trực tiếp cho tất cả tài khoản trong công ty
    const notifRows: any[] = [
      {
        company_id: effectiveCompanyId,
        recipient_id: null,
        type: 'new_appointment',
        title: '📅 Lịch hẹn xem phòng mới từ website',
        body: `Khách hàng ${customerName} (${normalizedPhone}) vừa đặt lịch xem phòng ${property.title} lúc ${viewingTime} ngày ${normalizedDate}.`,
        link: '/admin/customers/appointments',
        is_read: false,
      },
    ];

    if (effectiveCompanyId) {
      const { data: staffProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', effectiveCompanyId);

      if (staffProfiles && staffProfiles.length > 0) {
        staffProfiles.forEach((s: any) => {
          notifRows.push({
            company_id: effectiveCompanyId,
            recipient_id: s.id,
            type: 'new_appointment',
            title: '📅 Lịch hẹn xem phòng mới từ website',
            body: `Khách hàng ${customerName} (${normalizedPhone}) vừa đặt lịch xem phòng ${property.title} lúc ${viewingTime} ngày ${normalizedDate}.`,
            link: '/admin/customers/appointments',
            is_read: false,
          });
        });
      }
    }

    if (landlordId) {
      notifRows.push({
        company_id: effectiveCompanyId,
        recipient_id: landlordId,
        type: 'new_appointment',
        title: '🏠 Có lịch hẹn xem phòng mới',
        body: `Có lịch xem phòng ${property.title} lúc ${viewingTime} ngày ${normalizedDate}.`,
        link: '/landlord',
        is_read: false,
      });
    }

    await supabaseAdmin.from('notifications').insert(notifRows);

    // 8. Ghi nhật ký hoạt động (activity_logs)
    await supabaseAdmin.from('activity_logs').insert({
      company_id: effectiveCompanyId,
      user_id: createdByUserId || null,
      user_name: customerName || 'Khách hàng vãng lai',
      action: 'CREATE',
      entity: 'appointment',
      entity_id: appointment.id,
      entity_label: property.title || 'Lịch hẹn xem phòng',
      detail: `Khách hàng ${customerName} (${normalizedPhone}) đặt lịch xem phòng ${property.title} lúc ${viewingTime} ngày ${normalizedDate}`,
      ip_address: '127.0.0.1',
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Lỗi API đặt lịch hẹn:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
