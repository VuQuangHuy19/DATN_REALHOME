import { isPurePriceString } from './priceCleaner';

/**
 * Nhận diện xem một ô có phải là Tiêu đề Tòa nhà / Địa chỉ mới hay không
 */
export function isBuildingHeader(val: any): boolean {
  if (!val) return false;
  const str = String(val).trim();
  if (str.length < 4) return false;

  const lower = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const IGNORE = [
    'full do', 'phong trong', 'cho vao', 'con trong', 'da het', 'luu y', 'ghi chu',
    'dich vu', 'link anh', 'sdt', 'stt', 'gia phong', 'loai phong', 'dien tich',
    'tinh trang', 'trang thai', 'thanh toan', 'internet', 'dvc', 'danh sach', 'bang hang',
    'giuong tang', 'studio', '1n1k', '2n1k', '3n1k', 'duplex', 'gac xep', 'ban cong',
    'khep kin', 'p.', 'phong', 'tang', 'noi that', 'gui xe', 'so dan'
  ];

  if (IGNORE.some(kw => lower.includes(kw))) return false;
  if (isPurePriceString(str)) return false;

  // Tiêu đề địa chỉ tòa nhà thường chứa các từ địa danh/số nhà + tên đường
  const hasAddrKeyword = /(ngo|ngach|hem|duong|pho|quan|phuong|nha|toa|bu|co so|phan khu)/i.test(lower);
  const hasNumberAndStreet = /^\d+\s+[a-zà-ỹ]/i.test(str);

  if (hasAddrKeyword || hasNumberAndStreet) return true;

  return false;
}
