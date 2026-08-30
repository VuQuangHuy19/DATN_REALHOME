import axios from 'axios';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

import { uploadToR2, isR2Configured } from './cloudflare-r2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || '';

// ─── Kiểu file được phép tải ─────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
}

// ─── Lấy danh sách file từ Google Drive ─────────────────────────────────────

/**
 * Phương thức 1 (ưu tiên): Dùng Drive API v3 với API Key
 * Trả về đúng mimeType → không bao giờ bị false positive
 */
async function listFilesViaApi(folderId: string): Promise<DriveFileInfo[]> {
  if (!DRIVE_API_KEY) throw new Error('GOOGLE_DRIVE_API_KEY not set');

  const allFiles: DriveFileInfo[] = [];
  let pageToken: string | undefined;

  do {
    const res = await axios.get('https://www.googleapis.com/drive/v3/files', {
      params: {
        key: DRIVE_API_KEY,
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken,files(id,name,mimeType)',
        pageSize: 100,
        ...(pageToken ? { pageToken } : {}),
      },
      timeout: 15000,
    });
    const files: DriveFileInfo[] = res.data.files || [];
    // Chỉ lấy file ảnh/video, bỏ folder con và Google Docs
    allFiles.push(...files.filter((f) => ALLOWED_MIME_TYPES.has(f.mimeType)));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/**
 * Phương thức 2 (fallback): Scrape HTML + validate từng ID bằng HEAD request
 * Tránh false positive bằng cách kiểm tra Content-Type trước khi download
 */
async function listFilesViaScraping(
  folderId: string,
  driveUrl: string,
): Promise<DriveFileInfo[]> {
  let html = '';
  try {
    const res = await axios.get(driveUrl, { timeout: 15000 });
    html = res.data as string;
  } catch (err: any) {
    console.error('[DriveSync] Không thể đọc trang folder:', err.message);
    return [];
  }

  // Tìm chuỗi 33 ký tự — heuristic cho Drive file ID
  const rawMatches = Array.from(html.matchAll(/"([a-zA-Z0-9_-]{33})"/g));
  const candidates = Array.from(new Set(rawMatches.map((m) => m[1]))).filter(
    (id) => id !== folderId,
  );

  console.log(
    `[DriveSync Scrape] Tìm thấy ${candidates.length} candidates trong HTML. Đang validate...`,
  );

  const validFiles: DriveFileInfo[] = [];

  // Validate song song tối đa 20 candidates (HEAD request nhẹ, nhanh)
  const toCheck = candidates.slice(0, 20);
  await Promise.all(
    toCheck.map(async (id) => {
      try {
        const headRes = await axios.head(
          `https://drive.google.com/uc?export=download&id=${id}`,
          { timeout: 8000, maxRedirects: 3 },
        );
        const ct = String(headRes.headers['content-type'] || '');
        // Bỏ qua HTML (trang lỗi, confirm scan, trang login)
        if (ct.includes('text/html')) return;

        // Xác định mimeType từ header
        let mimeType = 'image/jpeg';
        if (ct.includes('png')) mimeType = 'image/png';
        else if (ct.includes('webp')) mimeType = 'image/webp';
        else if (ct.includes('gif')) mimeType = 'image/gif';
        else if (ct.includes('mp4')) mimeType = 'video/mp4';
        else if (ct.includes('quicktime')) mimeType = 'video/quicktime';
        else if (ct.includes('webm')) mimeType = 'video/webm';
        else if (!ct.includes('image/') && !ct.includes('video/')) return; // không phải media

        if (ALLOWED_MIME_TYPES.has(mimeType)) {
          validFiles.push({ id, name: id, mimeType });
        }
      } catch {
        // ID không tồn tại hoặc bị chặn → bỏ qua
      }
    }),
  );

  console.log(
    `[DriveSync Scrape] Validated: ${validFiles.length} file hợp lệ từ ${toCheck.length} candidates.`,
  );
  return validFiles;
}

/**
 * Lấy danh sách file từ folder Google Drive (tự động chọn phương thức tốt nhất)
 */
async function listDriveFiles(
  folderId: string,
  driveUrl: string,
): Promise<DriveFileInfo[]> {
  if (DRIVE_API_KEY) {
    try {
      const files = await listFilesViaApi(folderId);
      console.log(
        `[DriveSync API] Lấy được ${files.length} file từ Drive API v3.`,
      );
      return files;
    } catch (err: any) {
      console.warn(
        `[DriveSync API] Drive API thất bại (${err.message}), fallback về scraping...`,
      );
    }
  }
  return listFilesViaScraping(folderId, driveUrl);
}

// ─── Download + Upload một file từ Drive lên R2/Supabase ─────────────────────

async function downloadAndUpload(
  fileInfo: DriveFileInfo,
): Promise<string | null> {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileInfo.id}`;

  let buffer: Buffer;
  let mime = fileInfo.mimeType;

  try {
    const res = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 30000,
    });
    buffer = Buffer.from(res.data, 'binary');

    // Reject HTML error pages
    if (
      buffer.length < 5000 &&
      buffer.toString('utf8').includes('<!DOCTYPE html>')
    ) {
      console.log(
        `[DriveSync] File ${fileInfo.id} bị chặn hoặc yêu cầu confirm.`,
      );
      return null;
    }

    // Nếu scraping fallback không có mimeType chính xác → detect từ magic bytes
    if (!fileInfo.mimeType || fileInfo.mimeType === 'image/jpeg') {
      const responseContentType = String(
        (res.headers['content-type'] as string) || '',
      );
      if (responseContentType.includes('png')) mime = 'image/png';
      else if (responseContentType.includes('webp')) mime = 'image/webp';
      else if (responseContentType.includes('gif')) mime = 'image/gif';
      else if (responseContentType.includes('mp4')) mime = 'video/mp4';
      else if (
        responseContentType.includes('quicktime') ||
        responseContentType.includes('mov')
      )
        mime = 'video/quicktime';
      else if (buffer.length >= 12) {
        // Magic bytes
        const hex = buffer.toString('hex', 0, 12).toUpperCase();
        if (hex.startsWith('FFD8FF')) mime = 'image/jpeg';
        else if (hex.startsWith('89504E47')) mime = 'image/png';
        else if (hex.startsWith('47494638')) mime = 'image/gif';
        else if (
          hex.startsWith('52494646') &&
          buffer.toString('hex', 8, 12).toUpperCase() === '57454250'
        )
          mime = 'image/webp';
        else {
          const ftyp = buffer.toString('ascii', 4, 8);
          if (ftyp === 'ftyp') {
            const brand = buffer.toString('ascii', 8, 12);
            if (['heic', 'heix', 'hevc', 'heim', 'mif1', 'msf1'].includes(brand))
              mime = 'image/heic';
            else if (['mp41', 'mp42', 'isom', 'iso2'].includes(brand))
              mime = 'video/mp4';
            else if (brand === 'qt  ') mime = 'video/quicktime';
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[DriveSync] Lỗi download file ${fileInfo.id}:`, err.message);
    return null;
  }

  // Convert HEIC → JPEG
  if (mime === 'image/heic' || mime === 'image/heif') {
    try {
      const heicConvert = require('heic-convert');
      console.log(`[DriveSync] Convert HEIC ${fileInfo.id} → JPG...`);
      const outputBuffer = await heicConvert({
        buffer,
        format: 'JPEG',
        quality: 0.8,
      });
      buffer = Buffer.from(outputBuffer);
      mime = 'image/jpeg';
    } catch (e: any) {
      console.error(`[DriveSync] Lỗi convert HEIC: ${e.message}`);
    }
  }

  // Nén ảnh bằng sharp
  let ext = mime.split('/')[1] || 'jpg';
  if (ext === 'jpeg') ext = 'jpg';
  if (ext === 'quicktime') ext = 'mov';

  if (mime.startsWith('image/')) {
    try {
      const sharp = require('sharp');
      buffer = await sharp(buffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      mime = 'image/jpeg';
      ext = 'jpg';
    } catch (err: any) {
      console.error(`[DriveSync] Lỗi nén Sharp: ${err.message}`);
    }
  }

  const md5 = crypto.createHash('md5').update(buffer as any).digest('hex');
  const filename = `drive-imports/${md5}.${ext}`;

  // Upload lên R2 hoặc Supabase Storage
  let publicUrl = '';

  if (isR2Configured) {
    publicUrl = await uploadToR2(buffer, filename, mime);
  } else {
    const { error: checkError } = await supabase.storage
      .from('room_images')
      .createSignedUrl(filename, 60);

    if (!checkError) {
      const { data: pubData } = supabase.storage
        .from('room_images')
        .getPublicUrl(filename);
      publicUrl = pubData.publicUrl;
    } else {
      const { error: uploadError } = await supabase.storage
        .from('room_images')
        .upload(filename, buffer, { contentType: mime, upsert: false });

      if (uploadError && !uploadError.message.includes('Duplicate')) {
        console.error(`[DriveSync] Lỗi upload:`, uploadError);
        return null;
      }
      const { data: pubData } = supabase.storage
        .from('room_images')
        .getPublicUrl(filename);
      publicUrl = pubData.publicUrl;
    }
  }

  return publicUrl || null;
}

