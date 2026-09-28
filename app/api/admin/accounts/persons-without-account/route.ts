import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/accounts/persons-without-account?company_id=xxx&role=manager|landlord|tenant
 * Lấy danh sách người đã có trong hệ thống nhưng CHƯA có tài khoản đăng nhập.
 * - manager  → bảng managers, lọc profile_id IS NULL
 * - landlord → bảng landlords, lọc profile_id IS NULL
 * - tenant   → bảng contracts (active), lọc party_b_email/phone chưa có trong profiles
 */
export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'super_admin']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || auth.profile.company_id;
    const role = searchParams.get('role');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    if (!role || !['manager', 'landlord', 'tenant'].includes(role)) {
      return NextResponse.json({ error: 'role phải là manager, landlord hoặc tenant' }, { status: 400 });
    }

    // ───────────────────────────────────────────────
    // MANAGER: lấy từ bảng managers, profile_id IS NULL
    // ───────────────────────────────────────────────
    if (role === 'manager') {
      const { data, error } = await supabaseAdmin
        .from('managers')
        .select('id, name, phone, email, code, profile_id')
        .eq('company_id', companyId)
        .is('profile_id', null)
        .order('name');

      if (error) throw error;

      const persons = (data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        email: m.email,
        code: m.code,
        source: 'manager',
      }));

      return NextResponse.json({ data: persons });
    }

    // ───────────────────────────────────────────────
    // LANDLORD: lấy từ bảng landlords, loại trừ những người
    // đã có profile (kiểm tra qua profiles.landlord_id)
    // vì bảng landlords KHÔNG có cột profile_id
    // ───────────────────────────────────────────────
    if (role === 'landlord') {
      // Lấy tất cả landlord_id đã có trong bảng profiles
      const { data: profilesWithLandlord } = await supabaseAdmin
        .from('profiles')
        .select('landlord_id')
        .eq('company_id', companyId)
        .not('landlord_id', 'is', null);

      const takenLandlordIds = new Set(
        (profilesWithLandlord ?? []).map((p: any) => p.landlord_id).filter(Boolean)
      );

      // Lấy tất cả landlords, lọc ra những người chưa có tài khoản
      const { data: allLandlords, error } = await supabaseAdmin
        .from('landlords')
        .select('id, name, phone, email, code')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;

      const persons = (allLandlords ?? [])
        .filter((l: any) => !takenLandlordIds.has(l.id))
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          code: l.code,
          source: 'landlord',
        }));

      return NextResponse.json({ data: persons });
    }

    // ───────────────────────────────────────────────
    // TENANT: lấy từ contracts (active), unique theo phone/email
    // Lọc ra những người chưa có profile trong hệ thống
    // ───────────────────────────────────────────────
    if (role === 'tenant') {
      // Lấy tất cả rental_contracts active của công ty
      const { data: contracts, error: contractsErr } = await supabaseAdmin
        .from('rental_contracts')
        .select('id, party_b_name, party_b_phone, party_b_email, contract_code, status')
        .eq('company_id', companyId)
        .in('status', ['active', 'signed'])
        .order('created_at', { ascending: false });

      if (contractsErr) throw contractsErr;

      // Lấy tất cả emails & phones đã có trong profiles của công ty
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('email, phone')
        .eq('company_id', companyId);

      const existingEmails = new Set(
        (existingProfiles ?? [])
          .map((p: any) => (p.email || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const existingPhones = new Set(
        (existingProfiles ?? [])
          .map((p: any) => (p.phone || '').replace(/\D/g, ''))
          .filter((p: string) => p.length >= 8)
      );

      // Dedup & lọc những người chưa có tài khoản
      const seen = new Set<string>();
      const persons: any[] = [];

      for (const c of contracts ?? []) {
        const name = (c.party_b_name || '').trim();
        const phone = (c.party_b_phone || '').trim();
        const email = (c.party_b_email || '').trim().toLowerCase();
        if (!name) continue;

        const dedupKey = `${name.toLowerCase()}-${phone || email}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        // Bỏ qua nếu đã có profile
        const phoneDigits = phone.replace(/\D/g, '');
        const alreadyHasEmail = email && existingEmails.has(email);
        const alreadyHasPhone = phoneDigits.length >= 8 && existingPhones.has(phoneDigits);
        if (alreadyHasEmail || alreadyHasPhone) continue;

        persons.push({
          id: c.id, // contract id làm reference
          name,
          phone: phone || null,
          email: email || null,
          code: c.contract_code || null,
          source: 'tenant',
        });
      }

      return NextResponse.json({ data: persons });
    }

    return NextResponse.json({ data: [] });
  } catch (error: any) {
    console.error('Lỗi persons-without-account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
