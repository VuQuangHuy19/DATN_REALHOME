import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchNearbyPlaces } from '@/lib/services/nearby-places';
import { geocodeLandmark } from '@/lib/geocoding';

/**
 * POST /api/nearby-places
 * Tự động quét các địa điểm nổi bật xung quanh tòa nhà (Trường ĐH, Vincom, Công viên...)
 * từ tọa độ GPS (hoặc tự geocode địa chỉ) và lưu kết quả vào bảng buildings.nearby_places.
 *
 * Body: { buildingId: string }
 */
export async function POST(request: Request) {
  try {
    const { buildingId } = await request.json();
    if (!buildingId) {
      return NextResponse.json({ error: 'Thiếu buildingId' }, { status: 400 });
    }

    // Lấy tọa độ tòa nhà
    const { data: building, error: bErr } = await supabaseAdmin
      .from('buildings')
      .select('id, latitude, longitude, name, address')
      .eq('id', buildingId)
      .maybeSingle();

    if (bErr || !building) {
      return NextResponse.json(
        { error: bErr?.message || 'Không tìm thấy tòa nhà' },
        { status: 404 }
      );
    }

    let lat = building.latitude;
    let lng = building.longitude;

    // Nếu chưa có lat/lng, tự động geocode từ địa chỉ tòa nhà
    if ((!lat || !lng) && building.address) {
      const geoResult = await geocodeLandmark(building.address);
      if (geoResult) {
        lat = geoResult.lat;
        lng = geoResult.lng;
        // Lưu lại lat/lng vào DB tòa nhà
        await supabaseAdmin
          .from('buildings')
          .update({ latitude: lat, longitude: lng })
          .eq('id', buildingId);
      }
    }

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Tòa nhà chưa có tọa độ GPS và không thể tự động xác định vị trí từ địa chỉ.' },
        { status: 400 }
      );
    }

    // Gọi Overpass API quét địa điểm xung quanh
    const nearbyPlaces = await fetchNearbyPlaces(lat, lng);

    // Lưu kết quả vào DB (nếu bảng buildings chưa có cột nearby_places thì ghi log warning và vẫn trả về dữ liệu cho UI)
    const { error: updateErr } = await supabaseAdmin
      .from('buildings')
      .update({ nearby_places: nearbyPlaces as any })
      .eq('id', buildingId);

    if (updateErr) {
      console.warn('[API /nearby-places] Could not save to DB (column nearby_places may be missing):', updateErr.message);
    }

    const totalPOIs =
      (nearbyPlaces.education?.length || 0) +
      (nearbyPlaces.shopping?.length || 0) +
      (nearbyPlaces.public?.length || 0);

    return NextResponse.json({
      success: true,
      message: `Đã quét thành công ${totalPOIs} địa điểm xung quanh "${building.name || building.address}"`,
      data: nearbyPlaces,
    });
  } catch (err: any) {
    console.error('[API /nearby-places] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

