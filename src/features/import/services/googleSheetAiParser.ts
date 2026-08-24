import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { parseRoomType, RoomType } from '@/lib/constants/roomTypes';
import { formatStandardBuildingAddress } from '@/lib/utils';
import { cleanPriceNumber, isPurePriceString } from './parser/priceCleaner';
import { detectHanoiDistrict } from './parser/hanoiDistricts';
import { isBuildingHeader } from './parser/buildingHeaderParser';
import { parseDateFromStatusString } from './parser/dateParser';
import {
  parseFloorFromRoomCode,
  cleanRoomCodeAndType,
  transformTrucRoomCode,
  expandBuildingGrid,
} from './parser/roomCodeParser';
import {
  cleanVietnameseString,
  parseLandlordPoliciesFromWorkbook,
  extractGoogleSheetId,
  extractGidFromUrl,
} from './parser/landlordPolicyParser';

export {
  cleanPriceNumber,
  isPurePriceString,
  detectHanoiDistrict,
  isBuildingHeader,
  parseDateFromStatusString,
  parseFloorFromRoomCode,
  cleanRoomCodeAndType,
  transformTrucRoomCode,
  expandBuildingGrid,
  cleanVietnameseString,
  parseLandlordPoliciesFromWorkbook,
  extractGoogleSheetId,
  extractGidFromUrl,
};

const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

export const ParsedRoomSchema = z.object({
  code: z.string().describe("Mã phòng (ví dụ: '101', '201', '302', 'P.401', 'Trục 01')"),
  floor: z.number().default(1).describe("Tầng của phòng"),
  price: z.number().default(0).describe("Giá thuê số VNĐ nguyên vẹn (ví dụ: 4800000, 5500000)"),
  room_type: z.string().default("Studio").describe("Loại phòng (ví dụ: Studio, 1N1K, 2N1K-1WC, Gác xép...)"),
  size: z.number().default(25).describe("Diện tích m2"),
  status: z.string().default('available').describe("Trạng thái phòng: available hoặc rented"),
  available_date: z.string().nullable().optional().describe("Ngày phòng có thể vào ở (ISO date, ví dụ: 2026-07-31). Điền khi thấy ngày tháng cụ thể trong ô trạng thái."),
  bedrooms: z.number().default(1),
  bathrooms: z.number().default(1),
  description: z.string().nullable().optional(),
  drive_media_url: z.string().nullable().optional().describe("Link Google Drive / Zalo ẩn trong ô của phòng"),
  manager_raw: z.string().nullable().optional(),
  deposit_terms: z.string().nullable().optional().describe("Quy định cọc (ví dụ: 'Cọc 1.5 tháng', 'Đóng 1 cọc 1.5 tháng')"),
  max_occupants: z.number().optional().describe("Số người ở tối đa trong phòng (ví dụ: 3, 4 người)"),
  max_vehicles_per_room: z.number().optional().describe("Số xe máy gửi tối đa per room (ví dụ: 1, 2 xe)"),
});

export const LandlordPoliciesSchema = z.object({
  commission_policy: z.array(z.string()).default([]),
  duplicate_customer_policy: z.array(z.string()).default([]),
  duplicate_customer_conditions: z.array(z.string()).default([]),
  closing_notes: z.array(z.string()).default([]),
});

export const ParsedBuildingSchema = z.object({
  name: z.string().describe("Tên tòa nhà hoặc địa chỉ (ví dụ: 196 Trần Duy Hưng, 139 Nguyễn Ngọc Vũ, 562 Đường Láng...)"),
  address: z.string().nullable().optional(),
  area: z.string().default("Đống Đa"),
  general_notes: z.string().nullable().optional(),
  electricity_price: z.string().nullable().optional(),
  water_price: z.string().nullable().optional(),
  allow_pet: z.string().nullable().optional(),
  allow_foreigners: z.boolean().optional(),
  allow_vinfast_electric: z.boolean().optional(),
  drive_media_url: z.string().nullable().optional().describe("Link Google Drive folder ảnh chung của tòa nhà"),
  latitude: z.number().nullable().optional().describe("Vĩ độ GPS của tòa nhà (ví dụ: 20.9827808)"),
  longitude: z.number().nullable().optional().describe("Kinh độ GPS của tòa nhà (ví dụ: 105.8165477)"),
  map_link: z.string().nullable().optional().describe("Link Google Maps vị trí tòa nhà"),
  manager_raw: z.string().nullable().optional().describe("Người quản lý  / Liên hệ tòa nhà (ví dụ: 'Bảo Chấn - 0934686094' hoặc 'Trung Kiên|0967691507'). Lấy từ cột bất kỳ như: Số dẫn, Quản lý tòa, Quản lý, Liên hệ, Đầu chủ, SĐT dẫn, SĐT quản lý, Hotline, Người dẫn."),
  deposit_terms: z.string().nullable().optional().describe("Quy định cọc của tòa nhà (ví dụ: 'Cọc 1.5 tháng', 'Đóng 1 cọc 1.5 tháng')"),
  rooms: z.array(ParsedRoomSchema).default([]).describe("Danh sách TOÀN BỘ các phòng thuộc tòa nhà này"),
  landlord_policies: LandlordPoliciesSchema.nullable().optional(),
});

export const SheetImportResultSchema = z.object({
  buildings: z.array(ParsedBuildingSchema).describe("Danh sách các Tòa nhà và toàn bộ phòng bóc tách được"),
  landlord_policies: LandlordPoliciesSchema.nullable().optional(),
});

export type ParsedRoom = z.infer<typeof ParsedRoomSchema>;
export type ParsedBuilding = z.infer<typeof ParsedBuildingSchema>;
export type LandlordPoliciesParsed = z.infer<typeof LandlordPoliciesSchema>;
export type SheetImportResult = z.infer<typeof SheetImportResultSchema>;

/**
 * Lọc bỏ các Tab ghi chú, quy định không chứa bất động sản
 */
function findBestSheetsToProcess(wb: XLSX.WorkBook): string[] {
  const sheetNames = wb.SheetNames;
  if (sheetNames.length === 1) return sheetNames;

  const IGNORE_KEYWORDS = ['tiêu chí', 'quy định', 'hướng dẫn', 'hdsd', 'danh mục chung'];
  const validSheets = sheetNames.filter(name => {
    const lower = name.toLowerCase().trim();
    return !IGNORE_KEYWORDS.some(kw => lower.includes(kw));
  });

  return validSheets.length > 0 ? validSheets : sheetNames;
}

const GENERIC_TAB_NAMES = [
  'nguồn', 'nguon', 'sheet1', 'sheet 1', 'data', 'danh sách', 'danh sach',
  'bảng hàng', 'bang hang', 'tổng hợp', 'tong hop', 'kho hàng', 'kho hang',
  'phòng trống', 'phong trong', 'trang tính', 'trang tinh', 'tất cả', 'tat ca'
];

/**
 * Trích xuất các Tiêu chí / Quy định nhận khách xem phòng từ Tab "Tiêu chí..." (nếu có)
 */
export function extractPolicyRulesFromWorkbook(wb: XLSX.WorkBook): string | null {
  const policySheetName = wb.SheetNames.find(name => {
    const lower = name.toLowerCase().trim();
    return lower.includes('tiêu chí') || lower.includes('quy định') || lower.includes('chính sách');
  });

  if (!policySheetName) return null;

  const ws = wb.Sheets[policySheetName];
  if (!ws || !ws['!ref']) return null;

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  if (!rows || rows.length === 0) return null;

  const rules: string[] = [];
  rows.forEach(row => {
    if (!row || !Array.isArray(row)) return;
    row.forEach(cell => {
      if (!cell) return;
      const str = String(cell).trim();
      if (str.length > 8 && !str.startsWith('===') && !rules.includes(str)) {
        rules.push(str.replace(/\r?\n/g, ' '));
      }
    });
  });

  if (rules.length === 0) return null;

  // Lọc các dòng nội dung tiêu chí/quy định chính
  const keyRules = rules.filter(r =>
    /^[-*+]/.test(r) ||
    /hđ|hợp đồng|tối thiểu|cọc|xem|dẫn|người|xe|nước ngoài|thời hạn|khách|báo/i.test(r)
  );

  const selectedRules = keyRules.length > 0 ? keyRules : rules;
  return cleanAndDeduplicateNotes(selectedRules.join(' | '));
}

/**
 * Chỉ loại bỏ các cụm từ Thưởng / Tặng tiền mặt / Thưởng sale (cho nhân viên)
 * Giữ lại các ưu đãi cho khách như: "Miễn phí tiền nhà đến...", "Miễn phí dịch vụ", "Khuyến mại/Ưu đãi wifi, điện nước"
 */
export function stripPromoAndRewardNotes(text: string | null | undefined): string | null {
  if (!text) return null;

  const parts = text.split(/[\|\n;]/);
  const filteredParts = parts.filter(part => {
    const norm = part.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!norm) return false;

    // Chỉ lọc bỏ thưởng sale / thưởng nóng / tặng tiền mặt (Vd: "thưởng 500k", "tặng 1000k", "thưởng 1tr", "tặng tiền", "thưởng sale")
    const isCashReward =
      /\bthuong\b/i.test(norm) ||
      /tang\s*\d+\s*k/i.test(norm) ||
      /tang\s*\d+\s*tr/i.test(norm) ||
      /tang\s*tien/i.test(norm) ||
      /tang\s*\d+k\s*chuyen\s*vao/i.test(norm);

    return !isCashReward;
  });

  const result = filteredParts.map(p => p.trim()).filter(Boolean).join(' | ');
  return result.length > 0 ? result : null;
}

/**
 * Làm sạch cuối cùng: Loại bỏ tất cả chính sách tặng tiền, thưởng, khuyến mại cũ khỏi general_notes và room.description
 */
export function cleanAllPromoAndRewards(result: SheetImportResult | null): SheetImportResult {
  if (!result || !result.buildings) return result || { buildings: [] };

  result.buildings.forEach(b => {
    if (b.general_notes) {
      b.general_notes = stripPromoAndRewardNotes(b.general_notes);
    }

    b.rooms.forEach(r => {
      if (r.description) {
        // Bảo tồn marker [Sắp trống: YYYY-MM-DD] nếu có
        const matchAvailable = r.description.match(/^(\[Sắp trống:[^\]]+\])\s*(.*)/);
        if (matchAvailable) {
          const prefix = matchAvailable[1];
          const rest = matchAvailable[2];
          const cleanedRest = stripPromoAndRewardNotes(rest);
          r.description = cleanedRest ? `${prefix} ${cleanedRest}` : prefix;
        } else {
          r.description = stripPromoAndRewardNotes(r.description);
        }
      }
    });
  });

  return result;
}

/**
 * Loại bỏ trùng lặp và làm sạch chuỗi Ghi chú / Dịch vụ
 */
export function cleanAndDeduplicateNotes(notesStr: string | null | undefined): string | null {
  if (!notesStr) return null;
  const parts = notesStr.split(/[\|\n;]/).map(s => s.trim()).filter(Boolean);
  const uniqueParts: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const norm = part.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueParts.push(part);
    }
  }

  return uniqueParts.length > 0 ? uniqueParts.join(' | ') : null;
}

/**
 * Xây dựng Ghi chú chung tổng hợp cho từng Tòa nhà
 */
