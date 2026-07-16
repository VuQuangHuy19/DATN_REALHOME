import * as jose from 'jose';

// JWT_SECRET dùng để ký và xác thực token JWT, phải được bảo mật ở phía Server
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET chưa được định nghĩa trong môi trường!');
  }
  return new TextEncoder().encode(secret);
};

/**
 * Ký JWT token chứa thông tin của người dùng (payload).
 */
export async function signJWT(payload: Record<string, any>, expiresIn: string = '7d'): Promise<string> {
  const secret = getJWTSecret();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Xác thực JWT token và giải mã lấy dữ liệu payload. Trả về null nếu token hết hạn hoặc không hợp lệ.
 */
export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    // Token không hợp lệ hoặc đã hết hạn
    return null;
  }
}


