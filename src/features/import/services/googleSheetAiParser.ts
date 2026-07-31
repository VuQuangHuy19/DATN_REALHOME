import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { parseRoomType, RoomType } from '@/src/lib/constants/roomTypes';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Helper to parse messy price strings like "5.5tr", "5tr5", "4.800.000", "5,500,000", "5500000" to number
export function cleanPriceNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).toLowerCase().trim();
  if (!str) return 0;

  // Match "4tr800", "4tr8", "5tr5"
  const trSubMatch = str.match(/(\d+)\s*(?:tr|triệu|trieu)\s*(\d+)/);
  if (trSubMatch) {
    const main = parseInt(trSubMatch[1], 10);
    let subStr = trSubMatch[2];
    if (subStr.length === 1) subStr = subStr + '00000';
    else if (subStr.length === 2) subStr = subStr + '0000';
    else if (subStr.length === 3) subStr = subStr + '000';
    const sub = parseInt(subStr, 10);
    return main * 1000000 + sub;
  }

  // Match "5.5tr", "5,5 tr"
  const trMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu)/);
  if (trMatch) {
    const num = parseFloat(trMatch[1].replace(',', '.'));
    return Math.round(num * 1000000);
  }

  // Match "500k", "500 k"
  const kMatch = str.match(/(\d+(?:[.,]\d+)?)\s*k/);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    return Math.round(num * 1000);
  }

  const digitsOnly = str.replace(/[^\d]/g, '');
  const parsed = parseInt(digitsOnly, 10);
  if (isNaN(parsed) || parsed <= 0) return 0;

  if (parsed < 100) return parsed * 1000000;
  if (parsed >= 100 && parsed < 100000) return parsed * 1000;
  return parsed;
}

/**
 * Kiểm tra xem chuỗi có phải duy nhất là Giá thuê hay không (ví dụ "4.800.000", "5.5tr", "500k")
 * Tránh nhầm lẫn địa chỉ có số (như "24 ngách 24", "196 Trần Duy Hưng") thành Giá tiền.
 */
export function isPurePriceString(val: any): boolean {
  if (typeof val === 'number') return true;
  if (!val) return false;
  const str = String(val).toLowerCase().trim();
  if (!str) return false;

  // Nếu chứa các từ chỉ địa chỉ, chắc chắn không phải giá tiền thuần
  if (/(ngõ|ngách|hẻm|đường|phố|quận|phường|nhà|tòa|bàn|trục|thổ quan|láng|yên hoà|cẩm văn|đê la thành|nguyễn ngọc vũ)/i.test(str)) {
    return false;
  }

  // Nếu chứa nhiều ký tự chữ ngoài k/tr/triệu
  const nonDigitWords = str.replace(/[\d.,\s\-\+\*\/k|tr|triệu|trieu]/gi, '');
  if (nonDigitWords.length > 2) return false;

  const isPure = /^(\d+(?:[.,]\d+)?\s*(?:tr|triệu|trieu|k)?|\d{1,3}(?:[.,]\d{3})+)$/i.test(str);
  return isPure;
}

/**
 * Nhận diện xem một ô có phải là Tiêu đề Tòa nhà / Địa chỉ mới hay không
 */
export function isBuildingHeader(val: any): boolean {
  if (!val) return false;
  const str = String(val).trim();
  if (str.length < 4) return false;

  const lower = str.toLowerCase();
  const IGNORE = [
    'full đồ', 'phòng trống', 'chờ vào', 'còn trống', 'đã hết', 'lưu ý', 'ghi chú',
    'dịch vụ', 'link ảnh', 'sđt', 'stt', 'giá phòng', 'loại phòng', 'diện tích',
    'tình trạng', 'trạng thái', 'thanh toán', 'internet', 'dvc', 'danh sách', 'bảng hàng'
  ];

  if (IGNORE.some(kw => lower.includes(kw))) return false;
  if (isPurePriceString(str)) return false;

  // Tiêu đề địa chỉ thường chứa các từ địa danh hoặc chứa chữ & số có độ dài vừa đủ
  if (/(ngõ|ngách|hẻm|đường|phố|quận|phường|nhà|tòa|bù|cơ sở|phân khu)/i.test(lower)) return true;
  if (str.length >= 8 && /[a-zA-Zàáảãạăắằẳẵặânấầnẩẫậnèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(str)) return true;

  return false;
}

export function parseFloorFromRoomCode(code: string): number {
  const clean = String(code).trim();
  const match = clean.match(/^P?\.?\s*(\d{1,4})/i) || clean.match(/(\d{1,4})/);
  if (match) {
    const numOnly = parseInt(match[1], 10);
    if (!isNaN(numOnly) && numOnly > 0) {
      if (numOnly >= 100) return Math.floor(numOnly / 100);
      return numOnly;
    }
  }
  return 1;
}

export function cleanRoomCodeAndType(rawCode: string, currentType: string): { code: string; roomType: RoomType } {
  let code = String(rawCode || '').trim();
  let roomType = currentType || 'Studio';

  if (code.includes('_') || code.includes('-')) {
    const parts = code.split(/[_|-]/).map(p => p.trim());
    if (parts.length >= 2) {
      const firstPart = parts[0];
      const secondPart = parts.slice(1).join(' ');
      if (/^\d{1,4}$/.test(firstPart) || /^P?\d{1,4}$/i.test(firstPart)) {
        code = firstPart;
        roomType = parseRoomType(secondPart);
      }
    }
  }

  return { code, roomType: parseRoomType(roomType) };
}

/**
 * Chuyển đổi các mã phòng dạng "trục 0x" hoặc "0x" thành mã phòng chuẩn "20x"
 * Ví dụ: "trục 01" / "01" -> "201", "trục 02" / "02" -> "202", "trục 03" -> "203"
 */
export function transformTrucRoomCode(codeStr: string): string | null {
  if (!codeStr) return null;
  const clean = String(codeStr).trim().toLowerCase();

  const match = clean.match(/^(?:trục\s*)?0?([1-9]\d?)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0 && num < 100) {
      return (200 + num).toString();
    }
  }

  return null;
}

