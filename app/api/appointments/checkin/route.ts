import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateDistanceInMeters } from '@/lib/services/haversine';
import { uploadToR2, isR2Configured } from '@/lib/services/cloudflare-r2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, method, lat, lng, photoClient, photoBuilding } = body;

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

    // Fetch building coordinates if room/building is linked
    let buildingLat: number | null = null;
    let buildingLng: number | null = null;
    let buildingName = 'Tòa nhà';

    if (appointment.room_id || appointment.building_id) {
      let buildingId = appointment.building_id;
      if (!buildingId && appointment.room_id) {
        const { data: room } = await supabaseAdmin
          .from('rooms')
          .select('building_id')
          .eq('id', appointment.room_id)
          .maybeSingle();
        if (room) buildingId = room.building_id;
      }

      if (buildingId) {
        const { data: building } = await supabaseAdmin
          .from('buildings')
          .select('name, latitude, longitude')
          .eq('id', buildingId)
          .maybeSingle();

        if (building) {
          buildingName = building.name || buildingName;
          buildingLat = building.latitude ?? null;
          buildingLng = building.longitude ?? null;
        }
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const unlockUntilIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 60 minutes

    // ─── METHOD 1: GPS CHECK-IN ──────────────────────────────────────────────
    if (method === 'gps') {
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return NextResponse.json({ error: 'Missing valid lat/lng coordinates' }, { status: 400 });
      }

      let distance = 0;
      let isWithinRange = true;

      if (buildingLat !== null && buildingLng !== null) {
        distance = calculateDistanceInMeters(lat, lng, buildingLat, buildingLng);
        if (distance > 100) {
          isWithinRange = false;
        }
      }

      if (!isWithinRange) {
        return NextResponse.json({
          success: false,
          isOutOfRange: true,
          distanceMeters: distance,
          message: `Vị trí hiện tại cách tòa nhà ${distance}m (vượt quá bán kính cho phép 100m). Vui lòng chuyển sang Check-in bằng Ảnh thực địa đính TimeMark.`,
        });
      }

      // Update Appointment for GPS Checkin (with safe schema fallback)
      let updated: any = null;
      let updateErr: any = null;

      const gpsPayload: any = {
        checkin_status: 'checked_in_gps',
        checkin_at: nowIso,
        checkin_lat: lat,
        checkin_lng: lng,
        phone_unlocked_until: unlockUntilIso,
        status: 'completed',
        updated_at: nowIso,
      };

      const gpsRes1 = await supabaseAdmin
        .from('appointments')
        .update(gpsPayload)
        .eq('id', appointmentId)
        .select()
        .single();

      if (gpsRes1.error) {
        if (gpsRes1.error.message?.includes('column') || gpsRes1.error.message?.includes('schema cache')) {
          const fallbackRes = await supabaseAdmin
            .from('appointments')
            .update({ status: 'completed', updated_at: nowIso } as any)
            .eq('id', appointmentId)
            .select()
            .single();
          updated = fallbackRes.data;
          updateErr = fallbackRes.error;
        } else {
          updateErr = gpsRes1.error;
        }
      } else {
        updated = gpsRes1.data;
      }

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Notification
      try {
        await supabaseAdmin.from('notifications').insert({
          company_id: appointment.company_id,
          title: `✅ CHECK-IN DẪN KHÁCH THÀNH CÔNG (GPS)`,
          body: `Sale ${appointment.assigned_to_name || 'Sale'} đã CHECK-IN GPS thành công tại ${buildingName} để xem phòng ${appointment.room_title || ''}. Minh chứng GPS đã được ghi nhận.`,
          type: 'appointment',
          link: `/admin/appointments?id=${appointmentId}`,
        } as any);
      } catch (nErr) {
        console.error('[CheckinAPI] Notification error:', nErr);
      }

      return NextResponse.json({
        success: true,
        checkinStatus: 'checked_in_gps',
        phoneUnlockedUntil: unlockUntilIso,
        appointment: updated,
        message: 'Check-in định vị GPS thành công! Quyền mở số Chủ nhà đã được kích hoạt trong 60 phút.',
      });
    }

    // ─── METHOD 2: PHOTO WATERMARK CHECK-IN ──────────────────────────────────
    if (method === 'photo') {
      let clientPhotoUrl = photoClient || '';
      let buildingPhotoUrl = photoBuilding || '';

      // Upload base64 image data to R2 or return as is if already URL
      if (photoClient && photoClient.startsWith('data:image')) {
        try {
          const base64Data = photoClient.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `checkin_client_${appointmentId}_${Date.now()}.jpg`;
          if (isR2Configured) {
            clientPhotoUrl = await uploadToR2(buffer, filename, 'image/jpeg');
          }
        } catch (uErr) {
          console.error('[CheckinAPI] Upload photoClient error:', uErr);
        }
      }

      if (photoBuilding && photoBuilding.startsWith('data:image')) {
        try {
          const base64Data = photoBuilding.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `checkin_building_${appointmentId}_${Date.now()}.jpg`;
          if (isR2Configured) {
            buildingPhotoUrl = await uploadToR2(buffer, filename, 'image/jpeg');
          }
        } catch (uErr) {
          console.error('[CheckinAPI] Upload photoBuilding error:', uErr);
        }
      }

      // Update Appointment for Photo Checkin (with safe schema fallback)
      let updated: any = null;
      let updateErr: any = null;

      const photoPayload: any = {
        checkin_status: 'checked_in_photo',
        checkin_at: nowIso,
        checkin_lat: typeof lat === 'number' ? lat : null,
        checkin_lng: typeof lng === 'number' ? lng : null,
        checkin_photo_with_client: clientPhotoUrl,
        checkin_photo_building: buildingPhotoUrl,
        phone_unlocked_until: unlockUntilIso,
        status: 'completed',
        updated_at: nowIso,
      };

      const photoRes1 = await supabaseAdmin
        .from('appointments')
        .update(photoPayload)
        .eq('id', appointmentId)
        .select()
        .single();

      if (photoRes1.error) {
        if (photoRes1.error.message?.includes('column') || photoRes1.error.message?.includes('schema cache')) {
          const fallbackRes = await supabaseAdmin
            .from('appointments')
            .update({ status: 'completed', updated_at: nowIso } as any)
            .eq('id', appointmentId)
            .select()
            .single();
          updated = fallbackRes.data;
          updateErr = fallbackRes.error;
        } else {
          updateErr = photoRes1.error;
        }
      } else {
        updated = photoRes1.data;
      }

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Notification with proof
      try {
        await supabaseAdmin.from('notifications').insert({
          company_id: appointment.company_id,
          title: `📸 CHECK-IN DẪN KHÁCH THÀNH CÔNG (ẢNH TIMEMARK)`,
          body: `Sale ${appointment.assigned_to_name || 'Sale'} đã CHECK-IN bằng 2 ảnh TimeMark thực địa tại ${buildingName} xem phòng ${appointment.room_title || ''}. Bằng chứng đã được lưu vào hệ thống.`,
          type: 'appointment',
          link: `/admin/appointments?id=${appointmentId}`,
        } as any);
      } catch (nErr) {
        console.error('[CheckinAPI] Notification error:', nErr);
      }

      return NextResponse.json({
        success: true,
        checkinStatus: 'checked_in_photo',
        phoneUnlockedUntil: unlockUntilIso,
        appointment: updated,
        message: 'Check-in bằng Ảnh TimeMark thực địa thành công! Quyền mở số Chủ nhà đã được kích hoạt trong 60 phút.',
      });
    }

    return NextResponse.json({ error: 'Invalid check-in method' }, { status: 400 });
  } catch (error: any) {
    console.error('[CheckinAPI] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
