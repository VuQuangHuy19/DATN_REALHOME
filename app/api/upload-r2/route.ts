import { NextResponse } from 'next/server';
import { uploadToR2, isR2Configured } from '@/lib/services/cloudflare-r2';

export async function POST(req: Request) {
  try {
    if (!isR2Configured) {
      return NextResponse.json(
        { error: 'Cloudflare R2 is not configured on server.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pathPrefix = (formData.get('pathPrefix') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tính mã Checksum SHA-256 của file buffer để khử trùng lặp 100%
    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(new Uint8Array(arrayBuffer)).digest('hex').slice(0, 24);

    const fileExt = file.name.split('.').pop() || 'jpg';
    const key = `${pathPrefix}/${checksum}.${fileExt}`;

    const url = await uploadToR2(buffer, key, file.type || 'image/jpeg');

    return NextResponse.json({ success: true, url, key, checksum });
  } catch (err: any) {
    console.error('[Upload API R2 Error]:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
