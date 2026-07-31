import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('--- Bắt đầu script đồng bộ bộ ảnh theo Trục phòng cho TOÀN BỘ hệ thống ---\n');

  // Lấy danh sách tất cả các tòa nhà
  const { data: buildings, error: bldErr } = await supabase
    .from('buildings')
    .select('id, code, name');

  if (bldErr || !buildings) {
    console.error('Lỗi lấy danh sách tòa nhà:', bldErr);
    return;
  }

  console.log(`Tìm thấy ${buildings.length} tòa nhà. Đang kiểm tra từng tòa...`);

  let totalRestoredRooms = 0;
  let totalRestoredImages = 0;

  for (const bld of buildings) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, code, floor, room_images(*)')
      .eq('building_id', bld.code)
      .order('code', { ascending: true });

    if (!rooms || rooms.length === 0) continue;

    // Nhóm phòng theo 2 chữ số cuối (Mã Trục: 201, 301 -> Trục 01; 202, 302 -> Trục 02)
    const axisMap = new Map<string, any[]>();
    for (const r of rooms) {
      const match = r.code.match(/(\d{2})$/);
      const axis = match ? match[1] : '01';
      if (!axisMap.has(axis)) axisMap.set(axis, []);
      axisMap.get(axis)!.push(r);
    }

    for (const [axis, axisRooms] of Array.from(axisMap.entries())) {
      // Tìm phòng mẫu trong trục có đầy đủ bộ ảnh
      const sampleRoom = axisRooms.find((r: any) => r.room_images && r.room_images.length > 0);
      if (!sampleRoom) continue;

      const templateImages = sampleRoom.room_images;

      for (const r of axisRooms) {
        if (r.id === sampleRoom.id) continue;
        if (r.room_images && r.room_images.length > 0) continue; // Phòng đã có ảnh riêng

        const payloads = templateImages.map((img: any) => ({
          room_id: r.id,
          company_id: img.company_id,
          url: img.url,
          thumbnail_url: img.thumbnail_url || null,
          media_type: img.media_type || 'image',
          is_thumbnail: img.is_thumbnail || false,
          priority: img.priority || 0,
        }));

        const { error: insErr } = await supabase.from('room_images').insert(payloads);
        if (!insErr) {
          totalRestoredRooms++;
          totalRestoredImages += payloads.length;
          console.log(`[${bld.name}] Trục ${axis}: Đã gán ${payloads.length} ảnh mẫu từ phòng ${sampleRoom.code} sang phòng ${r.code}`);
        }
      }
    }
  }

  console.log(`\n--- HOÀN TẤT ĐỒNG BỘ TRỤC ---`);
  console.log(`Đã phục hồi bộ ảnh cho: ${totalRestoredRooms} phòng`);
  console.log(`Tổng số bản ghi ảnh đã gán: ${totalRestoredImages} bản ghi`);
}

main().catch(err => console.error('Lỗi:', err));
