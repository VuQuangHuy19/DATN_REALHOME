import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const targetRoomId = '0635c8cc-59ac-4d3c-928e-457e08e2f536';
  
  // 1. Lấy thông tin phòng 201 của Tòa 2 (TH02)
  const { data: sampleRoom, error: rErr } = await supabase
    .from('rooms')
    .select('*, room_images(*)')
    .eq('id', targetRoomId)
    .single();

  if (rErr || !sampleRoom || !sampleRoom.room_images || sampleRoom.room_images.length === 0) {
    console.error('Không tìm thấy phòng mẫu 201 hoặc phòng không có ảnh:', rErr);
    return;
  }

  const buildingCode = sampleRoom.building_id; // '1NN767'
  const templateImages = sampleRoom.room_images;
  const firstImageUrl = templateImages.find((img: any) => img.media_type !== 'video')?.url || templateImages[0].url;

  console.log(`Phòng mẫu 201 (Tòa code: ${buildingCode}): Có ${templateImages.length} ảnh`);
  console.log(`Cover image URL: ${firstImageUrl}`);

  // 2. Cập nhật ảnh đại diện Tòa nhà 2 (1NN767)
  const { error: bldUpdateErr } = await supabase
    .from('buildings')
    .update({
      image_url: firstImageUrl,
      thumbnail_url: firstImageUrl,
      updated_at: new Date().toISOString()
    })
    .eq('code', buildingCode);

  if (bldUpdateErr) {
    console.error('Lỗi cập nhật ảnh đại diện tòa nhà:', bldUpdateErr.message);
  } else {
    console.log(`Đã cập nhật ảnh đại diện cho Tòa nhà ${buildingCode}`);
  }

  // 3. Lấy tất cả các phòng thuộc Tòa 2 (TH02)
  const { data: allRooms } = await supabase
    .from('rooms')
    .select('id, code, room_images(*)')
    .eq('building_id', buildingCode);

  if (!allRooms) return;

  console.log(`Tổng số phòng thuộc Tòa ${buildingCode}: ${allRooms.length}`);

  let updatedRoomsCount = 0;

  for (const r of allRooms) {
    if (r.id === targetRoomId) continue;
    if (r.room_images && r.room_images.length > 0) {
      console.log(`- Phòng ${r.code} đã có ${r.room_images.length} ảnh, bỏ qua.`);
      continue;
    }

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
    if (insErr) {
      console.error(`- Lỗi chèn ảnh cho phòng ${r.code}:`, insErr.message);
    } else {
      updatedRoomsCount++;
      console.log(`- Thành công gán ${payloads.length} ảnh từ phòng 201 cho phòng ${r.code}`);
    }
  }

  console.log(`\nHOÀN TẤT: Đã gán bộ ảnh phòng 201 cho ${updatedRoomsCount} phòng thuộc Tòa 139 Nguyễn Ngọc Vũ (TH02).`);
}

main();
