import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ExtractedMedia {
  originalUrl: string;
  fileId?: string;
  folderId?: string;
  directUrl: string;
}

export function parseGoogleDriveUrl(url: string): { type: 'folder' | 'file' | 'unknown'; id: string | null } {
  if (!url) return { type: 'unknown', id: null };

  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return { type: 'folder', id: folderMatch[1] };
  }

  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return { type: 'file', id: fileMatch[1] };
  }

  return { type: 'unknown', id: null };
}

export function getGoogleDriveDirectImageUrl(fileId: string): string {
  // Google User Content CDN link high quality
  return `https://lh3.googleusercontent.com/d/${fileId}=s2000`;
}

export async function processAndUploadDriveImage(
  driveUrl: string,
  destinationPathPrefix: string
): Promise<string> {
  const { type, id } = parseGoogleDriveUrl(driveUrl);

  if (!id) {
    // If it's already a regular HTTP image link, return as is
    if (driveUrl.startsWith('http')) return driveUrl;
    return driveUrl;
  }

  const directUrl = getGoogleDriveDirectImageUrl(id);

  try {
    // Tải ảnh từ Google Drive CDN
    const res = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.warn(`[Drive Upload] Direct fetch failed for ${id}, fallback to direct CDN url.`);
      return directUrl;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return directUrl;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filePath = `${destinationPathPrefix}/${Date.now()}_${id.slice(0, 8)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('room-images')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Drive Upload] Supabase Storage upload error:', uploadError.message);
      return directUrl;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('room-images')
      .getPublicUrl(uploadData.path);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.warn('[Drive Upload] Process error:', err?.message);
    return directUrl;
  }
}