/**
 * Phân tích chuỗi ngày tháng từ trạng thái phòng (vd: "31/7", "July-7", "7/7/2026")
 * Dùng để nhận biết phòng "sắp trống" với ngày có thể vào ở cụ thể.
 */
export function parseDateFromStatusString(statusStr: string): {
  available_date: string | null;
  is_within_30_days: boolean;
} {
  if (!statusStr) return { available_date: null, is_within_30_days: false };
  const str = statusStr.toLowerCase().trim();
  const currentYear = new Date().getFullYear();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Pattern 1: dd/mm, dd-mm, d/m (có thể có năm: dd/mm/yyyy)
  const dmPattern = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
  const dmMatch = str.match(dmPattern);
  if (dmMatch) {
    let day = parseInt(dmMatch[1]);
    let month = parseInt(dmMatch[2]);
    const yearRaw = dmMatch[3];
    let year = yearRaw
      ? parseInt(yearRaw.length === 2 ? '20' + yearRaw : yearRaw)
      : currentYear;

    // Hoán đổi nếu tháng > 12 (format mm/dd)
    if (month > 12 && day <= 12) { [day, month] = [month, day]; }

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        const diffDays = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Nếu ngày đã qua nhiều hơn 60 ngày và không có năm rõ ràng → thử năm sau
        if (diffDays < -60 && !yearRaw) {
          dateObj.setFullYear(currentYear + 1);
        }
        const finalDiff = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = dateObj.toISOString().split('T')[0];
        return { available_date: dateStr, is_within_30_days: finalDiff >= -1 && finalDiff <= 30 };
      }
    }
  }

  // Pattern 2: "July-7", "Jul 7", "Aug 15"
  const monthNames: Record<string, number> = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
    'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
  };

  for (const [name, monthNum] of Object.entries(monthNames)) {
    const regex = new RegExp(`${name}[\\s\\-\\/]*(\\d{1,2})`, 'i');
    const m = str.match(regex);
    if (m) {
      const day = parseInt(m[1]);
      if (day >= 1 && day <= 31) {
        const dateObj = new Date(currentYear, monthNum - 1, day);
        const diffDays = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < -60) dateObj.setFullYear(currentYear + 1);
        const finalDiff = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = dateObj.toISOString().split('T')[0];
        return { available_date: dateStr, is_within_30_days: finalDiff >= -1 && finalDiff <= 30 };
      }
    }
  }

  return { available_date: null, is_within_30_days: false };
}

/**
 * Tự động nhân bản/triển khai ma trận phòng (Building Grid Expansion x0y)
 * Khi xuất hiện các ô "trục 01", "trục 02", "trục 03"... hoặc "01", "02"...
 * Hệ thống tự phát hiện số tầng tối đa và triển khai toàn bộ các phòng còn thiếu
 */
