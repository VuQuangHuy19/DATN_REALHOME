import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ẩn số nhà trong Tên tòa nhà / Địa chỉ để bảo mật cho mô hình môi giới & SaaS.
 * Tránh việc khách tự tìm đến cắt cò hoặc đối thủ lấy danh sách địa chỉ.
 * Quy tắc:
 * - Số 1 chữ số (ví dụ: Số 3 ngõ 249) -> Số x ngõ 249
 * - Số 0 + 1 chữ số (ví dụ: 07) -> 0x
 * - Số 2+ chữ số (ví dụ: 48 Võng Thị) -> 4x Võng Thị, (103 Nguyễn Trãi) -> 10x Nguyễn Trãi
 */
export function maskHouseNumberInBuildingName(name: string): string {
  if (!name || typeof name !== 'string') return name;
  let masked = name.normalize('NFC').trim();

  const maskNumStr = (num: string): string => {
    if (num.length === 1) return 'x';
    if (num.length === 2 && num.startsWith('0')) return '0x';
    return `${num.slice(0, -1)}x`;
  };

  // 1. Khớp "Số 3", "Số 07", "Số 48", "Số 103"
  masked = masked.replace(/(^|\s+)(s[ốồộổỗo]|\s*s[ốồộổỗo])\s*(\d+)([a-zA-Z]?)\b/gi, (match, space, prefix, num, letter) => {
    if (letter && letter.toLowerCase() === 'x') return match;
    const maskedNum = maskNumStr(num);
    return `${space}${prefix} ${maskedNum}${letter ? letter : ''}`;
  });

  // 2. Khớp số ở đầu chuỗi (ví dụ: "48 Võng Thị", "18 Định Công Thượng", "3 Võng Thị")
  if (!/^(s[ốồộổỗo]|ngõ|ngách|hẻm|đường|phố)/i.test(masked)) {
    masked = masked.replace(/^(\d+)([a-zA-Z]?)\s+/i, (match, num, letter) => {
      if (letter && letter.toLowerCase() === 'x') return match;
      const maskedNum = maskNumStr(num);
      return `${maskedNum} `;
    });
  }

  return masked;
}
