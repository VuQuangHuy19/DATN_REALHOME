import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('--- CHẨN ĐOÁN 2 TÒA NHÀ NGUYỄN NGỌC VŨ ---');

  // 1. Kiểm tra 2 chủ nhà TH01 và TH02
  const { data: landlords } = await supabase
    .from('landlords')
    .select('id, code, name')
    .in('code', ['TH01', 'TH02']);

  console.log('Chủ nhà tìm thấy:', landlords);

  const th01Id = landlords?.find(l => l.code === 'TH01')?.id;
  const th02Id = landlords?.find(l => l.code === 'TH02')?.id;

  // 2. Tìm tất cả tòa nhà có tên hoặc địa chỉ "Nguyễn Ngọc Vũ"
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, code, name, address, landlord_id, image_url')
    .ilike('name', '%Nguyễn Ngọc Vũ%');

  console.log('\n--- DANH SÁCH TÒA NHÀ NGUYỄN NGỌC VŨ IN DB ---');
  for (const b of buildings || []) {
    const lCode = landlords?.find(l => l.id === b.landlord_id)?.code || 'Chưa gán/Khác';
    console.log(`- Building ID: ${b.id} | Code: ${b.code} | Name: "${b.name}" | Address: "${b.address}" | Landlord: ${lCode} (id: ${b.landlord_id}) | Image: ${b.image_url}`);
  }

  // 3. Kiểm tra phòng 0635c8cc-59ac-4d3c-928e-457e08e2f536
  const targetRoomId = '0635c8cc-59ac-4d3c-928e-457e08e2f536';
  const { data: targetRoom } = await supabase
    .from('rooms')
    .select('*, buildings(*), room_images(*)')
    .eq('id', targetRoomId)
    .maybeSingle();

  if (targetRoom) {
    console.log('\n--- THÔNG TIN PHÒNG 0635c8cc-59ac-4d3c-928e-457e08e2f536 ---');
    console.log('Room Code:', targetRoom.code);
    console.log('Building Code:', targetRoom.building_id);
    console.log('Building Name:', targetRoom.buildings?.name);
    console.log('Building Landlord ID:', targetRoom.buildings?.landlord_id);
    console.log('Số lượng room_images:', targetRoom.room_images?.length);
    console.log('URLs:', targetRoom.room_images?.map((i: any) => i.url));
  } else {
    console.log(`\nKhông tìm thấy phòng với ID: ${targetRoomId}`);
  }
}

main();