export function buildGeneralNotesForBuilding(globalNotes: string, bldDvc: string, bldInternet: string, specificNotes: string[]): string | null {
  let notes = globalNotes || '';

  if (bldDvc) {
    if (notes.includes('200k/người') && bldDvc !== '200k/người') {
      notes = notes.replace(/200k\/người/g, `${bldDvc}`);
    } else if (notes.includes('Dịch vụ chung') && !notes.toLowerCase().includes(bldDvc.toLowerCase())) {
      notes = notes.replace(/Dịch vụ chung [^gồm|\|]+/gi, `Dịch vụ chung ${bldDvc} `);
    } else if (!notes.toLowerCase().includes(bldDvc.toLowerCase())) {
      notes = notes ? `${notes} | 📌 Dịch vụ chung: ${bldDvc}` : `📌 Dịch vụ chung: ${bldDvc}`;
    }
  }

  if (bldInternet && !notes.toLowerCase().includes(bldInternet.toLowerCase())) {
    notes = notes ? `${notes} | 📶 Internet: ${bldInternet}` : `📶 Internet: ${bldInternet}`;
  }

  if (specificNotes && specificNotes.length > 0) {
    const specStr = `💡 Ghi chú riêng: ${specificNotes.join(' ; ')}`;
    notes = notes ? `${notes} | ${specStr}` : specStr;
  }

  return cleanAndDeduplicateNotes(notes);
}



/**
 * Tổng hợp SĐT/Người quản lý cho Tòa nhà theo cơ chế Majority Vote (Số điện thoại/Người quản lý xuất hiện nhiều nhất)
 * - Nếu nhiều phòng có số chung -> gán số đó cho Tòa nhà
 * - Nếu phòng nào có số riêng khác với số của tòa nhà -> đính kèm [Quản lý riêng: ...] vào mô tả phòng
 */
export function resolveBuildingManagerRaw(bld: ParsedBuilding): string | null {
  const managerCounts = new Map<string, { raw: string; count: number; hasPhone: boolean }>();

  const allRaws: string[] = [];
  if (bld.manager_raw) allRaws.push(bld.manager_raw);

  bld.rooms.forEach((r: any) => {
    if (r.manager_raw) allRaws.push(r.manager_raw);
  });

  allRaws.forEach((rawStr) => {
    if (!rawStr) return;
    const entries = String(rawStr).split(';').map(s => s.trim()).filter(Boolean);
    entries.forEach(entry => {
      const parts = entry.split('|').map(p => p.trim());
      const name = parts[0] || '';
      const phone = (parts[1] || (parts.length === 1 ? parts[0] : '')).replace(/[^\d]/g, '');

      const hasPhone = phone.length >= 8;
      const key = hasPhone ? phone : name.toLowerCase();
      if (!key) return;

      const formattedRaw = hasPhone && name && name !== phone ? `${name}|${phone}` : (hasPhone ? phone : name);

      const existing = managerCounts.get(key);
      if (existing) {
        existing.count++;
        if (!existing.hasPhone && hasPhone) {
          existing.raw = formattedRaw;
          existing.hasPhone = true;
        }
      } else {
        managerCounts.set(key, { raw: formattedRaw, count: 1, hasPhone });
      }
    });
  });

  if (managerCounts.size > 0) {
    const sorted = Array.from(managerCounts.values()).sort((a, b) => {
      if (a.hasPhone !== b.hasPhone) return a.hasPhone ? -1 : 1;
      return b.count - a.count;
    });

    const topManagers = sorted
      .filter((item) => item.hasPhone)
      .slice(0, 3)
      .map((item) => item.raw);

    const bestBuildingManager = topManagers.length > 0
      ? Array.from(new Set(topManagers)).join('; ')
      : (sorted[0]?.raw || null);

    if (bestBuildingManager) {
      bld.manager_raw = bestBuildingManager;
    }
  }

  if (bld.manager_raw) {
    const bldPhoneMatches = (String(bld.manager_raw).match(/(0[35789]\d{8})/g) || []) as string[];
    bld.rooms.forEach((r: any) => {
      const rRaw = (r as any).manager_raw;
      if (rRaw) {
        const rPhoneMatches = (String(rRaw).match(/(0[35789]\d{8})/g) || []) as string[];
        if (rPhoneMatches.length > 0) {
          const isDifferent = rPhoneMatches.some(rp => !bldPhoneMatches.includes(rp));
          if (isDifferent) {
            const specMgrStr = `[Quản lý riêng: ${rRaw.replace(/\|/g, ' - ')}]`;
            if (!r.description?.includes(specMgrStr)) {
              r.description = r.description ? `${r.description} ${specMgrStr}` : specMgrStr;
            }
          }
        }
      }
    });
  }

  return bld.manager_raw || null;
}

/**
 * Nhận diện layout "Dual-Column" đặc biệt:
 * - Có cột phân loại ("Còn trống"/"Đã hết"/"Chờ vào") ở cột 1
 * - Vùng trái (col2-12): Địa chỉ tòa nhà + Phòng có data
 * - Vùng phải (col13+): Mã phòng liệt kê (đã thuê / ảnh / số dẫn)
 */
