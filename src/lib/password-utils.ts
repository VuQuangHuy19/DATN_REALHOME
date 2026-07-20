import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/**
 * Băm mật khẩu bằng bcrypt (salt ngẫu nhiên riêng cho từng mật khẩu, sinh tự động
 * và lưu chung trong chuỗi hash trả về — không cần AUTH_SALT nữa).
 * Dùng cho MỌI mật khẩu mới (đăng ký/đổi mật khẩu/onboarding) kể từ nay.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Băm mật khẩu theo thuật toán CŨ (SHA-256 + AUTH_SALT cố định).
 * CHỈ dùng nội bộ để đối chiếu với các password_hash cũ còn sót lại trong DB.
 * @deprecated Chỉ tồn tại phục vụ migrate ngầm — cân nhắc xoá sau khi toàn bộ user
 * đã đăng nhập lại ít nhất 1 lần (theo dõi qua log needsRehash).
 */
export async function legacyHashPasswordSHA256(password: string): Promise<string> {
  const salt = process.env.AUTH_SALT || '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface VerifyPasswordResult {
  /** true nếu mật khẩu nhập vào khớp với hash đã lưu */
  valid: boolean;
  /**
   * true nếu hash đang lưu là định dạng CŨ (SHA-256) và mật khẩu đúng — caller nên
   * gọi hashPassword() lại và UPDATE password_hash trong DB để nâng cấp dần sang bcrypt.
   */
  needsRehash: boolean;
}

/**
 * Xác thực mật khẩu nhập vào so với password_hash lưu trong DB.
 * Hỗ trợ đồng thời 2 định dạng để không làm gián đoạn đăng nhập của user cũ:
 * - Hash bcrypt mới (bắt đầu bằng $2a$/$2b$/$2y$)
 * - Hash SHA-256 cũ (chuỗi hex 64 ký tự) — trả needsRehash=true để route gọi hàm này
 *   tự động băm lại bằng bcrypt và cập nhật DB.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): Promise<VerifyPasswordResult> {
  if (!storedHash) return { valid: false, needsRehash: false };

  const isBcryptHash = /^\$2[aby]\$/.test(storedHash);

  if (isBcryptHash) {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: false };
  }

  // Định dạng cũ (SHA-256 hex)
  const legacyHash = await legacyHashPasswordSHA256(password);
  const valid = legacyHash === storedHash;
  return { valid, needsRehash: valid };
}
