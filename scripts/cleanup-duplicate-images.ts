import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Lỗi: Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const cleanBuildingDuplicates = args.includes('--clean-building-shared');

async function main() {
  console.log('--- Bắt đầu chẩn đoán & dọn dẹp dữ liệu bảng room_images ---\n');

  let allImages: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('room_images')
      .select('id, room_id, url, created_at, is_thumbnail, priority')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Lỗi lấy room_images:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allImages.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`[1] Tổng số bản ghi room_images trong DB: ${allImages.length}`);

  // 1. Check trùng (room_id, url)
  const roomUrlMap = new Map<string, any[]>();
  for (const img of allImages) {
    const key = `${img.room_id}::${img.url}`;
    if (!roomUrlMap.has(key)) roomUrlMap.set(key, []);
    roomUrlMap.get(key)!.push(img);
  }

  const exactRoomUrlDuplicates: string[] = [];
  for (const [key, items] of Array.from(roomUrlMap.entries())) {
    if (items.length > 1) {
      items.sort((a: any, b: any) => (a.is_thumbnail ? -1 : 1));
      const dups = items.slice(1);
      for (const d of dups) exactRoomUrlDuplicates.push(d.id);
    }
  }

  console.log(`[2] Số bản ghi trùng tuyệt đối (cùng room_id, cùng url): ${exactRoomUrlDuplicates.length}`);

  // 2. Chẩn đoán các ảnh dùng chung cho nhiều phòng (> 1 phòng)
  const urlToRoomsMap = new Map<string, string[]>();
  const urlToImageIdsMap = new Map<string, string[]>();

  for (const img of allImages) {
    if (!urlToRoomsMap.has(img.url)) {
      urlToRoomsMap.set(img.url, []);
      urlToImageIdsMap.set(img.url, []);
    }
    urlToRoomsMap.get(img.url)!.push(img.room_id);
    urlToImageIdsMap.get(img.url)!.push(img.id);
  }

  let sharedImageCount = 0;
  let totalSharedDbRows = 0;
  const sharedIdsToRemove: string[] = [];

  for (const [url, roomIds] of Array.from(urlToRoomsMap.entries())) {
    if (roomIds.length > 1) {
      sharedImageCount++;
      totalSharedDbRows += roomIds.length;

      // Nếu truyền cờ --clean-building-shared: 
      // Giữ lại 1 bản ghi duy nhất cho 1 phòng đại diện (hoặc cho Tòa nhà), xoá các bản ghi thừa ở các phòng còn lại 
      // (Vì giao diện sẽ tự động hiển thị ảnh đại diện tòa nhà khi phòng không có room_images riêng)
      const ids = urlToImageIdsMap.get(url)!;
      // Giữ lại id đầu tiên, xoá các id còn lại
      for (let i = 1; i < ids.length; i++) {
        sharedIdsToRemove.push(ids[i]);
      }
    }
  }

  console.log(`[3] Số URL ảnh được dùng chung ở nhiều hơn 1 phòng: ${sharedImageCount} ảnh`);
  console.log(`    (Tổng số dòng DB bị chiếm bởi các ảnh dùng chung này: ${totalSharedDbRows} dòng)`);

  const idsToDelete = Array.from(new Set([...exactRoomUrlDuplicates, ...(cleanBuildingDuplicates ? sharedIdsToRemove : [])]));

  console.log(`\nTổng số dòng DB đề xuất xoá: ${idsToDelete.length}`);
  if (cleanBuildingDuplicates) {
    console.log(`(Đang bật cờ --clean-building-shared: sẽ dọn dẹp các dòng sao chép ảnh dùng chung giữa các phòng)`);
  } else {
    console.log(`(Nếu muốn dọn dẹp cả ảnh dùng chung được sao chép sang hàng chục phòng, hãy chạy với cờ --clean-building-shared)`);
  }

  if (idsToDelete.length === 0) {
    console.log('\nDB không có bản ghi nào cần xoá.');
    return;
  }

  if (dryRun) {
    console.log(`\n[DRY-RUN] Sẽ xoá ${idsToDelete.length} bản ghi.`);
    console.log(`Sau khi dọn dẹp, bảng room_images sẽ còn ${allImages.length - idsToDelete.length} dòng.`);
    return;
  }

  // Thực thi xoá
  console.log(`\nĐang thực thi xoá ${idsToDelete.length} bản ghi trong DB...`);
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error: deleteError } = await supabase
      .from('room_images')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Lỗi khi xoá batch ${i / batchSize + 1}:`, deleteError.message);
    } else {
      deletedCount += batch.length;
      console.log(`Đã xoá ${deletedCount}/${idsToDelete.length} bản ghi...`);
    }
  }

  console.log(`\n--- HOÀN TẤT DỌN DẸP ---`);
  console.log(`Đã xoá thành công: ${deletedCount} bản ghi.`);
  console.log(`Số dòng còn lại trong DB room_images: ${allImages.length - deletedCount}`);
}

main().catch(err => console.error('Lỗi nghiêm trọng:', err));
