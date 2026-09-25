import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // 1. Read token from Authorization header or auth_token cookie
    let token = '';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      const cookieHeader = request.headers.get('cookie') || '';
      const pairs = cookieHeader.split(';');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k.trim() === 'auth_token') {
          token = decodeURIComponent(v.trim());
          break;
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn' }, { status: 401 });
    }

    // 2. Fetch current user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', payload.id)
      .maybeSingle();

    const phone = profile?.phone || '';
    const email = profile?.email || payload.email || '';
    const fullName = profile?.full_name || '';

    // 3. Build multi-filter query for tenant contracts
    const filters: string[] = [];
    if (phone) filters.push(`party_b_phone.eq.${phone}`);
    if (email) filters.push(`party_b_email.eq.${email}`);
    if (email) filters.push(`party_b_phone.eq.${email}`);
    if (fullName) filters.push(`party_b_name.ilike.%${fullName}%`);

    let contracts: any[] = [];
    if (filters.length > 0) {
      const { data: rawContracts } = await supabaseAdmin
        .from('rental_contracts')
        .select('id, room_id, party_b_name, party_b_email, party_b_phone')
        .or(filters.join(','));
      contracts = rawContracts || [];
    }

    // If still no contract found by exact email/phone, find active contracts for rooms
    const contractIds = contracts.map((c: any) => c.id);
    const roomIds = contracts.map((c: any) => c.room_id).filter(Boolean);

    let invoices: any[] = [];

    if (contractIds.length > 0 || roomIds.length > 0) {
      const invFilters: string[] = [];
      if (contractIds.length > 0) invFilters.push(`rental_contract_id.in.(${contractIds.join(',')})`);
      if (roomIds.length > 0) invFilters.push(`room_id.in.(${roomIds.join(',')})`);

      const { data: invData, error: invError } = await supabaseAdmin
        .from('invoices')
        .select('*, rooms(code, buildings(name, landlord_id)), rental_contracts(party_b_name, party_b_email, party_b_phone)')
        .or(invFilters.join(','))
        .order('issue_date', { ascending: false });

      if (invError) console.error('Invoices fetch error:', invError);
      invoices = invData || [];
    }

    // Fallback: If invoices is still empty, search all recent invoices matched by tenant name/email/phone
    if (invoices.length === 0) {
      const { data: allInvoices } = await supabaseAdmin
        .from('invoices')
        .select('*, rooms(code, buildings(name, landlord_id)), rental_contracts(party_b_name, party_b_email, party_b_phone)')
        .order('issue_date', { ascending: false })
        .limit(50);

      invoices = (allInvoices || []).filter((inv: any) => {
        const c = inv.rental_contracts;
        if (!c) return false;
        if (email && c.party_b_email === email) return true;
        if (phone && c.party_b_phone === phone) return true;
        if (fullName && c.party_b_name && c.party_b_name.toLowerCase().includes(fullName.toLowerCase())) return true;
        return false;
      });
    }

    // Bổ sung thông tin landlords cho từng invoice (hỗ trợ cả UUID id và mã code TH01, TH02...)
    const rawLandlordKeys = Array.from(
      new Set(
        invoices
          .flatMap((inv: any) => [
            inv.rooms?.buildings?.landlord_id,
            inv.rooms?.landlord_id,
          ])
          .filter(Boolean)
      )
    ) as string[];

    let lndData: any[] = [];
    if (rawLandlordKeys.length > 0) {
      const uuidKeys = rawLandlordKeys.filter((k) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)
      );
      const codeKeys = rawLandlordKeys.filter(
        (k) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)
      );

      const orConds: string[] = [];
      if (uuidKeys.length > 0) orConds.push(`id.in.(${uuidKeys.join(',')})`);
      if (codeKeys.length > 0) orConds.push(`code.in.(${codeKeys.join(',')})`);

      if (orConds.length > 0) {
        const { data: foundLnds } = await supabaseAdmin
          .from('landlords')
          .select('id, code, name, bank_name, bank_account_number, bank_account_owner')
          .or(orConds.join(','));
        lndData = foundLnds || [];
      }
    }

    // Fallback: Nếu không tìm thấy theo key trực tiếp, lấy danh sách landlords thuộc company_id của invoice
    if (lndData.length === 0) {
      const companyIds = Array.from(new Set(invoices.map((inv: any) => inv.company_id).filter(Boolean)));
      if (companyIds.length > 0) {
        const { data: compLnds } = await supabaseAdmin
          .from('landlords')
          .select('id, code, name, bank_name, bank_account_number, bank_account_owner')
          .in('company_id', companyIds);
        lndData = compLnds || [];
      }
    }

    if (lndData.length > 0) {
      const lndMap: Record<string, any> = {};
      lndData.forEach((l: any) => {
        if (l.id) lndMap[l.id] = l;
        if (l.code) lndMap[l.code] = l;
      });

      const fallbackLandlord = lndData.find((l: any) => l.bank_account_number) || lndData[0];

      invoices = invoices.map((inv: any) => {
        const lndKey = inv.rooms?.buildings?.landlord_id || inv.rooms?.landlord_id;
        const matchedLandlord = (lndKey && lndMap[lndKey]) ? lndMap[lndKey] : fallbackLandlord;

        if (!inv.rooms) inv.rooms = {};
        if (!inv.rooms.buildings) inv.rooms.buildings = {};
        inv.rooms.buildings.landlords = matchedLandlord;
        return inv;
      });
    }

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (err: any) {
    console.error('Tenant Invoices API Error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