export function detectDualColumnLayout(rows: any[][]): boolean {
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    const col1Val = String(row[1] || '').trim().toLowerCase();
    const col1Norm = col1Val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (
      col1Norm === 'con trong' ||
      col1Norm === 'da het' ||
      col1Norm === 'cho vao' ||
      col1Norm === 'da thue'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Parser cho layout "Dual-Column" (2 vùng ngang trong cùng 1 sheet):
 *
 * Cấu trúc:
 *   - Col0     : rỗng (STT)
 *   - Col1     : Nhãn loại ("Còn trống"/"Đã hết"/"Chờ vào")
 *   - Col2     : Địa chỉ tòa nhà (khi có)
 *   - Col3     : Mã phòng vùng trái
 *   - Col4     : Giá thuê
 *   - Col5     : Loại phòng
 *   - Col6     : Diện tích
 *   - Col9     : Điều kiện cọ
 *   - Col10    : Internet
 *   - Col11    : DVC
 *   - Col12    : Trạng thái
 *   - Col13    : Mã phòng vùng phải ("Đã thuê") hoặc link ảnh
 *
 * Logic:
 *   - Dòng có col3 = mã phòng + col4 = giá → phòng vùng trái có data
 *   - Dòng có col13 = mã phòng (và không có Drive link) → phòng đã thuê vùng phải
 *   - Dòng có cả col3 và col13 → cả 2 phòng thuộc cùng tòa nhà
 */
export function parseDualColumnLayout(
  ws: XLSX.WorkSheet,
  rows: any[][],
  sheetName: string,
  globalNotes: string
): SheetImportResult | null {
  const buildingsMap = new Map<string, ParsedBuilding>();
  const buildingMetaMap = new Map<string, { dvc: string; internet: string; notes: string[] }>();

  // Cột mặc định
  let rightCodeCol = 13;
  let leftBldCol = 2;
  let leftCodeCol = 3;
  let leftPriceCol = 4;
  let leftTypeCol = 5;
  let leftSizeCol = 6;
  let leftInternetCol = 10;
  let leftDvcCol = 11;
  let leftStatusCol = 12;

  // Quét header để tìm chính xác vị trí cột
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    row.forEach((cell, cIdx) => {
      const cStr = String(cell || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cIdx > 1) {
        if (cStr.includes('loai phong') || cStr === 'loai') leftTypeCol = cIdx;
        else if (cStr.includes('dien tich')) leftSizeCol = cIdx;
        else if (cStr.includes('internet') || cStr.includes('mang')) leftInternetCol = cIdx;
        else if (cStr === 'dvc' || cStr.includes('dich vu chung')) leftDvcCol = cIdx;
        else if (cStr.includes('trang thai') || cStr.includes('tinh trang')) leftStatusCol = cIdx;
        else if ((cStr.includes('link') || cStr.includes('anh') || cStr.includes('hinh')) && cIdx >= 10) {
          rightCodeCol = cIdx;
        }
      }
    });
  }

  let currentBldName = '';
  let currentBldDvc = '';
  let currentBldInternet = '';

  // Tìm dòng bắt đầu dữ liệu (sau dòng header "Chờ vào")
  let startRow = 0;
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    const row = rows[r];
    if (!row) continue;
    const col1Norm = String(row[1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (col1Norm === 'cho vao') {
      startRow = r + 1;
      break;
    }
  }

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const col2Val = String(row[leftBldCol] || '').trim();
    const col3Val = String(row[leftCodeCol] || '').trim();
    const col4Val = row[leftPriceCol];
    const col5Val = String(row[leftTypeCol] || '').trim();
    const col6Val = String(row[leftSizeCol] || '').trim();
    const col10Val = String(row[leftInternetCol] || '').trim();
    const col11Val = String(row[leftDvcCol] || '').trim();
    const col12Val = String(row[leftStatusCol] || '').trim();
    const col13Val = String(row[rightCodeCol] || '').trim();

    // 1. Nhận diện địa chỉ tòa nhà mới (col2)
    if (col2Val && isBuildingHeader(col2Val)) {
      currentBldName = formatStandardBuildingAddress(col2Val);
      currentBldDvc = '';
      currentBldInternet = '';
      if (!buildingMetaMap.has(currentBldName)) {
        buildingMetaMap.set(currentBldName, { dvc: '', internet: '', notes: [] });
      }
    }

    // Thu thập DVC/Internet cho tòa nhà hiện tại
    if (col11Val && !currentBldDvc && col11Val.length > 2 && col11Val.toLowerCase() !== 'dvc') currentBldDvc = col11Val;
    if (col10Val && !currentBldInternet && col10Val.length > 2 && col10Val.toLowerCase() !== 'internet') currentBldInternet = col10Val;

    if (currentBldName) {
      const meta = buildingMetaMap.get(currentBldName);
      if (meta) {
        if (currentBldDvc && !meta.dvc) meta.dvc = currentBldDvc;
        if (currentBldInternet && !meta.internet) meta.internet = currentBldInternet;
      }
    }

    // 1.5. Trích xuất Quản lý / Số dẫn từ khối thông tin (Ví dụ: Header "SỐ DẪN", bên dưới có "397040567")
    row.forEach((cell, cIdx) => {
      const cellStr = String(cell || '').trim();
      const lowerCell = cellStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (
        lowerCell === 'so dan' ||
        lowerCell.includes('sdt dan') ||
        lowerCell.includes('quan ly') ||
        lowerCell.includes('lien he')
      ) {
        const candidates = [
          cellStr,
          String(rows[r + 1]?.[cIdx] || '').trim(),
          String(rows[r + 2]?.[cIdx] || '').trim(),
          String(rows[r]?.[cIdx + 1] || '').trim(),
        ];

        for (const candidate of candidates) {
          const phones = candidate.match(/(?:0|[35789])\d{8}/g);
          if (phones && phones.length > 0) {
            const formattedPhones = phones.map(p => (p.length === 9 ? '0' + p : p));
            const namePart = candidate.replace(/[\d\-\:\,\;\(\)\|]/g, '').trim();
            const mgrRaw = namePart.length >= 2 ? `${namePart}|${formattedPhones[0]}` : formattedPhones[0];

            if (currentBldName && buildingsMap.has(currentBldName)) {
              const bldObj = buildingsMap.get(currentBldName)!;
              if (!bldObj.manager_raw) {
                bldObj.manager_raw = mgrRaw;
              }
            }
            break;
          }
        }
      }
    });

    // 1.6. Trích xuất Link Google Maps & Tọa độ GPS từ các ô trên dòng
    row.forEach((cell, cIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
      const cellObj = ws[cellRef];
      const link = cellObj?.l?.Target || String(cell || '').trim();

      if (link && (link.includes('maps') || link.includes('goo.gl') || link.includes('location'))) {
        const coords = parseLatLongFromGoogleMapsUrl(link);
        if (currentBldName && buildingsMap.has(currentBldName)) {
          const bldObj = buildingsMap.get(currentBldName)!;
          if (coords && !bldObj.latitude) {
            bldObj.latitude = coords.latitude;
            bldObj.longitude = coords.longitude;
          }
          if (!bldObj.map_link) {
            bldObj.map_link = link;
          }
        }
      }
    });

    // 2. Xử lý Phòng vùng trái (col3 = mã phòng có data)
    const leftCode = col3Val;
    const leftPrice = cleanPriceNumber(col4Val);

    const isValidCode = (code: string) =>
      code.length > 0 &&
      code.length <= 15 &&
      !code.toLowerCase().includes('sđt') &&
      !code.toLowerCase().includes('link') &&
      !code.toLowerCase().includes('lưu ý') &&
      !code.toLowerCase().includes('ghi chú') &&
      !code.toLowerCase().includes('nhà để xe') &&
      !code.toLowerCase().includes('số dận') &&
      !code.toLowerCase().includes('stt');

    if (leftCode && isValidCode(leftCode) && currentBldName) {
      // Trích xuất Drive link từ ô
      let roomDriveUrl: string | null = null;
      row.forEach((_, cIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
        const cellObj = ws[cellRef];
        if (cellObj?.l?.Target?.includes('drive.google.com')) {
          roomDriveUrl = cellObj.l.Target;
        }
      });

      // Phân tích trạng thái
      const cleanStat = col12Val.toLowerCase().trim();
      const normStat = cleanStat.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let leftStatus: 'available' | 'rented' | 'reserved' = 'rented';
      let leftAvailableDate: string | null = null;

      const dateInfo = parseDateFromStatusString(cleanStat);
      if (dateInfo.available_date) {
        leftAvailableDate = dateInfo.available_date;
        leftStatus = 'rented';
      } else if (normStat.includes('trong') || normStat.includes('o ngay') || normStat.includes('o luon') || normStat.includes('san') || normStat === 'available') {
        leftStatus = 'available';
      } else if (normStat.includes('giu') || normStat.includes('coc')) {
        leftStatus = 'reserved';
      }

      // Quét tất cả các ô trên dòng này để thu thập Ghi chú riêng hoặc Ngày sắp trống ở bất kỳ cột nào
      const roomSpecificNotes: string[] = [];
      row.forEach((cell, cIdx) => {
        if (cIdx === leftBldCol || cIdx === leftCodeCol || cIdx === leftPriceCol || cIdx === leftTypeCol || cIdx === leftSizeCol) return;
        const cellStr = String(cell || '').trim();
        if (!cellStr || cellStr.length < 2) return;

        const lower = cellStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const IGNORE_KWS = ['dvc', 'internet', 'mang', 'wifi', 'truc', 'so dan', 'phong', 'thue', 'trong', 'tinh trang', 'trang thai', 'dien tich', 'loai', 'link anh', 'full do'];

        // Nếu dòng ghi chú có chứa "FULL", "ĐÃ HẾT", "ĐÃ THUÊ" -> Đổi trạng thái thành Đã thuê (Rented)
        if (lower === 'full' || lower.includes('da het') || lower.includes('da thue') || lower === 'het') {
          leftStatus = 'rented';
          leftAvailableDate = null;
        }

        if (IGNORE_KWS.some(kw => lower === kw)) return;

        const dateCheck = parseDateFromStatusString(cellStr);
        if (dateCheck.available_date) {
          if (!leftAvailableDate) {
            leftAvailableDate = dateCheck.available_date;
            leftStatus = 'rented';
          }
          return;
        }

        if (!cleanPriceNumber(cellStr) && !isPurePriceString(cellStr) && !lower.includes('so dan')) {
          if (!roomSpecificNotes.includes(cellStr)) roomSpecificNotes.push(cellStr);
        }
      });

      let leftDesc: string | null = null;
      if (leftAvailableDate && leftStatus === 'rented') {
        leftDesc = `[Sắp trống: ${leftAvailableDate}]`;
      }
      if (roomSpecificNotes.length > 0) {
        const specStr = `💡 Ghi chú riêng: ${roomSpecificNotes.join(' | ')}`;
        leftDesc = leftDesc ? `${leftDesc} ${specStr}` : specStr;
      }

      const sizeMatch = col6Val.match(/(\d{2,3})/);
      const sizeNum = sizeMatch ? Math.min(200, Math.max(10, parseInt(sizeMatch[1]))) : 25;
      const parsedType = parseRoomType(col5Val);
      const cleanedCode = cleanRoomCodeAndType(leftCode, parsedType);

      const leftRoom: ParsedRoom = {
        code: cleanedCode.code,
        floor: parseFloorFromRoomCode(cleanedCode.code),
        price: leftPrice,
        room_type: cleanedCode.roomType,
        size: sizeNum,
        status: leftStatus,
        available_date: leftAvailableDate,
        bedrooms: cleanedCode.roomType.includes('2N') ? 2 : 1,
        bathrooms: cleanedCode.roomType.includes('2WC') ? 2 : 1,
        description: leftDesc,
        drive_media_url: roomDriveUrl,
      };

      if (!buildingsMap.has(currentBldName)) {
        buildingsMap.set(currentBldName, {
          name: currentBldName, address: currentBldName,
          area: detectHanoiDistrict(currentBldName), drive_media_url: null,
          general_notes: globalNotes || null, rooms: [],
        });
      }
      buildingsMap.get(currentBldName)!.rooms.push(leftRoom);
    }

    // 3. Xử lý Phòng vùng phải (col13 = mã phòng đã thuê hoặc Drive link)
    const col14Val = String(row[rightCodeCol + 1] || '').trim();
    if (
      col13Val &&
      isValidCode(col13Val) &&
      (/\d/.test(col13Val) || col13Val.toLowerCase().includes('trục')) &&
      currentBldName
    ) {

      // Trích xuất Drive link từ ô nếu có
      const cellRef13 = XLSX.utils.encode_cell({ r, c: rightCodeCol });
      const cellObj13 = ws[cellRef13];
      let roomDriveUrl: string | null = null;
      if (cellObj13?.l?.Target && (cellObj13.l.Target.includes('drive.google.com') || cellObj13.l.Target.includes('zalo'))) {
        roomDriveUrl = cellObj13.l.Target;
        const bldObj = buildingsMap.get(currentBldName);
        if (bldObj && !bldObj.drive_media_url) {
          bldObj.drive_media_url = roomDriveUrl;
        }
      }

      // Xử lý mã phòng đã thuê (hoặc mã trục)
      const bld = buildingsMap.get(currentBldName);
      // Chuẩn hóa mã phòng để kiểm tra trùng (bỏ prefix p., đuôi .0, lowercase)
      const normCode = (c: string) => c.trim().toLowerCase().replace(/^p\.?/i, '').replace(/\.0+$/, '');
      const alreadyAdded = bld?.rooms.some(
        rm => normCode(rm.code) === normCode(col13Val)
      );

      if (!alreadyAdded) {
        const rightClean = cleanRoomCodeAndType(col13Val, 'Studio');
        const rightRoom: ParsedRoom = {
          code: rightClean.code,
          floor: parseFloorFromRoomCode(rightClean.code),
          price: 0,
          room_type: rightClean.roomType,
          size: 25,
          status: 'rented',
          available_date: null,
          bedrooms: 1,
          bathrooms: 1,
          description: null,
          drive_media_url: roomDriveUrl,
        };

        if (!buildingsMap.has(currentBldName)) {
          buildingsMap.set(currentBldName, {
            name: currentBldName, address: currentBldName,
            area: detectHanoiDistrict(currentBldName), drive_media_url: roomDriveUrl,
            general_notes: globalNotes || null, rooms: [],
          });
        }
        buildingsMap.get(currentBldName)!.rooms.push(rightRoom);
      }
    }
  }

  const rawBuildings = Array.from(buildingsMap.values()).filter(b => b.rooms.length > 0);
  rawBuildings.forEach(b => {
    const meta = buildingMetaMap.get(b.name);
    b.general_notes = buildGeneralNotesForBuilding(
      b.general_notes || '', meta?.dvc || '', meta?.internet || '', meta?.notes || []
    );
    b.area = detectHanoiDistrict(b.name, b.area);
    resolveBuildingManagerRaw(b);
  });

  const buildings = rawBuildings.map(expandBuildingGrid);
  const totalRooms = buildings.reduce((sum, b) => sum + b.rooms.length, 0);
  if (buildings.length > 0 && totalRooms > 0) return { buildings };
  return null;
}

export function parseLatLongFromGoogleMapsUrl(urlStr: string): { latitude: number; longitude: number } | null {
  if (!urlStr) return null;
  let decoded = urlStr;
  try {
    decoded = decodeURIComponent(urlStr);
  } catch (e) {
    decoded = urlStr;
  }

  // 1. Dạng !3d<lat>!4d<lon> (Tọa độ ghim điểm chính xác nhất trên Google Maps)
  const d3d4Match = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3d4Match) {
    const lat = parseFloat(d3d4Match[1]);
    const lng = parseFloat(d3d4Match[2]);
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
      return { latitude: parseFloat(lat.toFixed(7)), longitude: parseFloat(lng.toFixed(7)) };
    }
  }

  // 2. Dạng /@<lat>,<lon> (Tọa độ tâm bản đồ)
  const atMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
      return { latitude: parseFloat(lat.toFixed(7)), longitude: parseFloat(lng.toFixed(7)) };
    }
  }

  // 3. Dạng q=<lat>,<lon> hoặc place/<lat>,<lon>
  const qMatch = decoded.match(/(?:q=|place\/)(-?\d+\.\d+)(?:,|%2C|\s+)(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
      return { latitude: parseFloat(lat.toFixed(7)), longitude: parseFloat(lng.toFixed(7)) };
    }
  }

  // 4. Dạng Độ Phút Giây: 20°58'58.0"N 105°48'59.6"E
  const dmsLat = decoded.match(/(\d+)°(\d+)'([\d\.]+)"([NS])/);
  const dmsLng = decoded.match(/(\d+)°(\d+)'([\d\.]+)"([EW])/);
  if (dmsLat && dmsLng) {
    let lat = parseInt(dmsLat[1], 10) + parseInt(dmsLat[2], 10) / 60 + parseFloat(dmsLat[3]) / 3600;
    if (dmsLat[4] === 'S') lat = -lat;
    let lng = parseInt(dmsLng[1], 10) + parseInt(dmsLng[2], 10) / 60 + parseFloat(dmsLng[3]) / 3600;
    if (dmsLng[4] === 'W') lng = -lng;
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
      return { latitude: parseFloat(lat.toFixed(7)), longitude: parseFloat(lng.toFixed(7)) };
    }
  }

  return null;
}



/**
 * Trích xuất diện tích m2 (xử lý cả dạng "25+6 GÁC", "Sàn 26 Gác 8", "104m2")
 */
