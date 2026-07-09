import { randomBytes, createHash } from 'crypto';

interface OnboardingTokenPayload {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Tạo token onboarding bảo mật mới
 * @param expiryInHours Thời gian hết hạn của token tính bằng giờ (mặc định 48h)
 */
export function generateOnboardingToken(expiryInHours: number = 48): OnboardingTokenPayload {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256')
    .update(rawToken)
    .digest('hex');

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryInHours);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Băm token thô nhận được từ client để so khớp với DB
 * @param rawToken Token thô nhận từ query parameters hoặc request body
 */
export function hashRawToken(rawToken: string): string {
  return createHash('sha256')
    .update(rawToken)
    .digest('hex');
}
