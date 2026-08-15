import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'realhome';
const publicDomain = (process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '').replace(/\/+$/, '');

if (!supabaseUrl || !serviceRoleKey || !accountId || !accessKeyId || !secretAccessKey) {
  console.error('Lỗi: Thiếu biến môi trường Supabase hoặc Cloudflare R2.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function migrateCheckinImages() {
  console.log('🚀 --- BẮT ĐẦU PHÂN LOẠI & DỌN DẸP ẢNH CHECK-IN TRÊN CLOUDFLARE R2 ---\n');

  // 1. Liệt kê các file ở root bucket R2
  const listCmd = new ListObjectsV2Command({
    Bucket: bucketName,
  });

  const listRes = await r2Client.send(listCmd);
  const contents = listRes.Contents || [];

  console.log(`📦 Tìm thấy tổng cộng ${contents.length} object trong bucket "${bucketName}".`);

  let movedBuildingCount = 0;
  let movedClientCount = 0;
  const keyMap: Record<string, string> = {}; // Old Key -> New Key

  for (const obj of contents) {
    const oldKey = obj.Key;
    if (!oldKey) continue;

    let targetFolder = '';
    if (oldKey.startsWith('checkin_building_')) {
      targetFolder = 'check_in_images/check_in_buildings';
    } else if (oldKey.startsWith('checkin_client_')) {
      targetFolder = 'check_in_images/check_in_clients';
    }

    if (targetFolder) {
      const fileName = oldKey;
      const newKey = `${targetFolder}/${fileName}`;
      keyMap[oldKey] = newKey;

      console.log(`🚚 Đang di chuyển: "${oldKey}" -> "${newKey}"`);

      // Copy sang location mới trong R2
      await r2Client.send(
        new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${oldKey}`,
          Key: newKey,
        })
      );

      // Xóa object cũ ở root
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: oldKey,
        })
      );

      if (targetFolder.includes('check_in_buildings')) {
        movedBuildingCount++;
      } else {
        movedClientCount++;
      }
    }
  }

  console.log(`\n✅ Hoàn tất di chuyển R2:`);
  console.log(`   🏢 ${movedBuildingCount} ảnh building -> check_in_images/check_in_buildings/`);
  console.log(`   👤 ${movedClientCount} ảnh client -> check_in_images/check_in_clients/\n`);

  // 2. Cập nhật các đường dẫn trong Supabase bảng `appointments`
  console.log('🔄 Đang cập nhật URL ảnh trong bảng `appointments`...');
  const { data: appointments, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, checkin_photo_building, checkin_photo_with_client');

  if (fetchErr) {
    console.error('Lỗi lấy dữ liệu appointments:', fetchErr);
    return;
  }

  let updatedApptCount = 0;

  for (const appt of appointments || []) {
    const updates: any = {};

    // Update Building Photo URL
    if (appt.checkin_photo_building) {
      for (const [oldKey, newKey] of Object.entries(keyMap)) {
        if (appt.checkin_photo_building.includes(`/${oldKey}`)) {
          updates.checkin_photo_building = appt.checkin_photo_building.replace(
            `/${oldKey}`,
            `/${newKey}`
          );
          break;
        }
      }
    }

    // Update Client Photo URL
    if (appt.checkin_photo_with_client) {
      for (const [oldKey, newKey] of Object.entries(keyMap)) {
        if (appt.checkin_photo_with_client.includes(`/${oldKey}`)) {
          updates.checkin_photo_with_client = appt.checkin_photo_with_client.replace(
            `/${oldKey}`,
            `/${newKey}`
          );
          break;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appt.id);

      if (!updateErr) {
        updatedApptCount++;
      } else {
        console.error(`Lỗi update appointment ${appt.id}:`, updateErr);
      }
    }
  }

  console.log(`\n🎉 ĐÃ CẬP NHẬT THÀNH CÔNG ${updatedApptCount} LỊCH HẸN TRONG SUPABASE!`);
  console.log('🏁 TIẾN TRÌNH DI CHUYỂN & SẮP XẾP ẢNH CHECK-IN HOÀN TẤT!');
}

migrateCheckinImages().catch(console.error);
