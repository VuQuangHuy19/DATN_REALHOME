/**
 * scripts/normalize-existing-phones.ts
 *
 * Script chuẩn hoá số điện thoại cũ trong DB về dạng "0xxxxxxxxx".
 *
 * Chạy thủ công, KHÔNG tự động chạy khi build.
 *
 * Usage:
 *   npx tsx scripts/normalize-existing-phones.ts            # dry-run (mặc định)
 *   npx tsx scripts/normalize-existing-phones.ts --apply    # thực sự UPDATE DB
 *
 * Biến môi trường cần thiết: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (thường lấy từ .env.local)
 */

import 'dotenv/config'; // Tự load .env.local nếu dùng dotenv

const isDryRun = !process.argv.includes('--apply');

// ── Inline normalizePhoneVN để không phụ thuộc module resolution Next.js ──────
function normalizePhoneVN(phone: string): string {
  if (!phone) return phone;
  let cleaned = phone.trim().replace(/[\s\-.()\u00a0]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

function isValidVNPhone(phone: string): boolean {
  return /^(0[3-9][0-9]{8})$/.test(phone);
}

// ── Tạo Supabase admin client thủ công ────────────────────────────────────────
async function getAdminClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Thêm vào .env.local rồi chạy lại.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Phone Normalization Script');
  console.log(`  Mode: ${isDryRun ? '🔍 DRY RUN (chỉ log, không sửa DB)' : '⚡ APPLY (sẽ UPDATE DB)'}`);
  console.log('════════════════════════════════════════════════════════════\n');

  const supabase = await getAdminClient();

  // ── 1. Bảng leads ──────────────────────────────────────────────────────────
  console.log('📋 Đang đọc bảng leads...');
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, phone, full_name, company_id');

  if (leadsError) {
    console.error('Lỗi khi đọc leads:', leadsError.message);
  } else {
    const leadsToFix = (leads ?? []).filter((l) => {
      if (!l.phone) return false;
      const normalized = normalizePhoneVN(l.phone);
      return normalized !== l.phone;
    });

    console.log(`  Tìm thấy ${leads?.length ?? 0} leads, ${leadsToFix.length} cần chuẩn hoá.\n`);

    for (const lead of leadsToFix) {
      const normalized = normalizePhoneVN(lead.phone);
      const valid = isValidVNPhone(normalized);
      console.log(
        `  [LEAD] ${lead.id.slice(0, 8)}...  ` +
          `"${lead.phone}" → "${normalized}" ${valid ? '✅' : '⚠️ (vẫn không hợp lệ)'}`
      );

      if (!isDryRun) {
        const { error } = await supabase
          .from('leads')
          .update({ phone: normalized })
          .eq('id', lead.id);
        if (error) {
          console.error(`    ❌ Lỗi update lead ${lead.id}: ${error.message}`);
        } else {
          console.log(`    ✅ Đã cập nhật`);
        }
      }
    }
  }

  console.log('');

  // ── 2. Bảng appointments ───────────────────────────────────────────────────
  console.log('📋 Đang đọc bảng appointments...');
  const { data: appointments, error: aptsError } = await supabase
    .from('appointments')
    .select('id, customer_phone, customer_name');

  if (aptsError) {
    console.error('Lỗi khi đọc appointments:', aptsError.message);
  } else {
    const aptsToFix = (appointments ?? []).filter((a) => {
      if (!a.customer_phone) return false;
      const normalized = normalizePhoneVN(a.customer_phone);
      return normalized !== a.customer_phone;
    });

    console.log(
      `  Tìm thấy ${appointments?.length ?? 0} appointments, ${aptsToFix.length} cần chuẩn hoá.\n`
    );

    for (const apt of aptsToFix) {
      const normalized = normalizePhoneVN(apt.customer_phone);
      const valid = isValidVNPhone(normalized);
      console.log(
        `  [APT] ${apt.id.slice(0, 8)}...  ` +
          `"${apt.customer_phone}" → "${normalized}" ${valid ? '✅' : '⚠️ (vẫn không hợp lệ)'}`
      );

      if (!isDryRun) {
        const { error } = await supabase
          .from('appointments')
          .update({ customer_phone: normalized })
          .eq('id', apt.id);
        if (error) {
          console.error(`    ❌ Lỗi update appointment ${apt.id}: ${error.message}`);
        } else {
          console.log(`    ✅ Đã cập nhật`);
        }
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  if (isDryRun) {
    console.log('  DRY RUN hoàn tất. Không có gì bị thay đổi.');
    console.log('  Chạy với --apply để thực sự cập nhật DB:');
    console.log('    npx tsx scripts/normalize-existing-phones.ts --apply');
  } else {
    console.log('  APPLY hoàn tất. DB đã được cập nhật.');
  }
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Script thất bại:', err.message);
  process.exit(1);
});
