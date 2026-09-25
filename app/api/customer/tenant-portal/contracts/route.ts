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
      return NextResponse.json({ error: 'Chua dang nhap' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Phien dang nhap het han' }, { status: 401 });
    }

    // 2. Fetch current user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', payload.id)
      .single();

    const phone = profile?.phone || '';
    const email = profile?.email || payload.email || '';
    const fullName = profile?.full_name || '';

    // 3. Build multi-filter query for tenant contracts
    const filters: string[] = [];
    if (phone) filters.push(`party_b_phone.eq.${phone}`);
    if (email) filters.push(`party_b_email.eq.${email}`);
    if (fullName) filters.push(`party_b_name.ilike.%${fullName}%`);

    if (filters.length === 0) {
      return NextResponse.json({ contracts: [], handovers: [] });
    }

    // 4. Query rental contracts with schema error fallback
    let rawContracts: any[] = [];
    let { data: rData, error: contractErr } = await supabaseAdmin
      .from('rental_contracts')
      .select('*')
      .or(filters.join(','))
      .order('created_at', { ascending: false });

    if (contractErr && contractErr.message?.includes('party_b_email')) {
      const fallbackFilters: string[] = [];
      if (phone) fallbackFilters.push(`party_b_phone.eq.${phone}`);
      if (fullName) fallbackFilters.push(`party_b_name.ilike.%${fullName}%`);

      if (fallbackFilters.length > 0) {
        const retry = await supabaseAdmin
          .from('rental_contracts')
          .select('*')
          .or(fallbackFilters.join(','))
          .order('created_at', { ascending: false });
        rData = retry.data;
        contractErr = retry.error;
      }
    }

    if (contractErr && !rData) {
      console.error('Error fetching tenant contracts:', contractErr);
      return NextResponse.json({ error: contractErr.message }, { status: 500 });
    }

    if (rData) {
      rawContracts = rData.map((rc: any) => ({ ...rc, contract_type: 'rental' }));
    }

    // Also query deposit contracts for full tenant visibility
    const { data: dData } = await supabaseAdmin
      .from('deposit_contracts')
      .select('*')
      .or(filters.join(','))
      .order('created_at', { ascending: false });

    if (dData && dData.length > 0) {
      const depositMapped = dData.map((dc: any) => ({
        ...dc,
        contract_type: 'deposit',
        start_date: dc.agreement_date,
        end_date: dc.deadline_sign_contract,
      }));
      depositMapped.forEach((dc: any) => {
        if (!rawContracts.some((rc: any) => rc.deposit_contract_id === dc.id || rc.contract_code === dc.contract_code)) {
          rawContracts.push(dc);
        }
      });
    }

    const contracts = rawContracts;

    // 5. Enrich each contract with room and building via separate admin queries
    const enrichedContracts = await Promise.all(
      contracts.map(async (c: any) => {
        if (!c.room_id) return { ...c, rooms: null };

        const { data: room } = await supabaseAdmin
          .from('rooms')
          .select('*')
          .eq('id', c.room_id)
          .single();

        if (!room) return { ...c, rooms: null };

        let building = null;
        if (room.building_id) {
          const { data: bldg } = await supabaseAdmin
            .from('buildings')
            .select('*')
            .eq('id', room.building_id)
            .single();
          building = bldg || null;
        }

        return {
          ...c,
          rooms: {
            ...room,
            buildings: building,
          },
        };
      })
    );

    // 6. Query handover reports for these contracts
    const contractIds = enrichedContracts.map((c: any) => c.id);
    let handovers: any[] = [];
    if (contractIds.length > 0) {
      const { data: hoData } = await supabaseAdmin
        .from('handover_reports')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });
      handovers = hoData || [];
    }

    return NextResponse.json({
      success: true,
      contracts: enrichedContracts,
      handovers: handovers,
    });
  } catch (err: any) {
    console.error('Tenant Portal API Error:', err);
    return NextResponse.json({ error: err.message || 'Loi he thong' }, { status: 500 });
  }
}
