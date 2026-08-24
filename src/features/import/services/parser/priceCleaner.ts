/**
/**
 * Chuẩn hóa và làm sạch chuỗi giá tiền từ dữ liệu Google Sheet
 */
export function cleanPriceNumber(val: any): number {
  if (typeof val === 'number') {
    if (val > 0 && val < 100) return val * 1000000;
    return val;
  }
  if (!val) return 0;
  const str = String(val).trim().toLowerCase();

  // Nếu là 2 con số 7 chữ số dính liền nhau (ví dụ "45000004700000"): Lấy con số đầu tiên (4500000)
  if (/^\d{13,15}$/.test(str)) {
    const first7 = parseInt(str.slice(0, 7), 10);
    if (first7 >= 1000000) return first7;
  }

  // Nếu là 3 hoặc 4 chữ số thuần không chứa ký tự tr, k, dot, comma (ví dụ "202", "302", "701", "503"): ĐÂY LÀ MÃ PHÒNG!
  if (/^\d{3,4}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num >= 100 && num <= 999) return 0;
  }

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
  if (!digitsOnly) return 0;

  const parsed = parseInt(digitsOnly, 10);
  if (isNaN(parsed) || parsed <= 0) return 0;

  if (parsed < 100) return parsed * 1000000;
  return parsed;
}

/**
 * Kiểm tra xem chuỗi có phải duy nhất là Giá thuê hay không (ví dụ "4.800.000", "5.5tr", "500k")
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