export function parseRoomSize(sizeVal: any): number {
  if (typeof sizeVal === 'number') return sizeVal > 0 && sizeVal <= 200 ? sizeVal : 25;
  if (!sizeVal) return 25;
  const str = String(sizeVal).trim();
  if (!str) return 25;

  const numbers = str.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const nums = numbers.map(n => parseInt(n, 10)).filter(n => n >= 3 && n <= 150);
    if (nums.length === 1) return nums[0];
    if (nums.length >= 2) {
      const sum = nums.reduce((a, b) => a + b, 0);
      if (sum >= 10 && sum <= 200) return sum;
    }
  }
  return 25;
}

/**
 * Nhận diện Layout "Single-Row-Building":
 * Mỗi dòng phòng chứa thẳng tên Tòa nhà / Địa chỉ ở 1 cột riêng (thường là Cột "Tòa" / "Địa chỉ")
 * Cấu trúc Header ví dụ: STT | Tòa | Phòng | Khu vực | Hình ảnh,video | Loại phòng | Diện tích | Giá | Dịch vụ | Tình trạng
 */
export function detectSingleRowBuildingLayout(rows: any[][]): boolean {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    let hasBldHeader = false;
    let hasRoomHeader = false;
    let hasPriceHeader = false;

    row.forEach(cell => {
      const cStr = String(cell || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      if (cStr === 'toa' || cStr === 'toa nha' || cStr.includes('dia chi')) hasBldHeader = true;
      if (cStr === 'phong' || cStr.includes('so phong') || cStr.includes('ma phong')) hasRoomHeader = true;
      if (cStr.includes('gia') || cStr.includes('price')) hasPriceHeader = true;
    });

    if (hasBldHeader && hasRoomHeader && hasPriceHeader) {
      return true;
    }
  }

  // TỰ ĐỘNG NHẬN DIỆN HEADLESS SINGLE ROW LAYOUT (Không có dòng header tiêu đề)
  const sampleRow = rows.find((r) => Array.isArray(r) && r[1] && r[2] && r[6]);
  if (sampleRow) {
    const col1 = String(sampleRow[1]).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const col2 = String(sampleRow[2]).trim();
    const col6Price = cleanPriceNumber(sampleRow[6]);
    if (
      (col1.includes('ngo') || col1.includes('so') || col1.includes('duong') || col1.includes('pho') || col1.includes('ngach') || col1.includes('hem')) &&
      (/^[pP]?\.?\d+[a-zA-Z0-9\-_]*$/.test(col2) || /^(?:ki\s*ot|mb|cua\s*hang|\d+)/i.test(col2)) &&
      col6Price > 500000
    ) {
      return true;
    }
  }

  return false;
}

