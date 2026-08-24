import * as XLSX from 'xlsx';
import type { LandlordPoliciesParsed } from '../googleSheetAiParser';

export function cleanVietnameseString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

export function parseLandlordPoliciesFromWorkbook(wb: XLSX.WorkBook): LandlordPoliciesParsed | null {
  const result: LandlordPoliciesParsed = {
    commission_policy: [],
    duplicate_customer_policy: [],
    duplicate_customer_conditions: [],
    closing_notes: [],
  };

  let foundAny = false;

  const policySheetNames = wb.SheetNames.filter((name) => {
    const norm = cleanVietnameseString(name);
    return norm.includes('luu y') || norm.includes('quy dinh') || norm.includes('chinh sach') || norm.includes('policy') || norm.includes('note');
  });

  const targetSheetNames = policySheetNames.length > 0 ? policySheetNames : wb.SheetNames;

  for (const sheetName of targetSheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;

    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let currentCat: keyof LandlordPoliciesParsed | null = null;

    for (const row of rows) {
      if (!row || row.length === 0) continue;

      for (const cellVal of row) {
        const valStr = String(cellVal || '').trim();
        if (!valStr) continue;
        const norm = cleanVietnameseString(valStr);

        if (norm.includes('dieu kien xac nhan trung khach') || norm.includes('dieu kien trung khach')) {
          currentCat = 'duplicate_customer_conditions';
          break;
        } else if (norm.includes('xu ly trung khach') || norm.includes('quy dinh trung khach')) {
          currentCat = 'duplicate_customer_policy';
          break;
        } else if (norm.includes('quy dinh hoa hong') || norm.includes('chinh sach hoa hong')) {
          currentCat = 'commission_policy';
          break;
        } else if (norm.includes('luu y khi chot khach') || norm.includes('luu y chot khach') || norm.includes('luu y nhan khach')) {
          currentCat = 'closing_notes';
          break;
        }
      }

      if (currentCat) {
        for (const cellVal of row) {
          const val = String(cellVal || '').trim();
          if (!val) continue;

          const norm = cleanVietnameseString(val);

          const isExactHeaderCell =
            norm.includes('quy dinh hoa hong') ||
            norm.includes('xu ly trung khach') ||
            norm.includes('dieu kien xac nhan trung khach') ||
            norm.includes('luu y khi chot khach');

          if (!isExactHeaderCell && val.length > 2 && !/^(stt|địa chỉ|giá|phòng|thang|nội thất|dịch vụ|mã phòng)$/i.test(val)) {
            if (!result[currentCat].includes(val)) {
              result[currentCat].push(val);
              foundAny = true;
            }
          }
        }
      }
    }
  }

  return foundAny ? result : null;
}

export function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function extractGidFromUrl(url: string): string | null {
  const match = url.match(/[?&]gid=([0-9]+)/);
  return match ? match[1] : null;
}
