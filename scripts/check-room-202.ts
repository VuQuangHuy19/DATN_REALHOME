import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const roomId = '1a9b6173-fafa-4075-9009-26516ec6f4b6';
  
  // Lấy thông tin phòng
  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('*, buildings(*), room_images(*)')
    .eq('id', roomId)
    .single();

  if (roomErr || !room) {
    console.error('Không tìm thấy phòng:', roomErr);
    return;
  }

  console.log('--- THÔNG TIN PHÒNG 202 ---');
  console.log('Phòng code:', room.code);
  console.log('Building code:', room.building_id);
  console.log('Building name:', room.buildings?.name);
  console.log('Building address:', room.buildings?.address);
  console.log('Building image_url:', room.buildings?.image_url);
  console.log('Số lượng room_images trong DB cho phòng này:', room.room_images?.length || 0);
  if (room.room_images && room.room_images.length > 0) {
    console.log('Danh sách URLs phòng:', room.room_images.map((img: any) => img.url));
  }

  // Tìm các phòng khác cùng tòa nhà này
  const { data: bldRooms } = await supabase
    .from('rooms')
    .select('id, code, room_images(*)')
    .eq('building_id', room.building_id);

  console.log(`\nTổng số phòng thuộc tòa nhà ${room.building_id}: ${bldRooms?.length}`);
  const roomsWithImages = bldRooms?.filter(r => r.room_images && r.room_images.length > 0) || [];
  console.log(`Số phòng có room_images trong DB: ${roomsWithImages.length}/${bldRooms?.length}`);
}

main();
