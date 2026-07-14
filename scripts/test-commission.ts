/**
 * Test thô cho commission service
 * Chạy bằng: npx ts-node --project tsconfig.json scripts/test-commission.ts
 *
 * Lưu ý: Vì dự án dùng Next.js với moduleResolution "bundler", cần chạy với ts-node/esm
 * hoặc dùng tsx: npx tsx scripts/test-commission.ts
 */

// Inline logic từ commission.ts để tránh phụ thuộc module resolution
function parseCommissionRate(
  roseStr: string,
  termMonths: number
): { rateType: 'percent' | 'month' | 'fixed'; rateValue: number } {
  const clean = roseStr.trim();
  if (!clean) return { rateType: 'fixed', rateValue: 0 };

  const parts = clean.split(/[,;\n]/);
  let targetRateStr = clean;

  if (parts.length > 1) {
    const candidates: { months: number; valueStr: string }[] = [];
    for (const part of parts) {
      const monthMatch =
        part.match(/(\d+)\s*(?:tháng|thang|th|t|m|months?)/i) ||
        part.match(/(?:hđ|hd|hợp đồng)\s*(\d+)/i);
      const months = monthMatch ? parseInt(monthMatch[1], 10) : null;

      let ratePart = part;
      if (monthMatch) ratePart = part.replace(monthMatch[0], '');

      const pctMatch = ratePart.match(/(\d+(?:\.\d+)?)\s*%/);
      const multMatch = ratePart.match(/(\d+(?:\.\d+)?)\s*(?:tháng|thang|th|t)/i);

      let valStr = '';
      if (pctMatch) valStr = pctMatch[0];
      else if (multMatch) valStr = multMatch[0];
      else {
        const fallbackMatch = ratePart.match(/(\d+(?:\.\d+)?\s*%?)/);
        if (fallbackMatch) valStr = fallbackMatch[1].trim();
      }

      if (months !== null && valStr) candidates.push({ months, valueStr: valStr });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.months - b.months);
      let bestMatch = candidates[0];
      let minDiff = Math.abs(candidates[0].months - termMonths);
      for (const cand of candidates) {
        const diff = Math.abs(cand.months - termMonths);
        if (diff < minDiff) { minDiff = diff; bestMatch = cand; }
        else if (diff === minDiff && cand.months <= termMonths) bestMatch = cand;
      }
      targetRateStr = bestMatch.valueStr;
    }
  }

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
    return num > 1
      ? { rateType: 'percent', rateValue: num }
      : { rateType: 'fixed', rateValue: num };
  }

  return { rateType: 'fixed', rateValue: 0 };
}

function calculateCommissionAmount(
  price: number,
  roseStr?: string | null,
  termMonths: number = 12
): number {
  if (!roseStr) return 0;
  const clean = roseStr.trim();
  if (!clean) return 0;

  const { rateType, rateValue } = parseCommissionRate(clean, termMonths);
  switch (rateType) {
    case 'percent': return price * (rateValue / 100);
    case 'month':   return price * rateValue;
    case 'fixed':   return price * rateValue;
    default:        return 0;
  }
}

// ─── Test runner đơn giản ────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

const PRICE = 5_000_000; // 5 triệu/tháng

console.log('\n── parseCommissionRate ──────────────────────────────────────────');

test(
  '"5%" → percent, 5',
  parseCommissionRate('5%', 12),
  { rateType: 'percent', rateValue: 5 }
);

test(
  '"1 tháng" → month, 1',
  parseCommissionRate('1 tháng', 12),
  { rateType: 'month', rateValue: 1 }
);

test(
  '"6 tháng: 50%, 12 tháng: 80%" with termMonths=12 → percent, 80',
  parseCommissionRate('6 tháng: 50%, 12 tháng: 80%', 12),
  { rateType: 'percent', rateValue: 80 }
);

test(
  '"6 tháng: 50%, 12 tháng: 80%" with termMonths=6 → percent, 50',
  parseCommissionRate('6 tháng: 50%, 12 tháng: 80%', 6),
  { rateType: 'percent', rateValue: 50 }
);

test(
  '"" (empty) → fixed, 0',
  parseCommissionRate('', 12),
  { rateType: 'fixed', rateValue: 0 }
);

console.log('\n── calculateCommissionAmount ────────────────────────────────────');

test(
  'price=5M, "5%", 12 → 250,000đ',
  calculateCommissionAmount(PRICE, '5%', 12),
  250_000
);

test(
  'price=5M, "1 tháng", 12 → 5,000,000đ',
  calculateCommissionAmount(PRICE, '1 tháng', 12),
  5_000_000
);

test(
  'price=5M, "6 tháng: 50%, 12 tháng: 80%", termMonths=12 → 4,000,000đ',
  calculateCommissionAmount(PRICE, '6 tháng: 50%, 12 tháng: 80%', 12),
  4_000_000
);

test(
  'price=5M, "6 tháng: 50%, 12 tháng: 80%", termMonths=6 → 2,500,000đ',
  calculateCommissionAmount(PRICE, '6 tháng: 50%, 12 tháng: 80%', 6),
  2_500_000
);

test(
  'roseStr empty string → 0',
  calculateCommissionAmount(PRICE, '', 12),
  0
);

test(
  'roseStr null → 0',
  calculateCommissionAmount(PRICE, null, 12),
  0
);

// ─── Kết quả ─────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
