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

  // Smart parser: chọn và tính toán theo thời hạn hợp đồng (hỗ trợ nội suy tuyến tính)
  const parts = clean.split(/[,;\n]/);

  // Nếu chỉ có 1 vế (vd: "5%" hoặc "1 tháng")
  if (parts.length === 1) {
    return parseSingleRate(clean);
  }

  // Thu thập tất cả các mốc (candidates) từ chuỗi roseStr
  const candidates: { months: number; rateType: 'percent' | 'month' | 'fixed'; rateValue: number }[] = [];

  for (const part of parts) {
    const monthMatch =
      part.match(/(\d+)\s*(?:tháng|thang|th|t|m|tr|months?)/i) ||
      part.match(/(?:hđ|hd|hợp đồng)\s*(\d+)/i);

    if (!monthMatch) continue;
    const months = parseInt(monthMatch[1], 10);

    const ratePart = part.replace(monthMatch[0], '');
    const parsedRate = parseSingleRate(ratePart);

    if (months > 0 && parsedRate.rateValue > 0) {
      candidates.push({ months, ...parsedRate });
    }
  }

  if (candidates.length === 0) {
    return parseSingleRate(clean);
  }

  // Sắp xếp các mốc theo số tháng tăng dần
  candidates.sort((a, b) => a.months - b.months);

  // 1. Kiểm tra nếu khớp chính xác số tháng
  const exactMatch = candidates.find(c => c.months === termMonths);
  if (exactMatch) {
    return { rateType: exactMatch.rateType, rateValue: exactMatch.rateValue };
  }

  // 2. Nếu số tháng nhỏ hơn mốc nhỏ nhất: Tính theo tỷ lệ giảm số tháng
  if (termMonths < candidates[0].months) {
    const first = candidates[0];
    const fraction = termMonths / first.months;
    return { rateType: first.rateType, rateValue: Number((first.rateValue * fraction).toFixed(2)) };
  }

  // 3. Nếu số tháng lớn hơn mốc lớn nhất: Lấy mốc lớn nhất
  if (termMonths > candidates[candidates.length - 1].months) {
    const last = candidates[candidates.length - 1];
    return { rateType: last.rateType, rateValue: last.rateValue };
  }

  // 4. Nếu số tháng nằm giữa 2 mốc (ví dụ 9 tháng giữa 6 tháng và 12 tháng): NỘI SUY TUYẾN TÍNH
  for (let i = 0; i < candidates.length - 1; i++) {
    const lower = candidates[i];
    const upper = candidates[i + 1];

    if (termMonths > lower.months && termMonths < upper.months) {
      const fraction = (termMonths - lower.months) / (upper.months - lower.months);
      // Giả định cùng loại rateType (nếu khác loại sẽ quy đổi theo percent)
      const interpolatedVal = lower.rateValue + fraction * (upper.rateValue - lower.rateValue);
      return {
        rateType: lower.rateType,
        rateValue: Number(interpolatedVal.toFixed(2)),
      };
    }
  }

  return parseSingleRate(clean);
}

/**
 * Helper parse 1 đoạn tỷ lệ đơn lẻ (vd: "50%", "1 tháng", "40")
 */
function parseSingleRate(str: string): { rateType: 'percent' | 'month' | 'fixed'; rateValue: number } {
  const cleanTarget = str.toLowerCase().trim();

  if (cleanTarget.includes('%')) {
    const num = parseFloat(cleanTarget.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) return { rateType: 'percent', rateValue: num };
  }

  if (cleanTarget.includes('tháng') || cleanTarget.includes('thang')) {
    const num = parseFloat(cleanTarget.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) return { rateType: 'month', rateValue: num };
  }

  const num = parseFloat(cleanTarget.replace(/[^\d.]/g, ''));
  if (!isNaN(num)) {
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
 * - "6 tháng: 50%, 12 tháng: 80%" → chọn/nội suy phù hợp theo termMonths
 * - "40% - 6th, 60% - 12th"       → 9 tháng = 50%
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
      return Math.round(price * (rateValue / 100));
    case 'month':
      return Math.round(price * rateValue);
    case 'fixed':
      return Math.round(price * rateValue);
    default:
      return 0;
  }
}

/**
 * Tính toán tổng hợp Doanh thu Công ty thu từ Chủ nhà và Hoa hồng chia cho Sale.
 *
 * @param roomPrice Price of the room per month
 * @param roseStr Landlord commission rule string
 * @param termMonths Contract term in months
 * @param salesCommissionRate Percentage of company revenue paid to sales (default 60%)
 */
export function calculateCompanyRevenueAndSalesCommission(
  roomPrice: number,
  roseStr?: string | null,
  termMonths: number = 12,
  salesCommissionRate: number = 60
) {
  const { rateType, rateValue } = parseCommissionRate(roseStr || '', termMonths);
  const companyRevenue = calculateCommissionAmount(roomPrice, roseStr, termMonths);
  const salesCommission = Math.round(companyRevenue * (salesCommissionRate / 100));
  const companyNetProfit = companyRevenue - salesCommission;

  return {
    roomPrice,
    termMonths,
    landlordRoseRate: `${rateValue}%`,
    companyRevenue,
    salesCommissionRate: `${salesCommissionRate}%`,
    salesCommission,
    companyNetProfit,
  };
}