export function parseSingleRowBuildingLayout(
  ws: XLSX.WorkSheet,
  rows: any[][],
  sheetName: string,
  globalNotes: string
): SheetImportResult | null {
  const buildingsMap = new Map<string, ParsedBuilding>();

  let bldCol = -1;
  let codeCol = -1;
  let priceCol = -1;
  let typeCol = -1;
  let sizeCol = -1;
  let statusCol = -1;
  let serviceCol = -1;
  let interiorCol = -1;
  let areaCol = -1;
  let depositCol = -1;
  let managerNameCol = -1;
  let managerPhoneCol = -1;
  let elecCol = -1;
  let waterCol = -1;
  let internetCol = -1;
  let commonServiceCol = -1;
  let maxOccupantsCol = -1;
  let parkingFeeCol = -1;
  let parkingNotesCol = -1;
  let headerRowIdx = -1;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    row.forEach((cell, cIdx) => {
      const cStr = String(cell || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      if (cStr === 'toa' || cStr === 'toa nha' || cStr.includes('dia chi')) bldCol = cIdx;
      else if (cStr === 'so dan' || cStr.includes('sdt dan') || cStr.includes('quan ly') || cStr.includes('nguoi dan') || cStr.includes('lien he')) managerPhoneCol = cIdx;
      else if (cStr.includes('nguoi dan') || cStr.includes('ten quan ly')) managerNameCol = cIdx;
      else if (!cStr.includes('quan ly') && (cStr.includes('khu vuc') || cStr.includes('quan') || cStr === 'khu')) areaCol = cIdx;
      else if (cStr === 'phong' || cStr.includes('so phong') || cStr.includes('ma phong')) codeCol = cIdx;
      else if (cStr.includes('tinh trang') || cStr.includes('trang thai') || cStr.includes('thoi gian') || cStr.includes('o duoc')) statusCol = cIdx;
      else if (cStr.includes('dat coc') || cStr.includes('coc')) depositCol = cIdx;
      else if (!cStr.includes('gian') && (cStr.includes('gia') || cStr.includes('price'))) priceCol = cIdx;
      else if (cStr.includes('loai phong') || cStr === 'loai') typeCol = cIdx;
      else if (cStr.includes('dien tich')) sizeCol = cIdx;
      else if (cStr.includes('dich vu') || cStr === 'dvc') serviceCol = cIdx;
      else if (cStr.includes('noi that')) interiorCol = cIdx;
      else if (cStr.includes('dien') && !cStr.includes('tich')) elecCol = cIdx;
      else if (cStr.includes('nuoc')) waterCol = cIdx;
      else if (cStr.includes('internet') || cStr.includes('mang')) internetCol = cIdx;
      else if (cStr.includes('dv chung') || cStr.includes('dich vu chung')) commonServiceCol = cIdx;
      else if (cStr.includes('so nguoi') || cStr.includes('toi da') || cStr.includes('nguoi o')) maxOccupantsCol = cIdx;
      else if (cStr.includes('gui xe') || cStr.includes('xe/xe') || cStr.includes('tien xe')) parkingFeeCol = cIdx;
      else if (cStr.includes('ghi chu') && cIdx >= 18) parkingNotesCol = cIdx;
    });

    if (bldCol !== -1 && codeCol !== -1 && priceCol !== -1) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // TỰ ĐỘNG NHẬN DIỆN SHEET THỦ CÔNG/HEADLESS KHÔNG CÓ DÒNG HEADER GÕ TIÊU ĐỀ
    // Kiểm tra xem các dòng đầu có đúng cấu trúc: Col 1 = Địa chỉ, Col 2 = Mã phòng, Col 6 = Giá tiền không
    const sampleRow = rows.find((r) => Array.isArray(r) && r[1] && r[2] && r[6]);
    if (sampleRow) {
      const col1 = String(sampleRow[1]).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const col2 = String(sampleRow[2]).trim();
      const col6Price = cleanPriceNumber(sampleRow[6]);
      if (
        (col1.includes('ngo') || col1.includes('so') || col1.includes('duong') || col1.includes('pho') || col1.includes('ngach') || col1.includes('hem')) &&
        (/^[pP]?\.?\d+[a-zA-Z0-9\-_]*$/.test(col2) || /^(?:ki\s*ot|mb|cua\s*hang|\d+)/i.test(col2)) &&
        col6Price > 500000
      ) {
        bldCol = 1;
        codeCol = 2;
        areaCol = 3;
        sizeCol = 4;
        typeCol = 5;
        priceCol = 6;
        depositCol = 7;
        statusCol = 8;
        managerPhoneCol = (sampleRow[13] && String(sampleRow[13]).replace(/\D/g, '').length >= 8) ? 13 : 12;
        interiorCol = managerPhoneCol === 13 ? 14 : 13;
        serviceCol = managerPhoneCol === 13 ? 15 : 14;
        elecCol = 15;
        waterCol = 16;
        internetCol = 17;
        commonServiceCol = 18;
        maxOccupantsCol = 19;
        parkingFeeCol = 20;
        parkingNotesCol = 21;
        headerRowIdx = -2;
      }
    }
  }

  if (headerRowIdx === -1) return null;

  const startRowIdx = headerRowIdx === -2 ? 0 : headerRowIdx + 1;
  for (let r = startRowIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Kiểm tra xem dòng này có phải dòng Header phụ hay không
    let isSubHeader = false;
    row.forEach(cell => {
      const cStr = String(cell || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cStr === 'phong' || cStr === 'ma phong' || cStr === 'gia' || cStr === 'gia (vnd)' || cStr === 'toa') {
        isSubHeader = true;
      }
    });

    if (isSubHeader) {
      row.forEach((cell, cIdx) => {
        const cStr = String(cell || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        if (cStr === 'toa' || cStr === 'toa nha' || cStr.includes('dia chi')) bldCol = cIdx;
        else if (cStr === 'so dan' || cStr.includes('sdt dan') || cStr.includes('quan ly') || cStr.includes('nguoi dan') || cStr.includes('lien he')) managerPhoneCol = cIdx;
        else if (cStr.includes('nguoi dan') || cStr.includes('ten quan ly')) managerNameCol = cIdx;
        else if (!cStr.includes('quan ly') && (cStr.includes('khu vuc') || cStr.includes('quan') || cStr === 'khu')) areaCol = cIdx;
        else if (cStr === 'phong' || cStr.includes('so phong') || cStr.includes('ma phong')) codeCol = cIdx;
        else if (cStr.includes('tinh trang') || cStr.includes('trang thai') || cStr.includes('thoi gian') || cStr.includes('o duoc')) statusCol = cIdx;
        else if (cStr.includes('dat coc') || cStr.includes('coc')) depositCol = cIdx;
        else if (!cStr.includes('gian') && (cStr.includes('gia') || cStr.includes('price'))) priceCol = cIdx;
        else if (cStr.includes('loai phong') || cStr === 'loai') typeCol = cIdx;
        else if (cStr.includes('dien tich')) sizeCol = cIdx;
        else if (cStr.includes('dich vu') || cStr === 'dvc') serviceCol = cIdx;
        else if (cStr.includes('noi that')) interiorCol = cIdx;
      });
      continue;
    }

    let rawBld = bldCol !== -1 && row[bldCol] !== undefined ? String(row[bldCol]).trim() : '';
    let codeVal = codeCol !== -1 && row[codeCol] !== undefined ? String(row[codeCol]).trim() : '';
    let priceVal = priceCol !== -1 && row[priceCol] !== undefined ? row[priceCol] : '';
    let typeVal = typeCol !== -1 && row[typeCol] !== undefined ? String(row[typeCol]).trim() : '';
    let sizeVal = sizeCol !== -1 && row[sizeCol] !== undefined ? String(row[sizeCol]).trim() : '';
    let statusVal = statusCol !== -1 && row[statusCol] !== undefined ? String(row[statusCol]).trim() : '';
    let serviceVal = serviceCol !== -1 && row[serviceCol] !== undefined ? String(row[serviceCol]).trim() : '';
    let interiorVal = interiorCol !== -1 && row[interiorCol] !== undefined ? String(row[interiorCol]).trim() : '';
    let areaVal = areaCol !== -1 && row[areaCol] !== undefined ? String(row[areaCol]).trim() : '';

    // Đọc thông tin người dẫn / quản lý tòa nhà từ các cột liên quan
    let rawNameCell = managerNameCol !== -1 && row[managerNameCol] !== undefined ? String(row[managerNameCol]).trim() : '';
    let rawPhoneCell = managerPhoneCol !== -1 && row[managerPhoneCol] !== undefined ? String(row[managerPhoneCol]).trim() : '';

    // Nếu đã lấy được rawPhoneCell từ managerPhoneCol nhưng chưa có rawNameCell, kiểm tra ô kề trái (cIdx - 1)
    if (rawPhoneCell && !rawNameCell && managerPhoneCol > 0) {
      const leftVal = String(row[managerPhoneCol - 1] || '').trim();
      const normLeft = leftVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const isGarbage = ['full do', 'nhu anh', 'x9', 'vi tri', 'anh', 'video', 'map', 'link', 'tinh trang', 'trang thai', 'khu vuc', 'phong', 'stt'].some(g => normLeft.includes(g));
      if (leftVal.length >= 2 && !isGarbage && !/^\d+$/.test(leftVal)) {
        rawNameCell = leftVal;
      }
    }

    // Nếu chưa có SĐT, thử đọc từ các cột sau cột Nội thất hoặc quét toàn bộ các ô trong dòng
    if (!rawPhoneCell && interiorCol !== -1) {
      for (let c = interiorCol + 1; c < row.length; c++) {
        const valStr = String(row[c] || '').trim();
        const phones = valStr.match(/(0[35789]\d{8})/g);
        if (phones && phones.length > 0) {
          rawPhoneCell = valStr;
          if (c > 0 && !rawNameCell) {
            const leftVal = String(row[c - 1] || '').trim();
            const normLeft = leftVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const isGarbage = ['full do', 'nhu anh', 'x9', 'vi tri', 'anh', 'video', 'map', 'link', 'tinh trang', 'trang thai', 'khu vuc', 'phong', 'stt'].some(g => normLeft.includes(g));
            if (leftVal.length >= 2 && !isGarbage && !/^\d+$/.test(leftVal)) {
              rawNameCell = leftVal;
            }
          }
          break;
        }
      }
    }

    if (!rawPhoneCell) {
      row.forEach((cell, cIdx) => {
        if (cell && !rawPhoneCell) {
          const valStr = String(cell).trim();
          const phones = valStr.match(/(0[35789]\d{8})/g);
          if (phones && phones.length > 0) {
            rawPhoneCell = valStr;
            if (cIdx > 0 && !rawNameCell) {
              const leftVal = String(row[cIdx - 1] || '').trim();
              const normLeft = leftVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              if (leftVal.length >= 2 && !normLeft.includes('full do') && !normLeft.includes('nhu anh') && normLeft !== 'x9') {
                rawNameCell = leftVal;
              }
            }
          }
        }
      });
    }

    // Nếu rawNameCell vẫn trống, thử tách Tên từ chính rawPhoneCell (nếu ô chứa dạng "Nga - 0357992605" hoặc "Nga 0357992605")
    if (!rawNameCell && rawPhoneCell) {
      const textOnlyInPhoneCell = rawPhoneCell
        .replace(/(0[35789]\d{8})/g, '')
        .replace(/[\-\:\,\;\(\)\|]/g, ' ')
        .trim();
      const normText = textOnlyInPhoneCell.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (
        textOnlyInPhoneCell.length >= 2 &&
        !normText.includes('full do') &&
        !normText.includes('nhu anh') &&
        normText !== 'x9' &&
        !normText.includes('cho vao') &&
        !normText.includes('phong trong')
      ) {
        rawNameCell = textOnlyInPhoneCell;
      }
    }

    let phoneLines: string[] = [];
    const matchedPhones = rawPhoneCell.match(/(?:0|[35789])\d{8}/g);
    if (matchedPhones && matchedPhones.length > 0) {
      const padded = matchedPhones.map(p => (p.length === 9 ? '0' + p : p));
      phoneLines = Array.from(new Set(padded));
    }

    const nameLines = rawNameCell
      .split(/[\r\n;,]+/)
      .map(n => n.replace(/[\d\s\-\.\(\)\|]/g, '').trim())
      .filter(n => n.length >= 2 && n.toLowerCase() !== 'x9' && !n.toLowerCase().includes('full do'));

    let rowManagerRaw = '';
    if (phoneLines.length > 0 || nameLines.length > 0) {
      const maxLen = Math.max(phoneLines.length, nameLines.length);
      const pairs: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const n = nameLines[i] || (nameLines.length === 1 ? nameLines[0] : '');
        const p = phoneLines[i] || (phoneLines.length === 1 ? phoneLines[0] : '');
        if (n && p) pairs.push(`${n}|${p}`);
        else if (n) pairs.push(n);
        else if (p) pairs.push(p);
      }
      rowManagerRaw = pairs.join(';');
    }

    if (!rawBld || rawBld.length < 3 || rawBld.toLowerCase().includes('tiêu chí') || rawBld.toLowerCase().includes('lưu ý') || rawBld.toLowerCase() === 'tòa') {
      continue;
    }

    // Làm sạch tên tòa nhà: thay \n bằng dấu cách
    const cleanBldStr = rawBld.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    const targetBldName = formatStandardBuildingAddress(cleanBldStr);

    if (!codeVal || codeVal.length > 15 || codeVal.toLowerCase().includes('stt') || codeVal.toLowerCase().includes('lưu ý') || codeVal.toLowerCase() === 'phòng') {
      continue;
    }

    const parsedPrice = cleanPriceNumber(priceVal);
    let parsedType = parseRoomType(typeVal);
    const cleanedCodeType = cleanRoomCodeAndType(codeVal, parsedType);
    codeVal = cleanedCodeType.code;
    parsedType = cleanedCodeType.roomType;

    // Phân tích Drive link
    let roomDriveUrl: string | null = null;
    row.forEach((_, cIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
      const cellObj = ws[cellRef];
      if (cellObj && cellObj.l && cellObj.l.Target && (cellObj.l.Target.includes('drive.google.com') || cellObj.l.Target.includes('zalo'))) {
        roomDriveUrl = cellObj.l.Target;
      }
    });

    // Phân tích trạng thái
    const cleanStat = statusVal.toLowerCase().trim();
    const normStat = cleanStat.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let status = 'rented';
    let roomAvailableDate: string | null = null;

    let dateInfo = parseDateFromStatusString(cleanStat);

    // Nếu ô trạng thái không chứa ngày tháng, quét tất cả các ô trên dòng này (như Cột E, F, G...) để tìm ghi chú ngày tháng (vd: Excel date 46264, "15/8", "1/9", "KÍ LẠI 1/9"...)
    if (!dateInfo.available_date) {
      row.forEach((cell) => {
        if (cell !== undefined && cell !== null && !dateInfo.available_date) {
          const dCheck = parseDateFromStatusString(cell);
          if (dCheck.available_date) {
            dateInfo = dCheck;
          }
        }
      });
    }

    if (dateInfo.available_date) {
      roomAvailableDate = dateInfo.available_date;
      status = 'rented';
    } else if (
      normStat.includes('trong') ||
      normStat.includes('o ngay') ||
      normStat.includes('o luon') ||
      normStat.includes('san') ||
      normStat === 'available'
    ) {
      status = 'available';
    } else if (normStat.includes('giu') || normStat.includes('coc')) {
      status = 'reserved';
    }

    const sizeNum = parseRoomSize(sizeVal);

    // 1. Số người ở tối đa từ Cột T
    let rowMaxOccupants = 2;
    if (maxOccupantsCol !== -1 && row[maxOccupantsCol] !== undefined) {
      const parsedOcc = cleanPriceNumber(row[maxOccupantsCol]);
      if (parsedOcc >= 1 && parsedOcc <= 10) rowMaxOccupants = parsedOcc;
    }

    // 2. Số xe máy & Ghi chú xe từ Cột U & V
    let rowMaxVehicles = 2;
    const parkFeeVal = parkingFeeCol !== -1 && row[parkingFeeCol] !== undefined ? String(row[parkingFeeCol]).trim() : '';
    const parkNoteVal = parkingNotesCol !== -1 && row[parkingNotesCol] !== undefined ? String(row[parkingNotesCol]).trim() : '';
    const combinedPark = `${parkFeeVal} ${parkNoteVal}`.toLowerCase();

    if (combinedPark.includes('1 xe')) rowMaxVehicles = 1;
    else if (combinedPark.includes('2 xe')) rowMaxVehicles = 2;
    else if (combinedPark.includes('3 xe')) rowMaxVehicles = 3;

    let roomDesc = [serviceVal, interiorVal].filter(Boolean).join(' | ') || null;
    if (parkFeeVal && !cleanPriceNumber(parkFeeVal)) {
      roomDesc = roomDesc ? `${roomDesc} | Gửi xe: ${parkFeeVal}` : `Gửi xe: ${parkFeeVal}`;
    }
    if (roomAvailableDate && status === 'rented') {
      roomDesc = roomDesc ? `[Sắp trống: ${roomAvailableDate}] ${roomDesc}` : `[Sắp trống: ${roomAvailableDate}]`;
    }

    // 3. Điện, Nước, Mạng, DV chung từ Cột P, Q, R, S
    const rowElec = elecCol !== -1 ? cleanPriceNumber(row[elecCol]) : 0;
    const rowWater = waterCol !== -1 ? cleanPriceNumber(row[waterCol]) : 0;
    const rowInternet = internetCol !== -1 ? cleanPriceNumber(row[internetCol]) : 0;
    const rowCommon = commonServiceCol !== -1 ? cleanPriceNumber(row[commonServiceCol]) : 0;

    let depositVal = depositCol !== -1 && row[depositCol] !== undefined ? String(row[depositCol]).trim() : '';
    let roomDepositTerms: string | null = null;
    if (depositVal) {
      const cleanDep = depositVal.replace(',', '.');
      if (/^\d+(?:\.\d+)?$/.test(cleanDep)) {
        roomDepositTerms = `Cọc ${cleanDep} tháng`;
      } else if (cleanDep.toLowerCase().includes('cọc') || cleanDep.toLowerCase().includes('tháng')) {
        roomDepositTerms = cleanDep;
      } else {
        roomDepositTerms = `Cọc ${cleanDep} tháng`;
      }
    }

    let rowMapLink: string | null = null;
    let rowCoords: { latitude: number; longitude: number } | null = null;

    row.forEach((cell, cIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
      const cellObj = ws[cellRef];
      const link = cellObj?.l?.Target || String(cell || '').trim();

      if (link && (link.includes('maps') || link.includes('goo.gl') || link.includes('location'))) {
        const coords = parseLatLongFromGoogleMapsUrl(link);
        if (coords) {
          rowCoords = coords;
          rowMapLink = link;
        } else if (link.startsWith('http')) {
          rowMapLink = link;
        }
      }
    });

    const roomObj: ParsedRoom = {
      code: codeVal,
      floor: parseFloorFromRoomCode(codeVal),
      price: parsedPrice,
      room_type: parsedType,
      size: sizeNum,
      status: status as any,
      available_date: roomAvailableDate,
      bedrooms: parsedType.includes('2N') ? 2 : 1,
      bathrooms: parsedType.includes('2WC') ? 2 : 1,
      description: roomDesc,
      drive_media_url: roomDriveUrl || null,
      manager_raw: rowManagerRaw || null,
      deposit_terms: roomDepositTerms,
      max_occupants: rowMaxOccupants,
      max_vehicles_per_room: rowMaxVehicles,
    };

    const bldKey = targetBldName.toLowerCase().trim().replace(/\s+/g, ' ');

    if (!buildingsMap.has(bldKey)) {
      buildingsMap.set(bldKey, {
        name: targetBldName,
        address: targetBldName,
        area: detectHanoiDistrict(targetBldName, areaVal),
        drive_media_url: roomDriveUrl || null,
        general_notes: globalNotes || null,
        deposit_terms: roomDepositTerms || null,
        manager_raw: rowManagerRaw || null,
        latitude: rowCoords ? (rowCoords as any).latitude : null,
        longitude: rowCoords ? (rowCoords as any).longitude : null,
        map_link: rowMapLink || null,
        electricity_price: rowElec > 0 ? String(rowElec) : undefined,
        water_price: rowWater > 0 ? String(rowWater) : undefined,
        rooms: [],
      });
    }

    const bld = buildingsMap.get(bldKey)!;
    if (!bld.deposit_terms && roomDepositTerms) {
      bld.deposit_terms = roomDepositTerms;
    }
    if (!bld.drive_media_url && roomDriveUrl) {
      bld.drive_media_url = roomDriveUrl;
    }
    if (!bld.manager_raw && rowManagerRaw) {
      bld.manager_raw = rowManagerRaw;
    }
    if (!bld.latitude && rowCoords) {
      bld.latitude = (rowCoords as any).latitude;
      bld.longitude = (rowCoords as any).longitude;
    }
    if (!bld.map_link && rowMapLink) {
      bld.map_link = rowMapLink;
    }
    if (rowElec > 0 && !bld.electricity_price) bld.electricity_price = String(rowElec);
    if (rowWater > 0 && !bld.water_price) bld.water_price = String(rowWater);
    bld.rooms.push(roomObj);
  }

  buildingsMap.forEach((bld) => {
    resolveBuildingManagerRaw(bld);
    const bldServices: string[] = [];
    bld.rooms.forEach(r => {
      if (r.description) {
        const cleanDesc = r.description.replace(/^\[Sắp trống:[^\]]+\]\s*/, '').trim();
        if (cleanDesc && cleanDesc.length > 5 && !bldServices.includes(cleanDesc)) {
          bldServices.push(cleanDesc);
        }
      }
    });

    if (bldServices.length > 0) {
      bld.general_notes = cleanAndDeduplicateNotes(bldServices.join(' ; '));
    } else {
      bld.general_notes = null;
    }
  });

  const rawBuildings = Array.from(buildingsMap.values()).filter(b => b.rooms.length > 0);
  const buildings = rawBuildings.map(expandBuildingGrid);
  const totalRooms = buildings.reduce((sum, b) => sum + b.rooms.length, 0);
  if (buildings.length > 0 && totalRooms > 0) {
    return { buildings };
  }

  return null;
}

