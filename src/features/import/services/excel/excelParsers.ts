import * as XLSX from 'xlsx';

// Helper to parse service prices (e.g. "100k/phòng", "200k/người", "150.000") to numeric values
export const parseServicePrice = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).toLowerCase().trim();
  if (!str) return 0;
  
  const match = str.match(/(\d+(?:\.\d+)?)\s*k/);
  if (match) {
    const num = Number(match[1].replace(/\./g, ''));
    return num * 1000;
  }
  
  const digitsOnly = str.replace(/[^\d]/g, '');
  return Number(digitsOnly) || 0;
};

// Helper to parse room type abbreviations like 2n1k or studio
export const parseRoomType = (typeStr: string): string => {
  const clean = typeStr.trim().toLowerCase();
  if (clean === 'studio') return 'Studio';
  if (clean === '2n1k') return '2N - 1K - 1WC';
  if (clean === '1n1k') return '1N - 1K - 1WC';
  if (clean === '3n1k') return '3N - 1K - 1WC';
  if (clean === 'gác xép' || clean === 'gac xep') return 'Gác xép';
  if (clean === 'duplex') return 'Duplex';
  
  // Dynamic matching of XnYk format
  const match = clean.match(/^(\d+)n(\d+)k$/);
  if (match) {
    return `${match[1]}N - ${match[2]}K - 1WC`;
  }
  
  // Default fallback: capitalize first letter
  return typeStr.trim().charAt(0).toUpperCase() + typeStr.trim().slice(1);
};

// Helper to parse size/area safely from inputs like "25", "25m2", "25.5 m2", "30,5m²"
export const parseSize = (sizeVal: any): number | null => {
  if (sizeVal === null || sizeVal === undefined) return null;
  if (typeof sizeVal === 'number') return sizeVal;
  
  const cleanStr = String(sizeVal).trim().replace(',', '.');
  const match = cleanStr.match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

// Helper to parse deposit terms and map abbreviations like "1 cọc 1" to "đóng 1 cọc 1"
export const parseDepositTerms = (val: any): string => {
  if (val === null || val === undefined) return 'đóng 1 cọc 1';
  const str = String(val).toLowerCase().trim();
  if (!str) return 'đóng 1 cọc 1';
  
  if (str === '1 cọc 1' || str === '1 coc 1' || str.includes('1 cọc 1') || str.includes('1 coc 1')) {
    return 'đóng 1 cọc 1';
  }
  return String(val).trim();
};

// Helper to normalize area/size texts like "25m2" or "25 m2" to "25 m²"
export const normalizeAreaText = (text: any): string => {
  if (text === null || text === undefined) return '';
  return String(text).replace(/(\d+(?:[.,]\d+)?)\s*(?:m2|m\^2|m²|M2)/gi, '$1 m²');
};

// Helper to parse floor number from room code (e.g. 302 -> 3, 1205 -> 12, P501 -> 5)
export const parseFloorFromRoomCode = (code: string): number => {
  const clean = code.trim();
  const numOnly = Number(clean.replace(/[^\d]/g, ''));
  if (!isNaN(numOnly) && numOnly > 0) {
    if (numOnly >= 100) {
      return Math.floor(numOnly / 100);
    }
    return numOnly;
  }
  return 1; // fallback
};

// Helper to generate building code (e.g. "ngõ 24 Thổ Quan" -> "24TQ")
export const generateBuildingCode = (address: string): string => {
  const clean = address.trim();
  if (!clean) return 'TN-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const lower = clean.toLowerCase();
  let afterNgo = clean;
  const ngoIdx = lower.indexOf('ngõ');
  if (ngoIdx !== -1) {
    afterNgo = clean.slice(ngoIdx + 3).trim();
  } else {
    const ngachIdx = lower.indexOf('ngách');
    if (ngachIdx !== -1) {
      afterNgo = clean.slice(ngachIdx + 5).trim();
    }
  }

  // Split by common dividers to focus on the street name
  const streetPart = afterNgo.split(/[-–,.(]/)[0].trim();

  // Extract first number from the address (e.g. 24 or 102 or 678)
  const numMatch = clean.match(/\d+/);
  const numberStr = numMatch ? numMatch[0] : '';

  // Remove numbers and punctuation to isolate words
  const textOnly = streetPart.replace(/\d+/g, '').replace(/[-.,()]/g, ' ');
  const words = textOnly.split(/\s+/).filter(w => w && isNaN(Number(w)));

  // Get initials, normalize accents
  const initials = words
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D');

  const code = `${numberStr}${initials}`.toUpperCase().trim();
  return code || 'TN-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

// Helper to generate building name starting from "Ngõ" or "Ngách"
export const generateBuildingName = (address: string): string => {
  const clean = address.trim();
  const lower = clean.toLowerCase();
  const ngoIdx = lower.indexOf('ngõ');
  if (ngoIdx !== -1) {
    return 'Ngõ ' + clean.slice(ngoIdx + 3).trim();
  }
  const ngachIdx = lower.indexOf('ngách');
  if (ngachIdx !== -1) {
    return 'Ngách ' + clean.slice(ngachIdx + 5).trim();
  }
  return clean;
};

// Helper to generate landlord code (e.g. "Võ Quang Huy" -> "CN-VOQUANGHUY")
export const generateLandlordCode = (name: string): string => {
  const clean = name.trim();
  if (!clean) return 'CN-HE_THONG';
  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '')
    .toUpperCase();
  return `CN-${normalized}`;
};

// Helper to parse date from string like "10/7", "31/7", "10-7" or "7-Oct"
export const parseSoonDate = (statusStr: string): string | null => {
  const clean = statusStr.trim();
  if (!clean) return null;

  // Matches Excel serial date numbers (e.g. 46302)
  const serialNum = Number(clean);
  if (!isNaN(serialNum) && serialNum > 30000 && serialNum < 60000) {
    const dateObj = new Date((serialNum - 25569) * 86400 * 1000);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Matches e.g. "31/7", "31-7", "31/07", "31/7/2026", "31-7-2026"
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{4}))?$/;
  const match = clean.match(dateRegex);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = match[4] ? Number(match[4]) : new Date().getFullYear();
    
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  // Matches e.g. "7-Oct", "10-Jul"
  const parsedTime = Date.parse(clean);
  if (!isNaN(parsedTime)) {
    const dateObj = new Date(parsedTime);
    const year = dateObj.getFullYear() || new Date().getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
};

// Helper to extract hyperlink URL from a cell (even if display text is custom)
export const getCellHyperlink = (ws: XLSX.WorkSheet, rowIdx: number, colIdx: number): string | null => {
  const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
  const cell = ws[cellRef];
  if (cell && cell.l && cell.l.Target) {
    return cell.l.Target;
  }
  return null;
};

// Helper to parse latitude and longitude from string
export const parseLocation = (val: any): { lat: number | null; lng: number | null } => {
  if (!val) return { lat: null, lng: null };
  const str = String(val).trim();
  // Google Maps URL with @lat,lng
  const urlMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    return { lat: Number(urlMatch[1]), lng: Number(urlMatch[2]) };
  }
  // Direct coordinate: "21.028511, 105.804817"
  const coordMatch = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (coordMatch) {
    return { lat: Number(coordMatch[1]), lng: Number(coordMatch[2]) };
  }
  return { lat: null, lng: null };
};
