import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { isR2Configured, uploadToR2 } from '@/src/lib/services/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Helper upload ảnh checkin lên Cloudflare R2 theo cấu trúc folder:
 * - Ảnh tòa nhà: check_in_images/check_in_buildings/checkin_building_<appointmentId>_<timestamp>.jpg
 * - Ảnh với khách: check_in_images/check_in_clients/checkin_client_<appointmentId>_<timestamp>.jpg
 */
async function processAndUploadImage(
  imageData: string,
  folderPath: string, // e.g. 'check_in_images/check_in_buildings' or 'check_in_images/check_in_clients'
  fileNamePrefix: string, // e.g. 'checkin_building' or 'checkin_client'
  appointmentId: string
): Promise<string | null> {
  if (!imageData) return null;

  // Nếu là URL http/https đã upload rồi
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }

  let buffer: Buffer;
  let contentType = 'image/jpeg';
  let ext = 'jpg';

  if (imageData.startsWith('data:')) {
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      contentType = matches[1];
      ext = contentType.split('/')[1] || 'jpg';
      if (ext === 'jpeg') ext = 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    }
  } else {
    buffer = Buffer.from(imageData, 'base64');
  }

  const timestamp = Date.now();
  const key = `${folderPath}/${fileNamePrefix}_${appointmentId}_${timestamp}.${ext}`;

  // 1. Ưu tiên Cloudflare R2
  if (isR2Configured()) {
    console.log(`[Checkin Upload] Đang tải ảnh ${key} lên Cloudflare R2...`);
    const r2Url = await uploadToR2(buffer, key, contentType);
    if (r2Url) {
      console.log(`[Checkin Upload] Upload thành công R2: ${r2Url}`);
      return r2Url;
    }
    console.warn(`[Checkin Upload] Upload R2 lỗi cho ${key}, chuyển sang Supabase Storage fallback...`);
  }

  // 2. Dự phòng Supabase Storage
  try {
    const bucket = 'room_images';
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, buffer, { contentType, upsert: true });

    if (!uploadErr) {
      const { data: pubData } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);
      return pubData.publicUrl;
    }
  } catch (err: any) {
    console.error(`[Storage Fallback Error] (${key}):`, err?.message || err);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId, method, lat, lng, photoClient, photoBuilding } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Thiếu appointmentId' }, { status: 400 });
    }

    // 1. Lấy thông tin lịch hẹn
    const { data: appointment, error: fetchErr } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: 'Không tìm thấy lịch hẹn' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const phoneUnlockedUntil = new Date(Date.now() + 3600000).toISOString();

    // 2. Xử lý Check-in bằng GPS
    if (method === 'gps') {
      // Kiểm tra khoảng cách nếu tòa nhà có tọa độ GPS
      let isOutOfRange = false;
      let buildingLat: number | null = null;
      let buildingLng: number | null = null;

      const buildingKey = appointment.building_id || appointment.room_id;
      if (buildingKey) {
        const { data: b } = await supabaseAdmin
          .from('buildings')
          .select('lat, lng')
          .or(`id.eq.${buildingKey},code.eq.${buildingKey}`)
          .maybeSingle();

        if (b && b.lat && b.lng) {
          buildingLat = Number(b.lat);
          buildingLng = Number(b.lng);
        }
      }

      if (lat && lng && buildingLat && buildingLng) {
        // Haversine formula tính khoảng cách (meters)
        const R = 6371e3;
        const dLat = ((buildingLat - lat) * Math.PI) / 180;
        const dLng = ((buildingLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((buildingLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = R * c;

        if (distanceMeters > 300) {
          isOutOfRange = true;
        }
      }

      if (isOutOfRange) {
        return NextResponse.json({
          success: false,
          isOutOfRange: true,
          message: 'Vị trí hiện tại của bạn cách tòa nhà hơn 300m. Vui lòng thực hiện Check-in bằng 2 Ảnh TimeMark thực địa!',
        });
      }

      // Cập nhật trạng thái check-in GPS
      const updateData: any = {
        checkin_status: 'checked_in_gps',
        checkin_at: nowIso,
        checkin_lat: lat || null,
        checkin_lng: lng || null,
        phone_unlocked_until: phoneUnlockedUntil,
        status: 'completed',
      };

      const { data: updatedAppt, error: updateErr } = await supabaseAdmin
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select('*')
        .single();

      if (updateErr) {
        console.error('[Checkin GPS Update Error]:', updateErr);
        return NextResponse.json({ error: 'Cập nhật Check-in GPS thất bại' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        checkinStatus: 'checked_in_gps',
        phoneUnlockedUntil,
        appointment: updatedAppt,
      });
    }

    // 3. Xử lý Check-in bằng 2 Ảnh TimeMark
    let uploadedClientUrl: string | null = null;
    let uploadedBuildingUrl: string | null = null;

    if (photoClient) {
      uploadedClientUrl = await processAndUploadImage(
        photoClient,
        'check_in_images/check_in_clients',
        'checkin_client',
        appointmentId
      );
    }

    if (photoBuilding) {
      uploadedBuildingUrl = await processAndUploadImage(
        photoBuilding,
        'check_in_images/check_in_buildings',
        'checkin_building',
        appointmentId
      );
    }

    const updateData: any = {
      checkin_status: 'checked_in_photo',
      checkin_at: nowIso,
      checkin_lat: lat || appointment.checkin_lat || null,
      checkin_lng: lng || appointment.checkin_lng || null,
      phone_unlocked_until: phoneUnlockedUntil,
      status: 'completed',
    };

    if (uploadedClientUrl) {
      updateData.checkin_photo_with_client = uploadedClientUrl;
    }
    if (uploadedBuildingUrl) {
      updateData.checkin_photo_building = uploadedBuildingUrl;
    }

    const { data: updatedAppt, error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[Checkin Photo Update Error]:', updateErr);
      return NextResponse.json({ error: 'Cập nhật Check-in bằng Ảnh thất bại' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkinStatus: 'checked_in_photo',
      phoneUnlockedUntil,
      appointment: updatedAppt,
    });
  } catch (error: any) {
    console.error('[Checkin API Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server khi check-in' }, { status: 500 });
  }
}
