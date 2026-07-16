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
    const { companyId, customerName, customerPhone, property, viewingDate, viewingTime } = body;

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

    // 1. Lấy thông tin landlord_id và building_id từ phòng tương ứng
    const { data: roomData } = await supabaseAdmin
      .from('rooms')
      .select('landlord_id, building_id')
      .eq('id', property.id)
      .maybeSingle();

    const landlordId = roomData?.landlord_id ?? null;
    const buildingId = roomData?.building_id ?? null;

    // 2. Tạo lịch hẹn (appointments) bằng admin client (bypass RLS)
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .insert({
        company_id: companyId,
        customer_name: customerName,
        customer_phone: normalizedPhone,     // Đã normalize
        customer_email: null,
        room_id: property.id,
        room_title: property.title,
        date: normalizedDate,
        time: viewingTime,
        area: property.area ?? null,
        status: 'Pending',
        notes: 'Yêu cầu xem qua website',
        assigned_to: null,
        assigned_to_name: null,
        landlord_id: landlordId,
        building_id: buildingId,
      })
      .select()
      .single();

    if (aptError) {
      console.error('Lỗi khi tạo lịch hẹn:', aptError);
      return NextResponse.json({ error: aptError.message }, { status: 400 });
    }

    // 3. Tạo lead mới bằng admin client (bypass RLS)
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        company_id: companyId,
        full_name: customerName,
        phone: normalizedPhone,              // Đã normalize
        email: null,
        source: 'website',
        status: 'new',
        interest: property.title,
        budget: 0,
        preferred_area: property.area ?? null,
        preferred_room_type: null,
        interested_area: property.area ?? null,
        assigned_to: null,
        notes: `Đặt lịch xem: ${property.title} — ${normalizedDate} ${viewingTime}`,
        last_contacted_at: null,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lỗi khi tạo lead:', leadError);
      // Không trả về lỗi chặn vì lịch hẹn đã được tạo thành công
    }

    // 4. Tạo lead activity nếu lead được tạo thành công
    if (lead) {
      const { error: actError } = await supabaseAdmin
        .from('lead_activities')
        .insert({
          lead_id: lead.id,
          company_id: companyId,
          type: 'note',
          content: `Khách đặt lịch xem qua website: ${property.title}`,
          old_status: null,
          new_status: null,
          created_by: null,
          created_by_name: 'Website',
        });

      if (actError) {
        console.error('Lỗi khi tạo lead activity:', actError);
      }
    }

    // 5. Gửi thông báo cho toàn bộ nhân sự công ty (in_app + push)
    await notify({
      companyId,
      recipientId: null, // Gửi cho tất cả (trừ landlord/tenant dựa trên logic notify/policy)
      type: 'lead_new',
      title: 'Lịch hẹn mới từ website',
      message: `Khách hàng ${customerName} (${normalizedPhone}) vừa đặt lịch xem phòng ${property.title} lúc ${viewingTime} ngày ${normalizedDate}.`,
      channels: ['in_app', 'push'],
      link: '/admin/appointments', // Link trỏ tới trang quản lý lịch hẹn
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Lỗi API đặt lịch hẹn:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