/**
 * Trích xuất toàn bộ Bảng hàng, Tòa nhà, Link Drive ảnh, Nội thất, Dịch vụ cực nhanh
 * Hỗ trợ: nhiều tòa nhà trong 1 tab, nhận diện ngày tháng → "sắp trống"
 */

export function parseSheetContentProgrammatically(wb: XLSX.WorkBook): SheetImportResult | null {
  const buildingsMap = new Map<string, ParsedBuilding>();
  const buildingMetaMap = new Map<string, { dvc: string; internet: string; notes: string[] }>();
  const targetSheets = findBestSheetsToProcess(wb);

  for (const sheetName of targetSheets) {
    let globalNotes = '';
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (!rows || rows.length === 0) continue;

    // === STRATEGY 1: Thử Dual-Column Layout trước ===
    let globalNotesForSheet = '';
    for (let r = 0; r < Math.min(rows.length, 8); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const valStr = String(row[c] || '').trim();
        const lowerVal = valStr.toLowerCase();
        if (valStr.length > 25 && (lowerVal.includes('full đồ') || lowerVal.includes('dịch vụ chung') || lowerVal.includes('điện ') || lowerVal.includes('nước '))) {
          if (!globalNotesForSheet) globalNotesForSheet = valStr;
        }
      }
    }

    if (detectDualColumnLayout(rows)) {
      console.log(`[Sheet Parser] Phát hiện Dual-Column layout trong tab "${sheetName}"`);
      const dualResult = parseDualColumnLayout(ws, rows, sheetName, globalNotesForSheet);
      if (dualResult) {
        for (const bld of dualResult.buildings) {
          const existing = buildingsMap.get(bld.name);
          if (existing) {
            existing.rooms.push(...bld.rooms);
          } else {
            buildingsMap.set(bld.name, bld);
          }
        }
        continue; // Chuyển sang tab tiếp theo
      }
    }

    // === STRATEGY 2: Single-Row-Building Layout (Tên tòa nhà nằm thẳng ở từng dòng) ===
    if (detectSingleRowBuildingLayout(rows)) {
      console.log(`[Sheet Parser] Phát hiện Single-Row-Building layout trong tab "${sheetName}"`);
      const singleResult = parseSingleRowBuildingLayout(ws, rows, sheetName, globalNotesForSheet);
      if (singleResult) {
        for (const bld of singleResult.buildings) {
          const existing = buildingsMap.get(bld.name);
          if (existing) {
            existing.rooms.push(...bld.rooms);
          } else {
            buildingsMap.set(bld.name, bld);
          }
        }
        continue; // Chuyển sang tab tiếp theo
      }
    }

    // === STRATEGY 2: Layout chuẩn (cũ) ===
    globalNotes = globalNotesForSheet;
    let buildingDriveUrl: string | null = null;
    const globalNotesParts: string[] = [];

    // 1. Quét tìm Link Drive & Ghi chú chung ở đầu file (Rows 0-10)

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cellObj = ws[cellRef];
        if (cellObj && cellObj.l && cellObj.l.Target && (cellObj.l.Target.includes('drive.google.com') || cellObj.l.Target.includes('zalo'))) {
          if (!buildingDriveUrl) buildingDriveUrl = cellObj.l.Target;
        }

        const valStr = String(row[c] || '').trim();
        const lowerVal = valStr.toLowerCase();

        if (valStr.length > 25 && (lowerVal.includes('full đồ') || lowerVal.includes('dịch vụ chung') || lowerVal.includes('điện ') || lowerVal.includes('nước '))) {
          if (!globalNotes) globalNotes = valStr;
        }

        if (lowerVal === 'nội thất' || lowerVal === 'dịch vụ' || lowerVal === 'gửi xe' || lowerVal.includes('ghi chú chung')) {
          let detail = row[c + 1] !== undefined ? String(row[c + 1]).trim() : '';
          if (!detail && rows[r + 1] && rows[r + 1][c] !== undefined) {
            detail = String(rows[r + 1][c]).trim();
          }
          if (detail) {
            const entryStr = `${valStr}: ${detail}`;
            if (!globalNotesParts.includes(entryStr)) {
              globalNotesParts.push(entryStr);
            }
          }
        }
      }
    }

    if (globalNotesParts.length > 0) {
      const partStr = globalNotesParts.join(' | ');
      globalNotes = globalNotes ? `${globalNotes} | ${partStr}` : partStr;
    }

    // 2. Quét tiêu đề cột từ bảng (nếu có dạng chuẩn)
    let headerRowIdx = -1;
    let bldCol = -1;
    let codeCol = -1;
    let priceCol = -1;
    let typeCol = -1;
    let sizeCol = -1;
    let statusCol = -1;
    let servicesCol = -1;
    let interiorCol = -1;
    let dvcCol = -1;
    let internetCol = -1;
    let managerNameCol = -1;
    let managerPhoneCol = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;
      row.forEach((cell, cIdx) => {
        const cStr = String(cell || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (cStr.includes('toa nha') || cStr.includes('ten toa') || cStr.includes('dia chi') || cStr === 'toa') bldCol = cIdx;
        else if (cStr.includes('so phong') || cStr.includes('ma phong') || cStr.includes('phong trong') || cStr === 'phong') codeCol = cIdx;
        else if (cStr.includes('tinh trang') || cStr.includes('trang thai') || cStr.includes('thoi gian') || cStr.includes('o duoc')) statusCol = cIdx;
        else if (!cStr.includes('gian') && (cStr.includes('gia') || cStr.includes('price'))) priceCol = cIdx;
        else if (cStr.includes('loai phong') || cStr === 'loai') typeCol = cIdx;
        else if (cStr.includes('dien tich')) sizeCol = cIdx;
        else if (cStr === 'dvc' || cStr.includes('dich vu chung')) dvcCol = cIdx;
        else if (cStr.includes('internet') || cStr.includes('mang')) internetCol = cIdx;
        else if (cStr.includes('noi that')) interiorCol = cIdx;
        else if (cStr.includes('so dan') || cStr.includes('sdt dan') || cStr.includes('sdt quan ly') || cStr.includes('sdt nguoi dan')) managerPhoneCol = cIdx;
        else if (cStr.includes('nguoi dan') || cStr.includes('ten quan ly') || cStr.includes('quan ly')) managerNameCol = cIdx;
      });

      if (codeCol !== -1 || priceCol !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    const cleanSheetName = sheetName.trim();
    const isGenericTab = GENERIC_TAB_NAMES.some(g => cleanSheetName.toLowerCase() === g || cleanSheetName.toLowerCase().startsWith('sheet'));

    let currentBldName = isGenericTab ? '' : cleanSheetName;
    let currentBldSpecificNotes: string[] = [];
    let currentBldDvc = '';
    let currentBldInternet = '';
    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      let bldVal = bldCol !== -1 && row[bldCol] !== undefined ? String(row[bldCol]).trim() : '';
      let codeVal = codeCol !== -1 && row[codeCol] !== undefined ? String(row[codeCol]).trim() : '';
      let priceVal = priceCol !== -1 && row[priceCol] !== undefined ? row[priceCol] : '';
      let typeVal = typeCol !== -1 && row[typeCol] !== undefined ? String(row[typeCol]).trim() : '';
      let sizeVal = sizeCol !== -1 && row[sizeCol] !== undefined ? String(row[sizeCol]).trim() : '';
      let statusVal = statusCol !== -1 && row[statusCol] !== undefined ? String(row[statusCol]).trim() : '';
      let serviceVal = servicesCol !== -1 && row[servicesCol] !== undefined ? String(row[servicesCol]).trim() : '';
      let interiorVal = interiorCol !== -1 && row[interiorCol] !== undefined ? String(row[interiorCol]).trim() : '';

      const col1Val = row[1] !== undefined ? String(row[1]).trim() : '';
      const col2Val = row[2] !== undefined ? String(row[2]).trim() : '';
      const col0Val = row[0] !== undefined ? String(row[0]).trim() : '';

      // Tự động nhận diện Tòa nhà mới nếu ô thỏa mãn isBuildingHeader (Bỏ qua các cột dữ liệu phòng đã xác định)
      let potentialBldHeader = '';
      if (bldCol !== -1 && bldVal && isBuildingHeader(bldVal)) {
        potentialBldHeader = bldVal;
      } else if (headerRowIdx === -1) {
        // Nếu không có header rõ ràng, chỉ check ô col0 hoặc col1 nếu không trùng cột dữ liệu
        if (col0Val && 0 !== codeCol && 0 !== typeCol && 0 !== priceCol && 0 !== statusCol && isBuildingHeader(col0Val)) {
          potentialBldHeader = col0Val;
        } else if (col1Val && 1 !== codeCol && 1 !== typeCol && 1 !== priceCol && 1 !== statusCol && isBuildingHeader(col1Val)) {
          potentialBldHeader = col1Val;
        }
      }

      if (potentialBldHeader) {
        currentBldName = potentialBldHeader;
        currentBldSpecificNotes = [];
        currentBldDvc = '';
        currentBldInternet = '';

        // Đọc Số dẫn / Người quản lý nếu có trong cùng dòng tiêu đề tòa nhà
        if (!buildingsMap.has(formatStandardBuildingAddress(potentialBldHeader))) {
          const mPhone = managerPhoneCol !== -1 && row[managerPhoneCol] ? String(row[managerPhoneCol]).trim() : '';
          const mName = managerNameCol !== -1 && row[managerNameCol] ? String(row[managerNameCol]).trim() : '';
          if (mPhone) {
            const managerRaw = mName ? `${mName} - ${mPhone}` : mPhone;
            // Will be assigned when building is created
            buildingMetaMap.set(formatStandardBuildingAddress(potentialBldHeader), { dvc: '', internet: '', notes: [], managerRaw } as any);
          }
        }
      }

      // Trích xuất DVC & Internet riêng của Tòa nhà
      const dvcVal = dvcCol !== -1 && row[dvcCol] !== undefined ? String(row[dvcCol]).trim() : '';
      const internetVal = internetCol !== -1 && row[internetCol] !== undefined ? String(row[internetCol]).trim() : '';

      if (dvcVal && dvcVal.toLowerCase() !== 'dvc' && !currentBldDvc) {
        currentBldDvc = dvcVal;
      }
      if (internetVal && internetVal.toLowerCase() !== 'internet' && !currentBldInternet) {
        currentBldInternet = internetVal;
      }

      if (currentBldName) {
        if (!buildingMetaMap.has(currentBldName)) {
          buildingMetaMap.set(currentBldName, { dvc: '', internet: '', notes: [] });
        }
        const meta = buildingMetaMap.get(currentBldName)!;
        if (currentBldDvc && !meta.dvc) meta.dvc = currentBldDvc;
        if (currentBldInternet && !meta.internet) meta.internet = currentBldInternet;
      }

      // Xử lý Ghi chú riêng cho Tòa nhà
      const noteCandidate = (codeCol !== -1 && codeVal.length > 20 ? codeVal : '') || (row[3] && String(row[3]).trim().length > 20 ? String(row[3]).trim() : '');
      if (noteCandidate && !cleanPriceNumber(priceVal) && currentBldName) {
        if (!currentBldSpecificNotes.includes(noteCandidate)) {
          currentBldSpecificNotes.push(noteCandidate);
          const meta = buildingMetaMap.get(currentBldName);
          if (meta && !meta.notes.includes(noteCandidate)) {
            meta.notes.push(noteCandidate);
          }
        }
        continue;
      }

      // Tự động nhận diện nếu ô ở Cột A (col0) chứa Giá tiền (ví dụ 6.800.000, 6.300.000)
      if (!cleanPriceNumber(priceVal)) {
        const col0Price = cleanPriceNumber(row[0]);
        if (col0Price >= 1000000 && isPurePriceString(row[0])) {
          priceVal = row[0];
        }
      }

      // Đảo lại KHI codeVal thực sự mang giá tiền (ví dụ "6.8tr", "6.800.000")
      // và priceVal không phải giá phòng hợp lý (< 1.000.000 VND)
      // Điều này xử lý các bảng có header cột bị đặt ngược (Cột A ghi "GIÁ PHÒNG" nhưng thực tế là SỐ PHÒNG)
      const priceFromCode = cleanPriceNumber(codeVal);
      const priceFromPrice = cleanPriceNumber(priceVal);
      if (priceFromCode >= 1000000 && isPurePriceString(codeVal) && priceFromPrice < 1000000) {
        const tempCode = codeVal;
        codeVal = String(priceVal).trim();
        priceVal = tempCode;
      }

      const col3Val = row[3] !== undefined ? String(row[3]).trim() : '';
      const col13Val = row[13] !== undefined ? String(row[13]).trim() : '';

      // Suy luận mã phòng từ col3 hoặc col13 nếu chưa có
      if (!codeVal) {
        if (col3Val && col3Val.length <= 15 && !col3Val.toLowerCase().includes('phòng trống') && !col3Val.toLowerCase().includes('chờ vào')) {
          codeVal = col3Val;
        } else if (col13Val && col13Val.length <= 20 && (/\d/.test(col13Val) || col13Val.toLowerCase().includes('trục')) && !col13Val.toLowerCase().includes('sđt') && !col13Val.toLowerCase().includes('link')) {
          codeVal = col13Val;
        }
      }

      // Bỏ qua các dòng không phải phòng
      if (!codeVal || codeVal.length > 15 || codeVal.toLowerCase().includes('lưu ý') || codeVal.toLowerCase().includes('số dẫn') || codeVal.toLowerCase().includes('ghi chú') || codeVal.toLowerCase().includes('link') || codeVal.toLowerCase().includes('sđt') || codeVal.toLowerCase().includes('nhà để xe') || codeVal.toLowerCase().includes('stt')) {
        continue;
      }

      const rawBldName = currentBldName || cleanSheetName;
      const targetBldName = formatStandardBuildingAddress(rawBldName);

      // Trích xuất Link Google Drive ẩn trong ô
      let roomDriveUrl: string | null = null;
      row.forEach((_, cIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r, c: cIdx });
        const cellObj = ws[cellRef];
        if (cellObj && cellObj.l && cellObj.l.Target && cellObj.l.Target.includes('drive.google.com')) {
          roomDriveUrl = cellObj.l.Target;
        }
      });

      const parsedPrice = cleanPriceNumber(priceVal);
      let parsedType = parseRoomType(typeVal);

      // Làm sạch mã phòng & loại phòng nếu dính nhau (ví dụ: "802- studio to" -> code: "802", roomType: "Studio")
      const cleanedCodeType = cleanRoomCodeAndType(codeVal, parsedType);
      codeVal = cleanedCodeType.code;
      parsedType = cleanedCodeType.roomType;

      const cleanStat = statusVal.toLowerCase().trim();
      const normStat = cleanStat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let status = 'rented';
      let roomAvailableDate: string | null = null;

      // ===== NHẬN DIỆN NGÀY THÁNG → "SẮP TRỐNG" =====
      let dateInfo = parseDateFromStatusString(cleanStat);

      // Nếu ô trạng thái không chứa ngày tháng, quét tất cả các ô còn lại trên dòng này (như Cột E, F, G...) để tìm ghi chú ngày tháng (vd: Excel date 46264, "15/8", "1/9", "KÍ LẠI 1/9"...)
      if (!dateInfo.available_date) {
        row.forEach((cell) => {
          if (cell !== undefined && cell !== null && !dateInfo.available_date) {
            const dCheck = parseDateFromStatusString(cell);
            if (dCheck.available_date) {
              dateInfo = dCheck;
            }
          }
        });
      }

      if (dateInfo.available_date) {
        roomAvailableDate = dateInfo.available_date;
        status = 'rented';
      } else if (
        normStat.includes('trong') ||
        normStat.includes('o ngay') ||
        normStat.includes('o luon') ||
        normStat.includes('san') ||
        normStat === 'available'
      ) {
        status = 'available';
      } else if (normStat.includes('giu') || normStat.includes('coc')) {
        status = 'reserved';
      }
      // Tất cả các trạng thái khác ("đã ở", "có khách", "đã thuê", rỗng "") → rented (mặc định)

      const sizeMatch = sizeVal.match(/(\d{2,3})/);
      const sizeParsed = sizeMatch ? parseInt(sizeMatch[1], 10) : 25;
      const sizeNum = (sizeParsed >= 10 && sizeParsed <= 200) ? sizeParsed : 25;

      let roomDesc = serviceVal || interiorVal || null;
      if (!roomDesc) {
        if (col13Val.toLowerCase().includes('trục')) roomDesc = col13Val;
        else if (col3Val.toLowerCase().includes('trục')) roomDesc = col3Val;
      }

      const roomObj: ParsedRoom = {
        code: codeVal,
        floor: parseFloorFromRoomCode(codeVal),
        price: parsedPrice,
        room_type: parsedType,
        size: sizeNum,
        status: status as any,
        available_date: roomAvailableDate,
        bedrooms: parsedType.includes('2N') ? 2 : 1,
        bathrooms: parsedType.includes('2WC') ? 2 : 1,
        description: roomDesc,
        drive_media_url: roomDriveUrl || null,
      };

      if (!buildingsMap.has(targetBldName)) {
        buildingsMap.set(targetBldName, {
          name: targetBldName,
          address: targetBldName,
          area: 'Đống Đa',
          drive_media_url: buildingDriveUrl,
          general_notes: globalNotes || null,
          rooms: [],
        });
      }

      const bld = buildingsMap.get(targetBldName)!;
      bld.rooms.push(roomObj);
    }
  }

  const rawBuildings = Array.from(buildingsMap.values()).filter(b => b.rooms.length > 0);
  rawBuildings.forEach(b => {
    resolveBuildingManagerRaw(b);
    const meta = buildingMetaMap.get(b.name);
    b.general_notes = buildGeneralNotesForBuilding(
      b.general_notes || '',
      meta?.dvc || '',
      meta?.internet || '',
      meta?.notes || []
    );
  });

  const buildings = rawBuildings.map(expandBuildingGrid);

  const policyRules = extractPolicyRulesFromWorkbook(wb);
  if (policyRules) {
    buildings.forEach(b => {
      b.general_notes = b.general_notes
        ? `${b.general_notes} | 📋 Quy định nhận khách: ${policyRules}`
        : `📋 Quy định nhận khách: ${policyRules}`;
    });
  }

  const totalRooms = buildings.reduce((sum, b) => sum + b.rooms.length, 0);
  if (buildings.length > 0 && totalRooms > 0) {
    return { buildings };
  }

  return null;
}