export function expandBuildingGrid(bld: ParsedBuilding): ParsedBuilding {
  if (!bld.rooms || bld.rooms.length === 0) return bld;

  let maxFloor = 1;
  const explicitRooms: ParsedRoom[] = [];
  const trucEntries: { axis: number; price: number; description?: string | null; drive_media_url?: string | null }[] = [];

  bld.rooms.forEach(r => {
    const cleanCode = r.code.trim().toLowerCase();
    const cleanDesc = (r.description || '').trim().toLowerCase();

    const matchCode = cleanCode.match(/^(?:trục\s*)?0?([1-9]\d?)$/i) || cleanCode.match(/^0([1-9]\d?)$/);
    const matchDesc = cleanDesc.match(/(?:trục\s*)0?([1-9]\d?)/i);

    let axis: number | null = null;
    if (matchCode) {
      axis = parseInt(matchCode[1], 10);
    } else if (matchDesc) {
      axis = parseInt(matchDesc[1], 10);
    }

    if (axis !== null && !isNaN(axis) && axis > 0 && axis < 100) {
      trucEntries.push({ axis, price: r.price, description: r.description, drive_media_url: r.drive_media_url });
      if (!matchCode) {
        if (r.floor > maxFloor && r.floor < 25) maxFloor = r.floor;
        explicitRooms.push(r);
      }
      return;
    }

    if (r.floor > maxFloor && r.floor < 25) {
      maxFloor = r.floor;
    }
    explicitRooms.push(r);
  });

  if (trucEntries.length === 0) {
    return bld;
  }

  if (maxFloor < 2) maxFloor = 5;

  const roomMap = new Map<string, ParsedRoom>();
  explicitRooms.forEach(r => {
    roomMap.set(r.code, r);
  });

  const hasFloor1 = explicitRooms.some(r => r.code.startsWith('1') || r.floor === 1);
  const startFloor = hasFloor1 ? 2 : 1;

  trucEntries.forEach(t => {
    const axisStr = t.axis.toString().padStart(2, '0');
    for (let f = startFloor; f <= maxFloor; f++) {
      const code = `${f}${axisStr}`;
      if (!roomMap.has(code)) {
        const newRoom: ParsedRoom = {
          code,
          floor: f,
          price: t.price > 0 ? t.price : 0,
          room_type: parseRoomType(null),
          size: 25,
          status: t.price > 0 ? 'available' : 'rented',
          bedrooms: 1,
          bathrooms: 1,
          description: t.description || null,
          drive_media_url: t.drive_media_url || bld.drive_media_url || null,
        };
        roomMap.set(code, newRoom);
      }
    }
  });

  const sortedRooms = Array.from(roomMap.values()).sort((a, b) => a.floor - b.floor || a.code.localeCompare(b.code));
  bld.rooms = sortedRooms;
  return bld;
}

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
});

export const ParsedBuildingSchema = z.object({
  name: z.string().describe("Tên tòa nhà hoặc địa chỉ (ví dụ: 196 Trần Duy Hưng, 139 Nguyễn Ngọc Vũ, 562 Đường Láng...)"),
  address: z.string().nullable().optional(),
  area: z.string().default("Đống Đa"),
  general_notes: z.string().nullable().optional(),
  electricity_price: z.string().nullable().optional(),
  water_price: z.string().nullable().optional(),
  drive_media_url: z.string().nullable().optional().describe("Link Google Drive folder ảnh chung của tòa nhà"),
  rooms: z.array(ParsedRoomSchema).default([]).describe("Danh sách TOÀN BỘ các phòng thuộc tòa nhà này"),
});

export const SheetImportResultSchema = z.object({
  buildings: z.array(ParsedBuildingSchema).describe("Danh sách các Tòa nhà và toàn bộ phòng bóc tách được"),
});

export type ParsedRoom = z.infer<typeof ParsedRoomSchema>;
export type ParsedBuilding = z.infer<typeof ParsedBuildingSchema>;
export type SheetImportResult = z.infer<typeof SheetImportResultSchema>;

export function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function extractGidFromUrl(url: string): string | null {
  const match = url.match(/[?&]gid=([0-9]+)/);
  return match ? match[1] : null;
}

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

  return notes || null;
}

/**
 * Trích xuất toàn bộ Bảng hàng, Tòa nhà, Link Drive ảnh, Nội thất, Dịch vụ cực nhanh
 * Hỗ trợ: nhiều tòa nhà trong 1 tab, nhận diện ngày tháng → "sắp trống"
 */
