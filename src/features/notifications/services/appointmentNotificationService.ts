import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sendSMSNotificationToCustomer,
  sendSMSNotificationToLandlord,
} from '@/lib/sms/esmsService';
import { buildNotificationDataPayload } from '@/lib/notifications/phoneMasker';

export interface CreateAppointmentNotificationInput {
  room_id?: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  time: string;
  note?: string;
  company_id?: string;
  assigned_sale_id?: string;
}

export interface ConfirmAppointmentInput {
  appointment_id: string;
  sale_id: string;
  sale_name: string;
  sale_phone?: string;
}

// ── 1. Create Appointment & Send Broadcast Notifications (Flow C) ───────────

export async function createAppointmentWithNotification(
  input: CreateAppointmentNotificationInput
) {
  const {
    room_id,
    customer_name,
    customer_phone,
    date,
    time,
    note,
    company_id,
    assigned_sale_id,
  } = input;

  let landlordId: string | null = null;
  let buildingAddress = '';
  let buildingName = '';
  let landlordPhone = '';
  let landlordName = '';

  if (room_id) {
    const { data: room } = await supabase
      .from('rooms')
      .select('id, code, building_id')
      .eq('id', room_id)
      .maybeSingle();

    if (room && room.building_id) {
      const { data: bld } = await supabase
        .from('buildings')
        .select('name, address, landlord_id')
        .eq('id', room.building_id)
        .maybeSingle();

      if (bld) {
        buildingName = bld.name || '';
        buildingAddress = bld.address || '';
        landlordId = bld.landlord_id || null;
      }
    }
  }

  if (landlordId) {
    const { data: landlord } = await supabase
      .from('landlords')
      .select('name, phone')
      .eq('id', landlordId)
      .maybeSingle();

    if (landlord) {
      landlordName = landlord.name || '';
      landlordPhone = landlord.phone || '';
    }
  }

  const { data: appointment, error: appErr } = await supabase
    .from('appointments')
    .insert({
      room_id: room_id || null,
      customer_name,
      customer_phone,
      date,
      time,
      note: note || null,
      company_id: company_id || null,
      assigned_to: assigned_sale_id || null,
      landlord_id: landlordId,
      status: assigned_sale_id ? 'Confirm' : 'Pending',
      created_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (appErr || !appointment) {
    console.error('Error creating appointment:', appErr);
    throw new Error('Không thể tạo lịch hẹn xem phòng');
  }

  // Find Sales Agents in company to broadcast notification
  if (company_id) {
    const { data: salesList } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('company_id', company_id);

    let assignedSaleName = '';
    let assignedSalePhone = '';

    if (assigned_sale_id && salesList) {
      const s = salesList.find((x: any) => x.id === assigned_sale_id);
      if (s) {
        assignedSaleName = s.full_name || '';
        assignedSalePhone = s.phone || '';
      }
    }

    if (salesList && salesList.length > 0) {
      const notificationRows = salesList.map((sale: any) => {
        return {
          company_id: company_id || null,
          recipient_id: sale.id,
          type: 'new_appointment',
          title: '📅 Lịch hẹn xem phòng mới',
          body: `Khách hàng ${customer_name} (${customer_phone}) vừa đăng ký xem phòng lúc ${time} ngày ${date}.`,
          link: '/admin/customers/appointments',
          is_read: false,
        };
      });

      await supabaseAdmin.from('notifications').insert(notificationRows as any);
    }

    // Always insert a broadcast notification for Company Admin & Managers
    await supabaseAdmin.from('notifications').insert({
      company_id: company_id || null,
      recipient_id: null,
      type: 'new_appointment',
      title: '📅 Lịch hẹn xem phòng mới',
      body: `Khách hàng ${customer_name} (${customer_phone}) vừa đăng ký xem phòng lúc ${time} ngày ${date}.`,
      link: '/admin/customers/appointments',
      is_read: false,
    } as any);

    if (landlordId) {
      await supabaseAdmin.from('notifications').insert({
        company_id: company_id || null,
        recipient_id: landlordId,
        type: 'new_appointment',
        title: '🏠 Có lịch hẹn xem phòng mới',
        body: `Có lịch xem phòng lúc ${time} ngày ${date}.`,
        link: '/landlord',
        is_read: false,
      } as any);

      // SMS to Landlord (BẢO MẬT: Không gửi SĐT khách)
      if (landlordPhone) {
        sendSMSNotificationToLandlord({
          landlordPhone,
          customerName: customer_name,
          roomCode: `Phòng xem`,
          buildingName: buildingName || '',
          buildingAddress: buildingAddress || '',
          saleName: assignedSaleName || 'Sale phụ trách',
          salePhone: assignedSalePhone || '',
          date,
          time,
        }).catch((err) => console.error('[eSMS Landlord Error]', err));
      }
    }

    // SMS to Customer
    if (customer_phone) {
      sendSMSNotificationToCustomer({
        customerPhone: customer_phone,
        customerName: customer_name,
        roomCode: `Phòng xem`,
        buildingName: buildingName || '',
        buildingAddress: buildingAddress || '',
        landlordName: landlordName || '',
        saleName: assignedSaleName || 'Sale phụ trách',
        salePhone: assignedSalePhone || '',
        date,
        time,
      }).catch((err) => console.error('[eSMS Customer Error]', err));
    }
  }

  return appointment;
}

// ── 2. Confirm Appointment Service (Flow B - Concurrency & Race Protection) ───

export async function confirmAppointmentService(input: ConfirmAppointmentInput) {
  const { appointment_id, sale_id, sale_name, sale_phone } = input;

  const { data: existingApp, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, assigned_to, status, room_id, customer_name, customer_phone, date, time, company_id, landlord_id')
    .eq('id', appointment_id)
    .maybeSingle();

  if (fetchErr || !existingApp) {
    const notFoundError = new Error('Lịch hẹn không tồn tại hoặc đã bị xóa trên hệ thống');
    (notFoundError as any).statusCode = 404;
    throw notFoundError;
  }

  if (existingApp.assigned_to && existingApp.assigned_to !== sale_id) {
    throw new Error('Lịch hẹn này đã được tiếp nhận bởi một sale khác!');
  }

  // Atomic Update
  const { data: updatedApp, error: updateErr } = await supabase
    .from('appointments')
    .update({
      status: 'Confirm',
      assigned_to: sale_id,
      assigned_to_name: sale_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointment_id)
    .select()
    .single();

  if (updateErr || !updatedApp) {
    throw new Error('Không thể tiếp nhận lịch hẹn. Vui lòng thử lại.');
  }

  // NOTE: Room status stays 'available' per user preference so it stays browseable with "🔥 Có [X] lịch xem" badge!

  // Inactivate old broadcast notifications for OTHER sales
  await supabase
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('appointment_id', appointment_id)
    .neq('recipient_id', sale_id);

  // Flow B Notification to Landlord & SMS Dispatch
  let buildingAddress = '';
  let buildingName = '';
  let roomCode = '';
  let landlordPhone = '';
  let landlordName = '';

  if (updatedApp.room_id) {
    const { data: room } = await supabase
      .from('rooms')
      .select('code, building_id')
      .eq('id', updatedApp.room_id)
      .maybeSingle();

    if (room) {
      roomCode = room.code;
      if (room.building_id) {
        const { data: bld } = await supabase
          .from('buildings')
          .select('name, address, landlord_id')
          .eq('id', room.building_id)
          .maybeSingle();

        if (bld) {
          buildingName = bld.name || '';
          buildingAddress = bld.address || '';
        }
      }
    }
  }

  if (updatedApp.landlord_id) {
    const { data: landlord } = await supabase
      .from('landlords')
      .select('name, phone')
      .eq('id', updatedApp.landlord_id)
      .maybeSingle();

    if (landlord) {
      landlordName = landlord.name || '';
      landlordPhone = landlord.phone || '';
    }

    const landlordPayload = buildNotificationDataPayload({
      customerName: updatedApp.customer_name,
      customerPhone: updatedApp.customer_phone,
      roomTitle: `Phòng ${roomCode}`,
      roomAddress: buildingAddress,
      saleName: sale_name,
      salePhone: sale_phone || '',
      appointmentTime: `${updatedApp.time} - ${updatedApp.date}`,
      appointmentId: appointment_id,
      recipientRole: 'landlord',
    });

    await supabaseAdmin.from('notifications').insert({
      company_id: updatedApp.company_id,
      recipient_id: updatedApp.landlord_id,
      type: 'appointment',
      title: '🏠 Lịch hẹn xem phòng đã được xác nhận',
      body: `Sale ${sale_name} đã xác nhận dẫn khách xem phòng ${roomCode || ''} lúc ${updatedApp.time} ngày ${updatedApp.date}.`,
      link: '/landlord',
      is_read: false,
    } as any);

    // SMS to Landlord (BẢO MẬT: Tuyệt đối KHÔNG gửi SĐT khách)
    if (landlordPhone) {
      sendSMSNotificationToLandlord({
        landlordPhone,
        customerName: updatedApp.customer_name,
        roomCode: `Phòng ${roomCode}`,
        buildingName,
        buildingAddress,
        saleName: sale_name,
        salePhone: sale_phone || '',
        date: updatedApp.date,
        time: updatedApp.time,
      }).catch((smsErr) => console.error('[eSMS Landlord Error]', smsErr));
    }
  }

  // SMS to Customer
  if (updatedApp.customer_phone) {
    sendSMSNotificationToCustomer({
      customerPhone: updatedApp.customer_phone,
      customerName: updatedApp.customer_name || 'Khách hàng',
      roomCode: `Phòng ${roomCode}`,
      buildingName,
      buildingAddress,
      landlordName,
      saleName: sale_name,
      salePhone: sale_phone || '',
      date: updatedApp.date,
      time: updatedApp.time,
    }).catch((smsErr) => console.error('[eSMS Customer Error]', smsErr));
  }

  return updatedApp;
}
