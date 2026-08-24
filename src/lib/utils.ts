import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Chuẩn hóa địa chỉ / tên tòa nhà theo chuẩn hiển thị mong muốn:
 * - Dạng số ngách/số nhà có dấu gạch chéo: "43/213 GIÁP NHẤT" -> "43.213 GIÁP NHẤT"
 * - Dạng 5 chữ số dính liền: "43213 GIÁP NHẤT" -> "43.213 GIÁP NHẤT"
 * - Dạng 4 chữ số + x dính liền: "4321x GIÁP NHẤT" -> "43.21x GIÁP NHẤT"
 */
export function formatStandardBuildingAddress(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let formatted = text.normalize('NFC').trim();

  // 1. Chuyển dấu / trong số nhà thành dấu . (Ví dụ: 43/213 -> 43.213, 12/34 -> 12.34)
  formatted = formatted.replace(/(\b\d+)\/(\d+)\b/g, '$1.$2');

  // 2. Chuyển số 5 chữ số dính liền ở đầu tên/địa chỉ (Ví dụ: 43213 GIÁP NHẤT -> 43.213 GIÁP NHẤT)
  formatted = formatted.replace(/^(\d{2})(\d{3})\b/g, '$1.$2');

  // 3. Chuyển số 4 chữ số + x dính liền ở đầu (Ví dụ: 4321x GIÁP NHẤT -> 43.21x GIÁP NHẤT)
  formatted = formatted.replace(/^(\d{2})(\d{2})x\b/gi, '$1.$2x');

  return formatted;
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
  let masked = formatStandardBuildingAddress(name);

  const maskNumStr = (num: string): string => {
    if (num.length === 1) return 'x';
    if (num.length === 2 && num.startsWith('0')) return '0x';
    return `${num.slice(0, -1)}x`;
  };

  const maskValue = (numStr: string): string => {
    if (numStr.toLowerCase().endsWith('x')) return numStr;
    if (numStr.includes('/') || numStr.includes('.')) {
      const sep = numStr.includes('/') ? '/' : '.';
      const parts = numStr.split(/[\/.]/);
      return `${parts[0]}${sep}${maskNumStr(parts[1])}`;
    }
    return maskNumStr(numStr);
  };

  // 1. Khớp số sau "ngách", "hẻm", "số" (ví dụ: "ngách 83" -> "ngách 8x", "số 25" -> "số 2x")
  masked = masked.replace(/(ngách|hẻm|s[ốồộổỗo])\s*(\d+(?:[\/.]\d+)?)([a-zA-Z]?)\b/gi, (match, prefix, numStr, letter) => {
    if (letter && letter.toLowerCase() === 'x') return match;
    return `${prefix} ${maskValue(numStr)}${letter ? letter : ''}`;
  });

  // 2. Khớp "Số 3", "Số 07", "Số 48", "Số 103", "Số 43/213", "Số 43.213"
  masked = masked.replace(/(^|\s+)(s[ốồộổỗo]|\s*s[ốồộổỗo])\s*(\d+(?:[\/.]\d+)?)([a-zA-Z]?)\b/gi, (match, space, prefix, numStr, letter) => {
    if (letter && letter.toLowerCase() === 'x') return match;
    return `${space}${prefix} ${maskValue(numStr)}${letter ? letter : ''}`;
  });

  // 3. Khớp số ở đầu chuỗi (ví dụ: "3 ngách 83", "48 Võng Thị", "43/213 Giáp Nhất", "124 Khương Trung")
  if (!/^(s[ốồộổỗo]|ngõ|ngách|hẻm|đường|phố)/i.test(masked)) {
    masked = masked.replace(/^(\d+(?:[\/.]\d+)?)([a-zA-Z]?)\s+/i, (match, numStr, letter) => {
      if (letter && letter.toLowerCase() === 'x') return match;
      return `${maskValue(numStr)}${letter ? letter : ''} `;
    });
  }

  return masked;
}

/**
 * Địn dạng giá tiền tiếng Việt ngắn gọn:
 * - 6.300.000 -> 6,3tr
 * - 6.400.000 -> 6,4tr
 * - 6.000.000 -> 6tr
 * - 500.000 -> 500k (hoặc 0,5tr)
 */
export function formatVnPrice(price: number): string {
  if (!price || price <= 0) return '0đ';
  if (price >= 1000000) {
    const val = price / 1000000;
    const str = val.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `${str}tr`;
  }
  if (price >= 1000) {
    const k = price / 1000;
    const str = k.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `${str}k`;
  }
  return `${price}đ`;
}

/**
 * Định dạng khoảng giá tiền tiếng Việt ngắn gọn:
 * - min: 6.300.000, max: 6.400.000 -> "6,3tr – 6,4tr"
 * - min: 5.500.000, max: 5.500.000 -> "5,5tr"
 */
export function formatVnPriceRange(minPrice: number, maxPrice: number): string {
  if (!minPrice && !maxPrice) return '0đ';
  if (!minPrice) return formatVnPrice(maxPrice);
  if (!maxPrice || minPrice === maxPrice) return formatVnPrice(minPrice);
  return `${formatVnPrice(minPrice)} – ${formatVnPrice(maxPrice)}`;
}

/**
 * Chuyển chuỗi về dạng chuẩn không ký tự đặc biệt để so sánh trùng lặp tòa nhà
 */
export function normalizeStringForMatching(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\(\d+\)$/, '') // Loai bo (2), (3) o cuoi ten
    .replace(/[^a-z0-9]/g, '');
}

/**
 * So sánh 2 tên hoặc địa chỉ tòa nhà (Hỗ trợ chứa chuỗi địa chỉ/số nhà & ký tự đại diện x)
 */
export function isMatchingBuilding(bName1: string, bName2: string): boolean {
  if (!bName1 || !bName2) return false;
  const n1 = normalizeStringForMatching(bName1);
  const n2 = normalizeStringForMatching(bName2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Nếu cả 2 đều có độ dài đủ dài (ví dụ "98nguyenngocnai"), hỗ trợ khớp chứa chuỗi
  if (n1.length >= 8 && n2.length >= 8) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  // Khớp ký tự đại diện 'x' (ví dụ "4321xgiapnhat" vs "43213giapnhat")
  const pattern1 = n1.replace(/x/g, '\\d*');
  const pattern2 = n2.replace(/x/g, '\\d*');
  try {
    if (new RegExp(`^${pattern1}$`).test(n2) || new RegExp(`^${pattern2}$`).test(n1)) return true;
  } catch (e) {}

  // Khớp tên đường + tiền tố số nhà
  const street1 = n1.replace(/\d+/g, '');
  const street2 = n2.replace(/\d+/g, '');
  if (street1.length >= 5 && street1 === street2) {
    const num1 = (n1.match(/\d+/) || [''])[0];
    const num2 = (n2.match(/\d+/) || [''])[0];
    if (num1 && num2 && (num1 === num2 || num1.startsWith(num2) || num2.startsWith(num1))) {
      return true;
    }
  }

  return false;
}