// ─── Sync ảnh/video cho Phòng ────────────────────────────────────────────────

export async function syncGoogleDriveImagesForProperty(
  roomId: string,
  driveUrl: string,
  companyId?: string,
) {
  if (!driveUrl.includes('drive.google.com')) return [];

  console.log(`[DriveSync] Bắt đầu xử lý link: ${driveUrl} cho phòng ${roomId}`);

  let files: DriveFileInfo[] = [];

  const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    files = await listDriveFiles(folderMatch[1], driveUrl);
  } else {
    const fileMatch =
      driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      files = [{ id: fileMatch[1], name: fileMatch[1], mimeType: 'image/jpeg' }];
    }
  }

  if (files.length === 0) {
    console.log(`[DriveSync] Không tìm thấy file nào cho phòng ${roomId}.`);
    return [];
  }

  const uploadedUrls: string[] = [];
  const maxFiles = Math.min(files.length, 20);
  const filesToProcess = files.slice(0, maxFiles);

  // ─── 1. Instant Stream: Tạo ngay bản ghi room_images với Drive Direct Stream Link (0ms chờ) ───
  const { data: existingRoomImgs } = await supabase
    .from('room_images')
    .select('id, url, room_id')
    .eq('room_id', roomId);

  const existingUrls = new Set((existingRoomImgs || []).map((r: any) => r.url));

  const isVideoFile = (f: DriveFileInfo) => {
    return f.mimeType.startsWith('video/') || f.name.endsWith('.mp4') || f.name.endsWith('.mov') || f.name.endsWith('.webm');
  };

  // Các file chưa có trong DB -> chèn ngay làm link tạm thời
  const initialPayloads: any[] = [];
  filesToProcess.forEach((f, index) => {
    const driveStreamUrl = `https://lh3.googleusercontent.com/d/${f.id}`;
    if (!existingUrls.has(driveStreamUrl)) {
      initialPayloads.push({
        room_id: roomId,
        company_id: companyId || null,
        url: driveStreamUrl,
        is_thumbnail: (existingRoomImgs || []).length === 0 && index === 0,
        priority: (existingRoomImgs || []).length + index,
        media_type: isVideoFile(f) ? 'video' : 'image',
      });
    }
  });

  if (initialPayloads.length > 0) {
    await supabase.from('room_images').insert(initialPayloads);
    console.log(`[DriveSync Instant] Đã gán ngay ${initialPayloads.length} link Drive xem 0s cho phòng ${roomId}`);
  }

  // ─── 2. Parallel Worker Pool (Chạy song song 6 luồng cùng lúc + Khử trùng MD5) ───
  const CONCURRENCY_LIMIT = 6;
  const results: (string | null)[] = [];

  for (let i = 0; i < filesToProcess.length; i += CONCURRENCY_LIMIT) {
    const chunk = filesToProcess.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map(async (fileInfo) => {
        try {
          const publicR2Url = await downloadAndUpload(fileInfo);
          if (publicR2Url) {
            // Cập nhật link tạm Drive -> R2 CDN URL vĩnh viễn trong DB
            const driveStreamUrl = `https://drive.google.com/uc?export=download&id=${fileInfo.id}`;
            await supabase
              .from('room_images')
              .update({ url: publicR2Url })
              .eq('room_id', roomId)
              .eq('url', driveStreamUrl);
          }
          return publicR2Url;
        } catch (err: any) {
          console.error(`[DriveSync Worker] Lỗi xử lý file ${fileInfo.id}:`, err.message);
          return null;
        }
      })
    );
    results.push(...chunkResults);
  }

  results.forEach((url) => {
    if (url) uploadedUrls.push(url);
  });

  return uploadedUrls;
}


