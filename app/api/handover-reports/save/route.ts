import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent', 'landlord']);
    if (isApiError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contract_id');
    const roomId = searchParams.get('room_id');

    let found = null;
    if (contractId) {
      const { data } = await supabaseAdmin
        .from('handover_reports')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) found = data;
    }

    if (!found && roomId) {
      const { data: byRoom } = await supabaseAdmin
        .from('handover_reports')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      found = byRoom;
    }

    return NextResponse.json({ success: true, report: found });
  } catch (err: any) {
    console.error('[Handover GET API Error]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi tải biên bản bàn giao' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager', 'sales_agent', 'landlord']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const {
      id,
      company_id,
      contract_id,
      room_id,
      notes,
      images,
      furniture_checklist,
      party_confirming,
    } = body;

    const companyId = company_id || auth.profile.company_id;

    // 1. Xác nhận biên bản bàn giao (party_confirming)
    if (id && party_confirming) {
      const { data: existing, error: getErr } = await supabaseAdmin
        .from('handover_reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (getErr || !existing) {
        return NextResponse.json({ error: 'Không tìm thấy biên bản bàn giao' }, { status: 404 });
      }

      const existingChecklist = typeof existing.furniture_checklist === 'object' && existing.furniture_checklist ? existing.furniture_checklist : {};
      const isLandlord = party_confirming === 'landlord';

      const updateData: any = {
        furniture_checklist: {
          ...existingChecklist,
          landlord_confirmed: isLandlord ? true : (existingChecklist.landlord_confirmed || false),
          tenant_confirmed: !isLandlord ? true : (existingChecklist.tenant_confirmed || false),
          ...(isLandlord ? { landlord_confirmed_at: new Date().toISOString() } : { tenant_confirmed_at: new Date().toISOString() }),
        },
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('handover_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, report: updated });
    }

    // 2. Tạo hoặc Cập nhật thông thường
    const checklistData = typeof furniture_checklist === 'object' && furniture_checklist ? furniture_checklist : {};
    if (Array.isArray(images)) {
      checklistData.images = images;
    }

    const payload: Record<string, any> = {
      company_id: companyId || null,
      contract_id: contract_id || null,
      room_id: room_id || null,
      notes: notes || '',
      furniture_checklist: checklistData,
      handover_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };

    if (id) {
      // Update bản ghi đã có
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('handover_reports')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, report: updated });
    } else {
      // Insert bản ghi mới
      payload.created_at = new Date().toISOString();
      const { data: created, error: createErr } = await supabaseAdmin
        .from('handover_reports')
        .insert(payload)
        .select()
        .single();

      if (createErr) throw createErr;
      return NextResponse.json({ success: true, report: created });
    }
  } catch (err: any) {
    console.error('[Handover Save API Error]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi lưu biên bản bàn giao' }, { status: 500 });
  }
}
