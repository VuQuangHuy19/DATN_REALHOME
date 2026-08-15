import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '';

export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
}

export function getR2PublicUrl(key: string): string {
  const cleanDomain = publicDomain.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return `${cleanDomain}/${cleanKey}`;
}

/**
 * Kiểm tra xem file đã tồn tại trên Cloudflare R2 hay chưa bằng Key (MD5 hash)
 */
export async function checkR2FileExists(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client || !bucketName) return false;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    return true; // File đã tồn tại trên R2
  } catch (err: any) {
    // 404 hoặc NotFound là file chưa tồn tại
    return false;
  }
}

/**
 * Tải file buffer trực tiếp lên Cloudflare R2
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string | null> {
  const client = getR2Client();
  if (!client || !bucketName) return null;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return getR2PublicUrl(key);
  } catch (err: any) {
    console.error(`[Cloudflare R2 Upload Error] (${key}):`, err.message || err);
    return null;
  }
}