// ─── Sync ảnh đại diện cho Tòa nhà ─────────────────────────────────────────

export async function syncGoogleDriveImagesForBuilding(
  buildingId: string,
  driveUrl: string,
  companyId?: string,
) {
  if (!driveUrl.includes('drive.google.com')) return [];

  console.log(
    `[BuildingDriveSync] Xử lý link tòa nhà: ${driveUrl} cho building ${buildingId}`,
  );

  let files: DriveFileInfo[] = [];

  const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    files = await listDriveFiles(folderMatch[1], driveUrl);
  } else {
    const fileMatch =
      driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      files = [{ id: fileMatch[1], name: fileMatch[1], mimeType: 'image/jpeg' }];
    }
  }

  // Chỉ lấy ảnh đầu tiên làm thumbnail tòa nhà
  const imageFiles = files.filter((f) => f.mimeType.startsWith('image/'));
  if (imageFiles.length === 0) {
    console.log(`[BuildingDriveSync] Không tìm thấy ảnh nào cho building ${buildingId}.`);
    return [];
  }

  const publicUrl = await downloadAndUpload(imageFiles[0]);
  if (!publicUrl) return [];

  await supabase
    .from('buildings')
    .update({
      image_url: publicUrl,
      thumbnail_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', buildingId);

  console.log(
    `[BuildingDriveSync] Đã cập nhật ảnh đại diện tòa nhà ${buildingId}: ${publicUrl}`,
  );
  return [publicUrl];
}
