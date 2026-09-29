import { isPurePriceString } from './priceCleaner';

/**
 * Nhận diện xem một ô có phải là Tiêu đề Tòa nhà / Địa chỉ mới hay không
 */
export function isBuildingHeader(val: any): boolean {
  if (!val) return false;
  const str = String(val).trim();
  if (str.length < 4) return false;

  const lower = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Các từ khóa loại trừ CHÍNH XÁC (ô chỉ chứa mỗi từ này)
  const EXACT_IGNORE = [
    'full do', 'phong trong', 'cho vao', 'con trong', 'da het', 'luu y', 'ghi chu',
    'dich vu', 'link anh', 'sdt', 'stt', 'gia phong', 'loai phong', 'dien tich',
    'tinh trang', 'trang thai', 'thanh toan', 'internet', 'dvc', 'danh sach', 'bang hang',
    'giuong tang', 'studio', '1n1k', '2n1k', '3n1k', 'duplex', 'gac xep', 'ban cong',
    'khep kin', 'phong', 'tang', 'noi that', 'gui xe', 'so dan', 'p.', 'p '
  ];
  if (EXACT_IGNORE.some(kw => lower === kw || lower.startsWith(kw + ' ') || lower.startsWith(kw + '\n'))) return false;

  // Các từ khóa luôn loại trừ dù xuất hiện ở đâu trong chuỗi
  const PARTIAL_IGNORE = ['full do', 'phong trong', 'cho vao', 'link anh', 'noi that', 'dich vu chung'];
  if (PARTIAL_IGNORE.some(kw => lower.includes(kw))) return false;

  if (isPurePriceString(str)) return false;

  // Tiêu đề địa chỉ tòa nhà thường chứa các từ địa danh/số nhà + tên đường
  const hasAddrKeyword = /(ngo|ngach|hem|duong|pho|quan|phuong|toa|bu|co so|phan khu)/i.test(lower);

  // "Nhà X ngách Y..." hoặc "SỐ X NGÕ Y..."
  const hasNhaPattern = /^nha\s+\d+|^so\s+\d+\s+ngo/i.test(lower);

  // Bắt đầu bằng số + tên đường (ví dụ: "24 ngách 24 ngõ Thổ Quan", "71 ngách 100...")
  const hasNumberAndStreet = /^\d+\s+[a-z\u00C0-\u024F]/i.test(str);

  if (hasAddrKeyword || hasNhaPattern || hasNumberAndStreet) return true;

  return false;
}
