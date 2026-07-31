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

    // Bổ sung thông tin landlords cho từng invoice
    const landlordIds = Array.from(
      new Set(invoices.map((inv: any) => inv.rooms?.buildings?.landlord_id).filter(Boolean))
    );
    if (landlordIds.length > 0) {
      const { data: lndData } = await supabaseAdmin
        .from('landlords')
        .select('id, name, bank_name, bank_account_number, bank_account_owner')
        .in('id', landlordIds);

      if (lndData) {
        const lndMap: Record<string, any> = {};
        lndData.forEach((l: any) => {
          lndMap[l.id] = l;
        });
        invoices = invoices.map((inv: any) => {
          const lndId = inv.rooms?.buildings?.landlord_id;
          if (lndId && lndMap[lndId] && inv.rooms?.buildings) {
            inv.rooms.buildings.landlords = lndMap[lndId];
          }
          return inv;
        });
      }
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