export function parseSheetContentProgrammatically(wb: XLSX.WorkBook): SheetImportResult | null {
  const buildingsMap = new Map<string, ParsedBuilding>();
  const buildingMetaMap = new Map<string, { dvc: string; internet: string; notes: string[] }>();
  const targetSheets = findBestSheetsToProcess(wb);
  let globalNotes = '';

  for (const sheetName of targetSheets) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (!rows || rows.length === 0) continue;

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

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;
      row.forEach((cell, cIdx) => {
        const cStr = String(cell || '').toLowerCase().trim();
        if (cStr.includes('tòa nhà') || cStr.includes('tên tòa') || cStr.includes('địa chỉ') || cStr === 'tòa') bldCol = cIdx;
        else if (cStr.includes('số phòng') || cStr.includes('mã phòng') || cStr.includes('phòng trống') || cStr === 'phòng') codeCol = cIdx;
        else if (cStr.includes('giá phòng') || cStr.includes('giá thuê') || cStr === 'giá') priceCol = cIdx;
        else if (cStr.includes('loại phòng') || cStr === 'loại') typeCol = cIdx;
        else if (cStr.includes('diện tích')) sizeCol = cIdx;
        else if (cStr.includes('tình trạng') || cStr.includes('trạng thái')) statusCol = cIdx;
        else if (cStr === 'dvc' || cStr.includes('dịch vụ chung')) dvcCol = cIdx;
        else if (cStr.includes('internet') || cStr.includes('mạng')) internetCol = cIdx;
        else if (cStr.includes('nội thất')) interiorCol = cIdx;
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

      // Tự động nhận diện Tòa nhà mới nếu ô thỏa mãn isBuildingHeader
      const potentialBldHeader = (bldVal && isBuildingHeader(bldVal) ? bldVal : '') ||
        (col1Val && isBuildingHeader(col1Val) ? col1Val : '') ||
        (col2Val && isBuildingHeader(col2Val) ? col2Val : '') ||
        (col0Val && isBuildingHeader(col0Val) ? col0Val : '');

      if (potentialBldHeader) {
        currentBldName = potentialBldHeader;
        currentBldSpecificNotes = [];
        currentBldDvc = '';
        currentBldInternet = '';
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
          const existingBld = buildingsMap.get(currentBldName);
          if (existingBld) {
            const noteTag = `💡 Ghi chú riêng: ${noteCandidate}`;
            if (!existingBld.general_notes) {
              existingBld.general_notes = noteTag;
            } else if (!existingBld.general_notes.includes(noteCandidate)) {
              existingBld.general_notes = `${existingBld.general_notes} | ${noteTag}`;
            }
          }
        }
        continue;
      }

      // Đảo lại nếu tiêu đề cột bị ghi ngược (codeVal mang giá tiền)
      const priceFromCode = cleanPriceNumber(codeVal);
      const priceFromPrice = cleanPriceNumber(priceVal);
      if (priceFromCode >= 500000 && priceFromPrice < 10000) {
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

      const targetBldName = currentBldName || cleanSheetName;

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
      let status = 'rented';
      let roomAvailableDate: string | null = null;

      // ===== NHẬN DIỆN NGÀY THÁNG → "SẮP TRỐNG" =====
      // Nếu ô trạng thái chứa ngày cụ thể (31/7, July-7,...) → phòng đang có người nhưng sắp ra
      const dateInfo = parseDateFromStatusString(cleanStat);
      if (dateInfo.available_date) {
        roomAvailableDate = dateInfo.available_date;
        const parsedDate = new Date(dateInfo.available_date);
        const nowCheck = new Date();
        nowCheck.setHours(0, 0, 0, 0);
        if (parsedDate <= nowCheck) {
          // Ngày đã qua → phòng đã trống
          status = 'available';
          roomAvailableDate = null;
        } else {
          // Còn đang thuê nhưng có ngày ra cụ thể → rented + available_date cho hệ thống "sắp trống"
          status = 'rented';
        }
      } else if (
        cleanStat.includes('trống') ||
        cleanStat.includes('ở ngay') ||
        cleanStat.includes('ở luôn') ||
        cleanStat.includes('sẵn') ||
        cleanStat === 'available'
      ) {
        status = 'available';
      } else if (cleanStat.includes('giữ') || cleanStat.includes('cọc')) {
        status = 'reserved';
      }
      // Tất cả các trạng thái khác ("có khách", "đã thuê", "có người", rỗng...) → rented (mặc định)

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
    const meta = buildingMetaMap.get(b.name);
    b.general_notes = buildGeneralNotesForBuilding(
      globalNotes,
      meta?.dvc || '',
      meta?.internet || '',
      meta?.notes || []
    );
  });

  const buildings = rawBuildings.map(expandBuildingGrid);
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

      const progResult = parseSheetContentProgrammatically(wb);
      if (progResult) {
        const totalRooms = progResult.buildings.reduce((sum, b) => sum + b.rooms.length, 0);
        console.log(`[Sheet Parser] Programmatic parser bóc tách thành công ${progResult.buildings.length} tòa nhà và ${totalRooms} phòng!`);
        return progResult;
      }
    }
  } catch (err: any) {
    console.warn('[Sheet Parser] Programmatic parser fallback to AI:', err?.message);
  }

  // BƯỚC 2: Fallback sang AI Gemini nếu file có cấu trúc tự do không theo bảng tiêu chuẩn
  const csvContent = await fetchPublicGoogleSheetCsv(sheetUrl);
  return await parseSheetContentWithAI(csvContent);
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