/**
 * Tải dữ liệu Google Sheet dưới dạng Text cho AI
 */
export async function fetchPublicGoogleSheetCsv(sheetUrl: string): Promise<string> {
  const sheetId = extractGoogleSheetId(sheetUrl);
  if (!sheetId) {
    throw new Error("URL Google Sheet không hợp lệ. Vui lòng kiểm tra lại đường dẫn.");
  }

  try {
    const exportXlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const res = await fetch(exportXlsxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    } as any);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

      const targetSheets = findBestSheetsToProcess(wb);
      const resultLines: string[] = [];

      for (const sheetName of targetSheets) {
        const ws = wb.Sheets[sheetName];
        if (!ws || !ws['!ref']) continue;

        const range = XLSX.utils.decode_range(ws['!ref']);
        resultLines.push(`=== TAB TRANG TÍNH (TÒA NHÀ/BẢNG HÀNG): "${sheetName}" ===`);

        for (let R = range.s.r; R <= range.e.r; ++R) {
          const rowCells: string[] = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];
            if (!cell) continue;

            let val = cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
            if (cell.l && cell.l.Target) {
              val += ` [Link Drive: ${cell.l.Target}]`;
            }
            if (val) rowCells.push(val);
          }

          if (rowCells.length > 0) {
            resultLines.push(`[Dòng ${R + 1}]: ${rowCells.join(' | ')}`);
          }
        }
      }

      if (resultLines.length > 0) {
        return resultLines.slice(0, 3000).join('\n');
      }
    }
  } catch (err: any) {
    console.warn('[Sheet Parser] XLSX export fallback to CSV:', err?.message);
  }

  const gid = extractGidFromUrl(sheetUrl) || "0";
  const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const resCsv = await fetch(exportCsvUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    next: { revalidate: 0 },
  } as any);

  if (!resCsv.ok) {
    throw new Error(`Không thể lấy dữ liệu Google Sheet (${resCsv.status}). Hãy kiểm tra lại quyền chia sẻ.`);
  }

  const rawCsvText = await resCsv.text();
  const lines = rawCsvText.split(/\r?\n/);
  const formattedLines = lines
    .map((line, idx) => {
      const cells = line
        .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
        .map((c) => c.replace(/^"|"$/g, '').trim())
        .filter((c) => c.length > 0);
      return cells.length > 0 ? `[Dòng ${idx + 1}]: ${cells.join(' | ')}` : null;
    })
    .filter(Boolean) as string[];

  return formattedLines.slice(0, 3000).join('\n');
}

