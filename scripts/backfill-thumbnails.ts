import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { loadEnvConfig } from '@next/env';
import path from 'path';
import fs from 'fs';

// Tải các biến môi trường từ thư mục gốc
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

// Parse tham số dòng lệnh
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

function isVideoUrl(url: string) {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm');
}

async function processImage(bucket: string, table: string, id: string, url: string, currentThumb: string | null) {
  if (currentThumb) return false;
  if (isVideoUrl(url)) return false;

  const urlParts = url.split(`/storage/v1/object/public/${bucket}/`);
  if (urlParts.length !== 2) {
    console.warn(`[${table}] ID ${id}: Định dạng URL không hợp lệ: ${url}`);
    return false;
  }

  const filePath = urlParts[1];
  const fileExt = filePath.split('.').pop() || 'jpg';
  const baseName = filePath.replace(/\.[^/.]+$/, '');
  const thumbPath = `${baseName}-thumb.${fileExt}`;

  if (dryRun) {
    console.log(`[DRY-RUN] Sẽ xử lý ${table} ID ${id}:\n  Gốc: ${filePath}\n  Thumbnail: ${thumbPath}`);
    return true;
  }

  try {
    // 1. Download ảnh gốc
    const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(filePath);
    if (downloadError) {
      console.error(`[${table}] ID ${id}: Lỗi tải file gốc - ${downloadError.message}`);
      return false;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Tạo thumbnail bằng sharp
    const thumbBuffer = await sharp(buffer)
      .resize(300, null, { withoutEnlargement: true }) // Không upscale ảnh quá nhỏ
      .jpeg({ quality: 80 })
      .toBuffer();

    // 3. Upload thumbnail
    let contentType = 'image/jpeg';
    if (fileExt.toLowerCase() === 'png') contentType = 'image/png';
    else if (fileExt.toLowerCase() === 'webp') contentType = 'image/webp';
    else if (fileExt.toLowerCase() === 'gif') contentType = 'image/gif';

    const { error: uploadError } = await supabase.storage.from(bucket).upload(thumbPath, thumbBuffer, {
      contentType,
      upsert: true
    });

    if (uploadError) {
      console.error(`[${table}] ID ${id}: Lỗi upload thumbnail - ${uploadError.message}`);
      return false;
    }

    // 4. Lấy public URL của thumbnail mới
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(thumbPath);
    const thumbUrl = publicUrlData.publicUrl;

    // 5. Cập nhật URL vào DB
    const { error: updateError } = await supabase.from(table).update({ thumbnail_url: thumbUrl }).eq('id', id);
    if (updateError) {
      console.error(`[${table}] ID ${id}: Lỗi cập nhật DB - ${updateError.message}`);
      return false;
    }

    console.log(`[${table}] ID ${id}: THÀNH CÔNG -> ${thumbUrl}`);
    return true;
  } catch (err: any) {
    console.error(`[${table}] ID ${id}: Lỗi không xác định - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('--- Bắt đầu script tạo backfill thumbnails ---');
  if (dryRun) console.log('Chế độ: DRY-RUN (Chỉ quét, không upload hay thay đổi dữ liệu)');
  if (limit) console.log(`Giới hạn: ${limit} bản ghi`);

  // --- ROOM IMAGES ---
  console.log('\n[1] Lấy dữ liệu bảng room_images...');
  const { data: roomImages, error: roomError } = await supabase
    .from('room_images')
    .select('id, url, thumbnail_url, media_type')
    .is('thumbnail_url', null)
    .not('url', 'is', null);
  
  if (roomError) {
    console.error('Lỗi lấy room_images:', roomError);
    return;
  }

  const roomImagesToProcess = roomImages.filter(img => (img.media_type === 'image' || !img.media_type) && !isVideoUrl(img.url));
  const finalRoomImages = limit ? roomImagesToProcess.slice(0, limit) : roomImagesToProcess;

  console.log(`Tìm thấy ${roomImagesToProcess.length} room_images thiếu thumbnail. Đang xử lý ${finalRoomImages.length} mục...`);
  let roomSuccess = 0;
  for (let i = 0; i < finalRoomImages.length; i++) {
    const img = finalRoomImages[i];
    console.log(`[room_images ${i + 1}/${finalRoomImages.length}] Đang xử lý ID ${img.id}`);
    const success = await processImage('room_images', 'room_images', img.id, img.url, img.thumbnail_url);
    if (success) roomSuccess++;
  }

  // --- BUILDINGS ---
  console.log('\n[2] Lấy dữ liệu bảng buildings...');
  const { data: buildings, error: buildError } = await supabase
    .from('buildings')
    .select('id, image_url, thumbnail_url')
    .is('thumbnail_url', null)
    .not('image_url', 'is', null);

  if (buildError) {
    console.error('Lỗi lấy buildings:', buildError);
    return;
  }

  const buildingsToProcess = buildings.filter(b => b.image_url && !isVideoUrl(b.image_url));
  const remainingLimit = limit ? limit - finalRoomImages.length : undefined;
  const finalBuildings = remainingLimit !== undefined 
    ? buildingsToProcess.slice(0, remainingLimit > 0 ? remainingLimit : 0) 
    : buildingsToProcess;

  console.log(`Tìm thấy ${buildingsToProcess.length} buildings thiếu thumbnail. Đang xử lý ${finalBuildings.length} mục...`);
  let buildSuccess = 0;
  for (let i = 0; i < finalBuildings.length; i++) {
    const b = finalBuildings[i];
    console.log(`[buildings ${i + 1}/${finalBuildings.length}] Đang xử lý ID ${b.id}`);
    const success = await processImage('room_images', 'buildings', b.id, b.image_url!, b.thumbnail_url);
    if (success) buildSuccess++;
  }

  console.log('\n--- KẾT QUẢ ---');
  console.log(`- room_images: ${roomSuccess}/${finalRoomImages.length} thành công`);
  console.log(`- buildings: ${buildSuccess}/${finalBuildings.length} thành công`);
  console.log('Hoàn tất script.');
}

main().catch(err => console.error('Lỗi nghiêm trọng:', err));
