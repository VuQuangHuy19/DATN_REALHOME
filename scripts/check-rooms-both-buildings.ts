import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const bld1Code = '7NNV';
  const bld2Code = '1NN767';

  const { data: bld1Rooms } = await supabase
    .from('rooms')
    .select('id, code, building_id, landlord_id, room_images(*)')
    .eq('building_id', bld1Code)
    .order('code');

  const { data: bld2Rooms } = await supabase
    .from('rooms')
    .select('id, code, building_id, landlord_id, room_images(*)')
    .eq('building_id', bld2Code)
    .order('code');

  console.log(`\n=== TÒA 1 (Code: ${bld1Code} - SỐ 7 NGÕ 139 NGUYỄN NGỌC VŨ - TH01) ===`);
  console.log(`Số phòng: ${bld1Rooms?.length}`);
  bld1Rooms?.forEach(r => {
    console.log(`- Phòng ${r.code} (ID: ${r.id}): ${r.room_images?.length} ảnh. Image 1: ${r.room_images?.[0]?.url}`);
  });

  console.log(`\n=== TÒA 2 (Code: ${bld2Code} - 139 NGUYỄN NGỌC VŨ - TH02) ===`);
  console.log(`Số phòng: ${bld2Rooms?.length}`);
  bld2Rooms?.forEach(r => {
    console.log(`- Phòng ${r.code} (ID: ${r.id}): ${r.room_images?.length} ảnh. Image 1: ${r.room_images?.[0]?.url}`);
  });
}

main();