/**
 * Bóc tách Google Sheet thông minh (kết hợp Programmatic Parser + AI Gemini Fallback)
 */
export async function parseGoogleSheetFull(sheetUrl: string): Promise<SheetImportResult> {
  const sheetId = extractGoogleSheetId(sheetUrl);
  if (!sheetId) {
    throw new Error("URL Google Sheet không hợp lệ. Vui lòng kiểm tra lại đường dẫn.");
  }

  // BƯỚC 1: Thử bóc tách trực tiếp bằng Programmatic Parser (Siêu nhanh & Chính xác)
  try {
    const exportXlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const res = await fetch(exportXlsxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 0 },
    } as any);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

      const parsedPolicies = parseLandlordPoliciesFromWorkbook(wb);
      const progResult = parseSheetContentProgrammatically(wb);
      if (progResult) {
        const cleanedResult = cleanAllPromoAndRewards(progResult);
        if (parsedPolicies) {
          cleanedResult.landlord_policies = parsedPolicies;
          cleanedResult.buildings.forEach((b) => {
            b.landlord_policies = parsedPolicies;
            if (parsedPolicies.closing_notes && parsedPolicies.closing_notes.length > 0) {
              const notesText = parsedPolicies.closing_notes.join(' ');
              const normNotes = cleanVietnameseString(notesText);
              if (normNotes.includes('khong nhan khach nuoi pet') || normNotes.includes('khong cho nuoi pet') || normNotes.includes('khong pet')) {
                b.allow_pet = 'Không cho nuôi';
              }
              if (normNotes.includes('khong nhan khach nuoc ngoai') || normNotes.includes('chi khach viet')) {
                b.allow_foreigners = false;
              }
              if (normNotes.includes('xe dien vinfast') || normNotes.includes('chi nhan xe dien vinfast')) {
                b.allow_vinfast_electric = true;
              }
            }
          });
        }
        const totalRooms = cleanedResult.buildings.reduce((sum, b) => sum + b.rooms.length, 0);
        console.log(`[Sheet Parser] Programmatic parser bóc tách thành công ${cleanedResult.buildings.length} tòa nhà và ${totalRooms} phòng! (Có quy định chủ nhà: ${Boolean(parsedPolicies)})`);
        return cleanedResult;
      }
    }
  } catch (err: any) {
    console.warn('[Sheet Parser] Programmatic parser fallback to AI:', err?.message);
  }

  // BƯỚC 2: Fallback sang AI Gemini nếu file có cấu trúc tự do không theo bảng tiêu chuẩn
  const csvContent = await fetchPublicGoogleSheetCsv(sheetUrl);
  const rawAiResult = await parseSheetContentWithAI(csvContent);
  return cleanAllPromoAndRewards(rawAiResult);
}

export async function parseSheetContentWithAI(csvText: string): Promise<SheetImportResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình API Key cho AI (GOOGLE_GENERATIVE_AI_API_KEY hoặc GEMINI_API_KEY).");
  }

  const googleProvider = createGoogleGenerativeAI({ apiKey });

  const systemPrompt = `Bạn là chuyên gia trích xuất dữ liệu Bất Động Sản cho thuê hàng đầu tại Việt Nam.

Nhiệm vụ: Đọc toàn bộ dữ liệu thô từ Google Sheet bên dưới và bóc tách TOÀN BỘ các Tòa Nhà, Các Phòng và LINK ẢNH GOOGLE DRIVE.

HƯỚNG DẪN BÓC TÁCH CHI TIẾT:

1. BÓC TÁCH TÒA NHÀ (CỰC KỲ QUAN TRỌNG):
   - Khi một Tab trang tính (như "Nguồn", "Bảng hàng", "Sheet1", "Tổng hợp"...) chứa nhiều tiêu đề địa chỉ / tòa nhà khác nhau (ví dụ: "24 ngách 24 ngõ Thổ Quan", "9 ngách 20 ngõ 102 Pháo Đài Láng", "3 ngách 83 ngõ 678 Đê La Thành", "SỐ 7 NGÕ 139 NGUYỄN NGỌC VŨ"...): BẮT BUỘC phải tạo từng Tòa Nhà RIÊNG BIỆT theo đúng từng tiêu đề địa chỉ đó.
   - TUYỆT ĐỐI KHÔNG gộp tất cả phòng của nhiều địa chỉ khác nhau thành 1 Tòa nhà duy nhất mang tên tab như "Nguồn", "Sheet1", "Bảng hàng"!
   - Trích xuất đầy đủ Ghi chú chung (general_notes) gồm Dịch vụ (điện, nước, mạng, vệ sinh...), Nội thất, Quy định pet... của từng Tòa nhà.

2. BÓC TÁCH TOÀN BỘ PHÒNG (BẮT BUỘC KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ PHÒNG NÀO):
   - Trong mỗi Tòa nhà, MỌI DÒNG có số phòng (như 101, 102, 201, 301, 302, 501, 601, P.201, P302, 201(fix)...) hoặc có giá thuê/diện tích ĐỀU LÀ CÁC PHÒNG.
   - BẮT BUỘC phải trích xuất TẤT CẢ các phòng xuất hiện và xếp vào đúng Tòa nhà của phòng đó.
   - "code": Mã phòng dạng Chuỗi (string), ví dụ: "101", "201", "302", "P.401".
   - "price": Giá thuê phòng số nguyên VNĐ (ví dụ: 4500000, 5000000, 8500000). Nếu ghi "5.5tr" hoặc "5tr5" thì quy đổi thành 5500000. Nếu không ghi giá thì ghi 0.
   - "room_type": Loại phòng tương ứng (Studio, 1N1K, 2N1K...).
   - "status": Nếu ghi "ở ngay", "ở luôn", "trống", "sẵn" -> "available". Nếu ghi "đã thuê", "có khách", "có người", hoặc rỗng -> "rented". Nếu có ngày cụ thể (xem mục 4) -> "rented" (kèm available_date).
   - "drive_media_url": Lưu URL Google Drive nếu có.

3. QUY ĐỔI MÃ PHÒNG DẠNG "TRỤC 0X" HOẶC "0X":
   - Nếu trong bảng có các dòng ghi mã phòng dạng "trục 01", "trục 02", "trục 03"... hoặc "01", "02", "03"... (với x là số từ 1 đến 9):
   - BẮT BUỘC quy đổi "trục 0x" hoặc "0x" thành mã phòng chuẩn dạng "20x" (ví dụ: "trục 01" / "01" -> "201", "trục 02" / "02" -> "202", "trục 03" -> "203", "trục 04" -> "204"...).

4. NHẬN DIỆN NGÀY THÁNG → "SẮP TRỐNG" (QUAN TRỌNG):
   - Nếu ô trạng thái chứa ngày tháng cụ thể như "31/7", "1/8", "July-7", "Aug 15", "15-8", "7/7/2026"... → phòng đó đang có người ở nhưng SẮP TRỐNG vào ngày đó.
   - Với trường hợp này:
     + "status" = "rented" (vẫn đang có người)
     + "available_date" = ngày đó theo định dạng ISO "YYYY-MM-DD" (ví dụ: "2026-07-31")
   - Nếu ngày đó đã qua rồi → "status" = "available", "available_date" = null.

CẢNH BÁO CỰC KỲ QUAN TRỌNG:
Mỗi Tòa nhà PHẢI CÓ danh sách các phòng trong mảng "rooms". Phải chia đúng phòng vào đúng Tòa nhà/Địa chỉ tương ứng!`;

  let lastError: any;
  for (const modelId of CANDIDATE_MODELS) {
    try {
      console.log(`[Sheet AI Parser] Running model: ${modelId}...`);
      const { object } = await generateObject({
        model: googleProvider(modelId),
        schema: SheetImportResultSchema,
        system: systemPrompt,
        prompt: `Dữ liệu các dòng đã được bóc tách link ẩn:\n\n${csvText}`,
        maxRetries: 0,
      });

      if (object && object.buildings && object.buildings.length > 0) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        object.buildings.forEach((b) => {
          if (b.rooms && Array.isArray(b.rooms)) {
            b.rooms.forEach((r) => {
              // Chuyển đổi mã phòng "trục 0x"
              const trucConverted = transformTrucRoomCode(r.code);
              if (trucConverted) {
                r.code = trucConverted;
              } else {
                r.code = String(r.code || '').trim();
              }

              r.price = cleanPriceNumber(r.price);
              r.room_type = parseRoomType(r.room_type);

              // Xử lý available_date từ AI
              if (r.available_date) {
                const parsedDate = new Date(r.available_date);
                if (isNaN(parsedDate.getTime())) {
                  r.available_date = null;
                } else if (parsedDate <= now) {
                  // Ngày đã qua → phòng đã trống
                  r.available_date = null;
                  r.status = 'available';
                }
              }

              // Kiểm tra ngày tháng trong status nếu AI chưa tách ra
              if (!r.available_date) {
                const dateFromStatus = parseDateFromStatusString(String(r.status || ''));
                if (dateFromStatus.available_date) {
                  r.available_date = dateFromStatus.available_date;
                  const parsedDate = new Date(dateFromStatus.available_date);
                  r.status = parsedDate <= now ? 'available' : 'rented';
                  if (parsedDate <= now) r.available_date = null;
                }
              }

              // Normalize status
              const cleanStatus = String(r.status || '').toLowerCase().trim();
              if (!r.available_date) {
                if (
                  cleanStatus.includes('trống') ||
                  cleanStatus.includes('sẵn') ||
                  cleanStatus.includes('luôn') ||
                  cleanStatus.includes('ngay') ||
                  cleanStatus === 'available'
                ) {
                  r.status = 'available';
                } else if (cleanStatus.includes('sửa') || cleanStatus.includes('bảo trì')) {
                  r.status = 'maintenance';
                } else if (cleanStatus.includes('giữ') || cleanStatus.includes('cọc')) {
                  r.status = 'reserved';
                } else {
                  r.status = 'rented';
                }
              }
            });
          }
        });

        object.buildings = object.buildings.map(expandBuildingGrid);

        const totalRoomsParsed = object.buildings.reduce((acc, b) => acc + (b.rooms?.length || 0), 0);
        console.log(`[Sheet AI Parser] Thành công với model ${modelId}: tìm thấy ${object.buildings.length} tòa nhà và ${totalRoomsParsed} phòng.`);
        return object;
      }
    } catch (err: any) {
      console.warn(`[Sheet AI Parser] Model ${modelId} báo lỗi: ${err?.message?.slice(0, 120)}`);
      lastError = err;
    }
  }

  throw lastError || new Error("Không thể bóc tách dữ liệu Tòa nhà từ Sheet. Vui lòng kiểm tra lại API Key hoặc hạn ngạch sử dụng.");
}
