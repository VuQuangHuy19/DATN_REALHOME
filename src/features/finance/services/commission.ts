/**
 * Commission calculation service
 *
 * Tập trung logic tính hoa hồng sale cho hợp đồng thuê/đặt cọc.
 * Được extract từ app/admin/contracts/page.tsx để tái sử dụng và dễ test.
 */

/**
 * Tính số tháng của hợp đồng từ ngày bắt đầu và ngày kết thúc.
 * Trả về 12 làm giá trị mặc định nếu thiếu hoặc sai ngày.
 */
export function getContractTermMonths(
  startDateStr?: string | null,
  endDateStr?: string | null
): number {
  if (!startDateStr || !endDateStr) return 12; // default fallback
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 12;

  const yearsDiff = end.getFullYear() - start.getFullYear();
  const monthsDiff = end.getMonth() - start.getMonth();
  const totalMonths = yearsDiff * 12 + monthsDiff;
  return Math.max(1, Math.round(totalMonths));
}

/**
 * Parse chuỗi tỷ lệ hoa hồng (roseStr) và thời hạn hợp đồng.
 * Tách phần "parse" ra khỏi phần "tính toán" để dễ test và lưu DB.
 *
 * @param roseStr - Chuỗi mô tả hoa hồng, ví dụ: "5%", "1 tháng", "6 tháng: 50%, 12 tháng: 80%"
 * @param termMonths - Thời hạn hợp đồng (số tháng) để chọn mức phù hợp
 * @returns Object mô tả loại và giá trị tỷ lệ hoa hồng
 */
export function parseCommissionRate(
  roseStr: string,
  termMonths: number
): { rateType: 'percent' | 'month' | 'fixed'; rateValue: number } {
  const clean = roseStr.trim();
  if (!clean) return { rateType: 'fixed', rateValue: 0 };

  // Smart parser: chọn mức phù hợp theo thời hạn hợp đồng
  // Tách text bằng dấu phẩy, chấm phẩy hoặc xuống dòng
  const parts = clean.split(/[,;\n]/);
  let targetRateStr = clean;

  if (parts.length > 1) {
    const candidates: { months: number; valueStr: string }[] = [];
    for (const part of parts) {
      // Tìm số tháng trong từng mệnh đề (vd: "6 tháng", "6th", "hđ 6")
      const monthMatch =
        part.match(/(\d+)\s*(?:tháng|thang|th|t|m|months?)/i) ||
        part.match(/(?:hđ|hd|hợp đồng)\s*(\d+)/i);
      const months = monthMatch ? parseInt(monthMatch[1], 10) : null;

      let ratePart = part;
      if (monthMatch) {
        ratePart = part.replace(monthMatch[0], '');
      }

      // Tìm phần trăm hoặc số tháng trong mệnh đề
      const pctMatch = ratePart.match(/(\d+(?:\.\d+)?)\s*%/);
      const multMatch = ratePart.match(/(\d+(?:\.\d+)?)\s*(?:tháng|thang|th|t)/i);

      let valStr = '';
      if (pctMatch) {
        valStr = pctMatch[0];
      } else if (multMatch) {
        valStr = multMatch[0];
      } else {
        const fallbackMatch = ratePart.match(/(\d+(?:\.\d+)?\s*%?)/);
        if (fallbackMatch) {
          valStr = fallbackMatch[1].trim();
        }
      }

      if (months !== null && valStr) {
        candidates.push({ months, valueStr: valStr });
      }
    }

    if (candidates.length > 0) {
      // Chọn candidate gần termMonths nhất
      candidates.sort((a, b) => a.months - b.months);
      let bestMatch = candidates[0];
      let minDiff = Math.abs(candidates[0].months - termMonths);
      for (const cand of candidates) {
        const diff = Math.abs(cand.months - termMonths);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = cand;
        } else if (diff === minDiff && cand.months <= termMonths) {
          bestMatch = cand;
        }
      }
      targetRateStr = bestMatch.valueStr;
    }
  }

  // Parse chuỗi tỷ lệ đã chọn
  const cleanTarget = targetRateStr.toLowerCase().trim();

  if (cleanTarget.includes('%')) {
    const num = parseFloat(cleanTarget.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) return { rateType: 'percent', rateValue: num };
  }

  if (cleanTarget.includes('tháng') || cleanTarget.includes('thang')) {
    const num = parseFloat(cleanTarget.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) return { rateType: 'month', rateValue: num };
  }

  const num = parseFloat(cleanTarget);
  if (!isNaN(num)) {
    // Nếu > 1: coi như phần trăm; <= 1: coi như hệ số nhân cố định
    return num > 1
      ? { rateType: 'percent', rateValue: num }
      : { rateType: 'fixed', rateValue: num };
  }

  return { rateType: 'fixed', rateValue: 0 };
}

/**
 * Tính số tiền hoa hồng từ giá phòng, chuỗi "rose" và thời hạn hợp đồng.
 *
 * Hỗ trợ các format:
 * - "5%"                          → 5% × price
 * - "1 tháng"                     → 1 × price
 * - "6 tháng: 50%, 12 tháng: 80%" → chọn mức phù hợp theo termMonths
 * - Chuỗi rỗng / null             → 0
 *
 * @param price      - Giá phòng (VND/tháng)
 * @param roseStr    - Chuỗi mô tả hoa hồng từ DB (trường `rose` của room)
 * @param termMonths - Thời hạn hợp đồng (số tháng), mặc định 12
 */
export function calculateCommissionAmount(
  price: number,
  roseStr?: string | null,
  termMonths: number = 12
): number {
  if (!roseStr) return 0;
  const clean = roseStr.trim();
  if (!clean) return 0;

  const { rateType, rateValue } = parseCommissionRate(clean, termMonths);

  switch (rateType) {
    case 'percent':
      return price * (rateValue / 100);
    case 'month':
      return price * rateValue;
    case 'fixed':
      return price * rateValue;
    default:
      return 0;
  }
}
