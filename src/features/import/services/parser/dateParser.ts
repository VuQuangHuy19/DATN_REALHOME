/**
 * Phân tích chuỗi ngày tháng từ trạng thái phòng (vd: "31/7", "July-7", "7/7/2026")
 * Dùng để nhận biết phòng "sắp trống" với ngày có thể vào ở cụ thể.
 */
export function parseDateFromStatusString(statusStr: any): {
  available_date: string | null;
  is_within_30_days: boolean;
} {
  if (statusStr === undefined || statusStr === null || statusStr === '') {
    return { available_date: null, is_within_30_days: false };
  }

  const currentYear = new Date().getFullYear();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Support Excel date serial numbers (e.g. 46255 for 20/08/2026, range 40000..60000)
  const numVal = typeof statusStr === 'number' ? statusStr : parseFloat(String(statusStr).trim());
  if (!isNaN(numVal) && numVal >= 40000 && numVal <= 60000 && numVal % 1000 !== 0 && (typeof statusStr === 'number' || /^\d{5}$/.test(String(statusStr).trim()))) {
    const utcDays = numVal - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const dateObj = new Date(utcValue);
    if (!isNaN(dateObj.getTime())) {
      const diffDays = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const dateStr = dateObj.toISOString().split('T')[0];
      return { available_date: dateStr, is_within_30_days: diffDays >= -1 && diffDays <= 30 };
    }
  }

  const str = String(statusStr).toLowerCase().trim();
  const normStr = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Loại bỏ các trường hợp chuỗi chứa từ khóa tầng/phòng/dãy số phòng (vd: "Tầng 1-2-3-4-", "Tầng 5-6-7")
  // Ngoại trừ khi chuỗi có dấu gạch chéo '/' hoặc các từ khóa rõ ràng về thời gian (bàn giao, ở từ...)
  if (/tầng|tang|phong|phòng|stt|khu/i.test(normStr) && !/[\/]/ .test(normStr) && !/ngay|ngày|thang|tháng|sap|sắp|ban giao|bàn giao|vào ở|vao o|chuyen|chuyển/i.test(normStr)) {
    return { available_date: null, is_within_30_days: false };
  }

  // Pattern A: "Cuối tháng" / "Cuối tháng này" -> Ngày cuối cùng của tháng hiện tại
  if (normStr.includes('cuoi thang')) {
    const endOfMonthObj = new Date(currentYear, now.getMonth() + 1, 0);
    const dateStr = endOfMonthObj.toISOString().split('T')[0];
    const diffDays = Math.floor((endOfMonthObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { available_date: dateStr, is_within_30_days: diffDays >= -1 && diffDays <= 30 };
  }

  // Pattern B: "Đầu tháng" / "Đầu tháng sau" -> Ngày 1 của tháng tiếp theo
  if (normStr.includes('dau thang')) {
    const startNextMonthObj = new Date(currentYear, now.getMonth() + 1, 1);
    const dateStr = startNextMonthObj.toISOString().split('T')[0];
    const diffDays = Math.floor((startNextMonthObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { available_date: dateStr, is_within_30_days: diffDays >= -1 && diffDays <= 30 };
  }

  // Pattern C: "Giữa tháng" -> Ngày 15 của tháng hiện tại
  if (normStr.includes('giua thang')) {
    const midMonthObj = new Date(currentYear, now.getMonth(), 15);
    const dateStr = midMonthObj.toISOString().split('T')[0];
    const diffDays = Math.floor((midMonthObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { available_date: dateStr, is_within_30_days: diffDays >= -1 && diffDays <= 30 };
  }

  // Pattern 1: dd/mm, dd-mm, d/m (có thể có năm: dd/mm/yyyy)
  const dmPattern = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
  const dmMatch = str.match(dmPattern);
  if (dmMatch) {
    const rawMatchStr = dmMatch[0];
    const isSlash = rawMatchStr.includes('/');
    const yearRaw = dmMatch[3];

    // Nếu yearRaw có độ dài 1 hoặc 3 ký tự (ví dụ từ "1-2-3-4" hay "5-6-7" -> yearRaw là "3" hay "7"), không phải là năm hợp lệ!
    if (yearRaw && (yearRaw.length === 1 || yearRaw.length === 3)) {
      return { available_date: null, is_within_30_days: false };
    }

    // Nếu dùng dấu gạch ngang '-' mà không có '/' và cũng không có năm 2/4 chữ số -> Bắt buộc phải có từ khóa thời gian
    if (!isSlash && !yearRaw) {
      const hasDateKw = /ngay|ngày|thang|tháng|sap|sắp|ban giao|bàn giao|vào ở|vao o|chuyen|chuyển/i.test(normStr);
      if (!hasDateKw) {
        return { available_date: null, is_within_30_days: false };
      }
    }

    let day = parseInt(dmMatch[1]);
    let month = parseInt(dmMatch[2]);
    let year = yearRaw
      ? parseInt(yearRaw.length === 2 ? '20' + yearRaw : yearRaw)
      : currentYear;

    // Hoán đổi nếu tháng > 12 (format mm/dd)
    if (month > 12 && day <= 12) { [day, month] = [month, day]; }

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        const diffDays = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Chỉ đẩy sang năm sau nếu ngày đã qua hơn 90 ngày VÀ không có năm rõ ràng
        if (diffDays < -90 && !yearRaw) {
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
        if (diffDays < -90) dateObj.setFullYear(currentYear + 1);
        const finalDiff = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = dateObj.toISOString().split('T')[0];
        return { available_date: dateStr, is_within_30_days: finalDiff >= -1 && finalDiff <= 30 };
      }
    }
  }

  return { available_date: null, is_within_30_days: false };
}
