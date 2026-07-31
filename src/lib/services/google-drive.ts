import axios from 'axios';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function syncGoogleDriveImagesForProperty(roomId: string, driveUrl: string, companyId?: string) {
  if (!driveUrl.includes('drive.google.com')) return [];

  console.log(`[DriveSync] Bắt đầu xử lý link: ${driveUrl} cho phòng ${roomId}`);
  
  let fileIds: string[] = [];

  // Extract folder ID if it's a folder
  const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    const folderId = folderMatch[1];
    try {
      // Attempt to scrape public folder page
      const res = await axios.get(driveUrl);
      const html = res.data;
      
      // Look for 33 character IDs which are typical Google Drive file IDs
      // This is a heuristic and might catch other things, but usually works for public folders
      const matches = [...html.matchAll(/"([a-zA-Z0-9_-]{33})"/g)];
      const allIds = Array.from(new Set(matches.map(m => m[1])));
      
      // Filter out the folder ID itself
      fileIds = allIds.filter(id => id !== folderId);
      console.log(`[DriveSync] Tìm thấy ${fileIds.length} file IDs trong thư mục.`);
    } catch (err: any) {
      console.error('[DriveSync] Lỗi đọc folder:', err.message);
    }
  } else {
    // Maybe it's a direct file link
    const fileMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileIds = [fileMatch[1]];
    }
  }

  const uploadedUrls: string[] = [];

  // Only process up to 10 images per folder to avoid taking too long
  const maxImages = Math.min(fileIds.length, 10);
  
  for (let i = 0; i < maxImages; i++) {
    const fileId = fileIds[i];
    try {
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const res = await axios.get(downloadUrl, { 
        responseType: 'arraybuffer',
        maxRedirects: 5,
        timeout: 30000 
      });
      
      let buffer = Buffer.from(res.data, 'binary');
      
      // Very small files might be HTML error pages
      if (buffer.length < 5000 && buffer.toString('utf8').includes('<!DOCTYPE html>')) {
        console.log(`[DriveSync] File ${fileId} bị chặn tải hoặc yêu cầu confirm.`);
        continue;
      }

      const contentType = res.headers['content-type'] || '';
      
      // Attempt to detect from headers first
      let ext = 'jpg';
      let mime = 'image/jpeg';
      const cType = String(contentType);
      
      if (cType.includes('png')) { ext = 'png'; mime = 'image/png'; }
      else if (cType.includes('gif')) { ext = 'gif'; mime = 'image/gif'; }
      else if (cType.includes('webp')) { ext = 'webp'; mime = 'image/webp'; }
      else if (cType.includes('mp4')) { ext = 'mp4'; mime = 'video/mp4'; }
      else if (cType.includes('quicktime') || cType.includes('mov')) { ext = 'mov'; mime = 'video/quicktime'; }
      else {
        // Fallback to magic bytes detection
        if (buffer.length >= 12) {
          const hex = buffer.toString('hex', 0, 12).toUpperCase();
          if (hex.startsWith('FFD8FF')) { ext = 'jpg'; mime = 'image/jpeg'; }
          else if (hex.startsWith('89504E47')) { ext = 'png'; mime = 'image/png'; }
          else if (hex.startsWith('47494638')) { ext = 'gif'; mime = 'image/gif'; }
          else if (hex.startsWith('52494646') && buffer.toString('hex', 8, 12).toUpperCase() === '57454250') { ext = 'webp'; mime = 'image/webp'; }
          else {
            const ftyp = buffer.toString('ascii', 4, 8);
            if (ftyp === 'ftyp') {
              const brand = buffer.toString('ascii', 8, 12);
              if (['heic', 'heix', 'hevc', 'heim', 'mif1', 'msf1'].includes(brand)) { ext = 'heic'; mime = 'image/heic'; }
              else if (['mp41', 'mp42', 'isom', 'iso2'].includes(brand)) { ext = 'mp4'; mime = 'video/mp4'; }
              else if (brand === 'qt  ') { ext = 'mov'; mime = 'video/quicktime'; }
            }
          }
        }
      }
      
      if (ext === 'heic') {
        try {
          const heicConvert = require('heic-convert');
          console.log(`[DriveSync] Đang convert ảnh HEIC ${fileId} sang JPG...`);
          const outputBuffer = await heicConvert({
            buffer: buffer,
            format: 'JPEG',
            quality: 0.8
          });
          buffer = Buffer.from(outputBuffer);
          ext = 'jpg';
          mime = 'image/jpeg';
        } catch (e: any) {
          console.error(`[DriveSync] Lỗi convert HEIC: ${e.message}`);
        }
      }

      if (mime.startsWith('image/')) {
        try {
          const sharp = require('sharp');
          console.log(`[DriveSync] Đang nén ảnh ${fileId} bằng sharp...`);
          buffer = await sharp(buffer)
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();
          ext = 'jpg';
          mime = 'image/jpeg';
        } catch (err: any) {
          console.error(`[DriveSync] Lỗi nén ảnh Sharp: ${err.message}`);
        }
      }

      const finalContentType = mime;

      const md5 = crypto.createHash('md5').update(buffer as any).digest('hex');
      const filename = `drive-imports/${md5}.${ext}`;

      // Check if file already exists in storage
      // Instead of querying, we can try to upload with upsert: false. 
      // If it fails with 'Duplicate', it exists. 
      // Or we can just check if we can download it.
      
      const { data: existingData, error: checkError } = await supabase.storage
        .from('room_images')
        .createSignedUrl(filename, 60);

      let publicUrl = '';

      if (!checkError && existingData) {
        // File exists!
        console.log(`[DriveSync] Ảnh ${md5} đã tồn tại, bỏ qua upload.`);
        const { data: pubData } = supabase.storage.from('room_images').getPublicUrl(filename);
        publicUrl = pubData.publicUrl;
      } else {
        // File doesn't exist, upload it
        console.log(`[DriveSync] Đang upload ảnh ${md5}...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('room_images')
          .upload(filename, buffer, {
            contentType: finalContentType,
            upsert: false
          });
          
        if (uploadError && !uploadError.message.includes('Duplicate')) {
          console.error(`[DriveSync] Lỗi upload:`, uploadError);
          continue;
        }
        
        const { data: pubData } = supabase.storage.from('room_images').getPublicUrl(filename);
        publicUrl = pubData.publicUrl;
      }

      if (publicUrl) {
        uploadedUrls.push(publicUrl);
      }

    } catch (err: any) {
      console.error(`[DriveSync] Lỗi xử lý file ${fileId}:`, err.message);
    }
  }

  // Update property in DB
  if (uploadedUrls.length > 0) {
    // Check existing URLs in room_images for this roomId to prevent duplication
    const { data: existingRoomImgs } = await supabase
      .from('room_images')
      .select('url')
      .eq('room_id', roomId);

    const existingUrls = new Set((existingRoomImgs || []).map(r => r.url));
    const newUrls = uploadedUrls.filter(url => !existingUrls.has(url));

    if (newUrls.length === 0) {
      console.log(`[DriveSync] Toàn bộ ${uploadedUrls.length} ảnh đã tồn tại trong DB cho phòng ${roomId}, bỏ qua insert.`);
      return uploadedUrls;
    }

    const isVideoUrl = (u: string) => {
      const clean = u.toLowerCase().split('?')[0];
      return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm');
    };

    const firstImageIndex = newUrls.findIndex((u) => !isVideoUrl(u));
    const hasExistingThumbnail = (existingRoomImgs || []).length > 0;

    // Insert into room_images table
    const imagePayloads = newUrls.map((url, index) => {
      const isVideo = isVideoUrl(url);
      return {
        room_id: roomId,
        company_id: companyId || null,
        url: url,
        is_thumbnail: !hasExistingThumbnail && (firstImageIndex !== -1 ? index === firstImageIndex : index === 0),
        priority: (existingRoomImgs || []).length + index,
        media_type: isVideo ? 'video' : 'image',
      };
    });
    
    await supabase.from('room_images').insert(imagePayloads);
    console.log(`[DriveSync] Đã lưu ${newUrls.length} ảnh/video mới vào room_images cho phòng ${roomId}`);
  }

  return uploadedUrls;
}

export async function syncGoogleDriveImagesForBuilding(buildingId: string, driveUrl: string, companyId?: string) {
  if (!driveUrl.includes('drive.google.com')) return [];

  console.log(`[BuildingDriveSync] Bắt đầu xử lý link tòa nhà: ${driveUrl} cho building ${buildingId}`);
  
  let fileIds: string[] = [];

  const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    const folderId = folderMatch[1];
    try {
      const res = await axios.get(driveUrl);
      const html = res.data;
      const matches = [...html.matchAll(/"([a-zA-Z0-9_-]{33})"/g)];
      const allIds = Array.from(new Set(matches.map(m => m[1])));
      fileIds = allIds.filter(id => id !== folderId);
    } catch (err: any) {
      console.error('[BuildingDriveSync] Lỗi đọc folder:', err.message);
    }
  } else {
    const fileMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileIds = [fileMatch[1]];
    }
  }

  if (fileIds.length === 0) return [];

  // Synchronize first image for building
  const fileId = fileIds[0];
  try {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const res = await axios.get(downloadUrl, { 
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 30000 
    });
    
    let buffer = Buffer.from(res.data, 'binary');
    if (buffer.length < 5000 && buffer.toString('utf8').includes('<!DOCTYPE html>')) return [];

    let ext = 'jpg';
    let mime = 'image/jpeg';
    const cType = String(res.headers['content-type'] || '');
    if (cType.includes('png')) { ext = 'png'; mime = 'image/png'; }
    else if (cType.includes('webp')) { ext = 'webp'; mime = 'image/webp'; }

    if (mime.startsWith('image/')) {
      try {
        const sharp = require('sharp');
        buffer = await sharp(buffer)
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();
        ext = 'jpg';
        mime = 'image/jpeg';
      } catch (err: any) {
        console.error(`[BuildingDriveSync] Lỗi nén ảnh Sharp: ${err.message}`);
      }
    }

    const md5 = crypto.createHash('md5').update(buffer as any).digest('hex');
    const filename = `drive-imports/${md5}.${ext}`;

    const { data: existingData, error: checkError } = await supabase.storage
      .from('room_images')
      .createSignedUrl(filename, 60);

    let publicUrl = '';
    if (!checkError && existingData) {
      const { data: pubData } = supabase.storage.from('room_images').getPublicUrl(filename);
      publicUrl = pubData.publicUrl;
    } else {
      await supabase.storage
        .from('room_images')
        .upload(filename, buffer, { contentType: mime, upsert: false });
      const { data: pubData } = supabase.storage.from('room_images').getPublicUrl(filename);
      publicUrl = pubData.publicUrl;
    }

    if (publicUrl) {
      await supabase
        .from('buildings')
        .update({
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', buildingId);
      console.log(`[BuildingDriveSync] Đã cập nhật ảnh đại diện tòa nhà ${buildingId}: ${publicUrl}`);
      return [publicUrl];
    }
  } catch (err: any) {
    console.error(`[BuildingDriveSync] Lỗi xử lý file ${fileId}:`, err.message);
  }

  return [];
}

