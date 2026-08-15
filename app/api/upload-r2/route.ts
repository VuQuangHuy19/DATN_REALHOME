import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { isR2Configured, checkR2FileExists, uploadToR2, getR2PublicUrl } from '@/src/lib/services/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pathPrefix = (formData.get('pathPrefix') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file upload' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tính mã hash MD5 của file binary để kiểm tra trùng lặp
    const md5Hash = crypto.createHash('md5').update(new Uint8Array(arrayBuffer)).digest('hex');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `${pathPrefix}/${md5Hash}.${ext}`;
    const contentType = file.type || 'image/jpeg';

    // 1. ƯU TIÊN CLOUDFLARE R2
    if (isR2Configured()) {
      // Check sum xem file đã tồn tại trên Cloudflare R2 chưa
      const existsOnR2 = await checkR2FileExists(key);
      if (existsOnR2) {
        const publicUrl = getR2PublicUrl(key);
        console.log(`[Upload R2] Ảnh ${md5Hash} đã tồn tại trên Cloudflare R2 -> Tái sử dụng CDN URL.`);
        return NextResponse.json({ success: true, url: publicUrl, reused: true, provider: 'r2' });
      }

      // Upload lên Cloudflare R2
      console.log(`[Upload R2] Đang tải ảnh ${md5Hash} lên Cloudflare R2...`);
      const r2Url = await uploadToR2(buffer, key, contentType);
      if (r2Url) {
        return NextResponse.json({ success: true, url: r2Url, reused: false, provider: 'r2' });
      }
      console.warn('[Upload R2] Upload R2 không thành công, chuyển sang fallback Supabase Storage...');
    }

    // 2. PHƯƠNG ÁN DỰ PHÒNG: SUPABASE STORAGE
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const bucket = pathPrefix === 'kyc-documents' ? 'kyc-documents' : 'room_images';
    const supabaseFilePath = `${md5Hash}.${ext}`;

    // Upload Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(supabaseFilePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError && !uploadError.message.includes('Duplicate') && !uploadError.message.includes('already exists')) {
      console.error('[Supabase Storage Fallback Error]:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(supabaseFilePath);
    return NextResponse.json({
      success: true,
      url: pubData.publicUrl,
      reused: Boolean(uploadError),
      provider: 'supabase',
    });

  } catch (error: any) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server khi upload ảnh' }, { status: 500 });
  }
}
