/**
 * lib/phone.ts
 *
 * Chuẩn hoá và validate số điện thoại Việt Nam.
 */

/**
 * Chuẩn hoá số điện thoại về dạng "0xxxxxxxxx" (10 chữ số, bắt đầu bằng 0).
 *
 * Hỗ trợ các định dạng đầu vào:
 *   "+84 912 345 678"  → "0912345678"
 *   "84912345678"      → "0912345678"
 *   "0912-345-678"     → "0912345678"
 *   "09.123.45678"     → "0912345678"
 *   "  0912345678  "   → "0912345678"
 *
 * Nếu chuỗi đầu vào không phải số điện thoại hợp lệ, trả về chuỗi gốc đã trim
 * (không throw) để tránh crash flow — caller nên dùng isValidVNPhone() để validate riêng.
 */
export function normalizePhoneVN(phone: string): string {
  if (!phone) return phone;

  // Bước 1: Bỏ tất cả ký tự không phải số và dấu +
  let cleaned = phone.trim().replace(/[\s\-.()\u00a0]/g, '');

  // Bước 2: Đổi đầu số quốc tế về 0
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    // 84912345678 (11 ký tự) → 0912345678 (10 ký tự)
    cleaned = '0' + cleaned.slice(2);
  }

  return cleaned;
}

/**
 * Kiểm tra số điện thoại VN hợp lệ (sau khi đã normalize).
 *
 * Đầu số hợp lệ (theo quy hoạch VNPT/Viettel/Mobifone/Vietnamobile/Gmobile):
 * - 03x, 05x, 07x, 08x, 09x
 *
 * @param phone - Số đã được normalizePhoneVN() xử lý
 */
export function isValidVNPhone(phone: string): boolean {
  return /^(0[3-9][0-9]{8})$/.test(phone);
}
