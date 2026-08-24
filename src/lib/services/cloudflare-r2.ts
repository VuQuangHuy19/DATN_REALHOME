import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'realhome';
const publicDomain = (process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`).replace(/\/+$/, '');

export const isR2Configured = !!(accountId && accessKeyId && secretAccessKey && bucketName);

const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

/**
 * Kiểm tra xem File (MD5 checksum) đã tồn tại trên Cloudflare R2 hay chưa.
 * Nếu đã tồn tại ➔ Trả về luôn public CDN URL để sử dụng lại 0ms.
 */
export async function checkFileExistsInR2(key: string): Promise<string | null> {
  if (!r2Client) return null;

  const cleanKey = key.replace(/^\/+/, '');
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });
    await r2Client.send(command);
    return `${publicDomain}/${cleanKey}`;
  } catch (err: any) {
    // File chưa tồn tại hoặc bị lỗi
    return null;
  }
}

/**
 * Upload a file buffer or stream directly to Cloudflare R2 bucket.
 * Returns the public CDN URL for the uploaded file.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  key: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (!r2Client) {
    throw new Error('Cloudflare R2 is not configured properly in environment variables.');
  }

  // Clean key prefix if leading slash
  const cleanKey = key.replace(/^\/+/, '');

  // 1. Khử trùng Lặp qua MD5 Checksum Key trước khi Upload
  const existingUrl = await checkFileExistsInR2(cleanKey);
  if (existingUrl) {
    console.log(`[Cloudflare R2 Deduplication] Reuse existing checksum key: ${cleanKey}`);
    return existingUrl;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await r2Client.send(command);

  // Return public CDN URL
  const fileUrl = `${publicDomain}/${cleanKey}`;
  return fileUrl;
}

/**
 * Delete a file object from Cloudflare R2 bucket by key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!r2Client) return;

  const cleanKey = key.replace(/^\/+/, '');
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
  });

  await r2Client.send(command);
}

