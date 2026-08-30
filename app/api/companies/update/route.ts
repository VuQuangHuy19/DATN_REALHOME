import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';

export const runtime = 'nodejs';

export async function PUT(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id, name, code, logo_url, plan, status, owner_name, owner_email, phone, address, jwt_duration, total_users, total_properties } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID công ty' }, { status: 400 });
    }

    // 1. Lấy thông tin công ty hiện tại
    const { data: currentCompany, error: fetchErr } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !currentCompany) {
      return NextResponse.json({ error: 'Không tìm thấy công ty' }, { status: 404 });
    }

    const newPlan = plan || currentCompany.plan || 'starter';
    const newStatus = status || currentCompany.status || 'active';
    const now = new Date();

    // 2. Cập nhật thông tin công ty
    const updatePayload: any = {
      updated_at: now.toISOString(),
    };
    if (name !== undefined) updatePayload.name = name;
    if (code !== undefined) updatePayload.code = code;
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (plan !== undefined) updatePayload.plan = plan;
    if (status !== undefined) updatePayload.status = status;
    if (owner_name !== undefined) updatePayload.owner_name = owner_name;
    if (owner_email !== undefined) updatePayload.owner_email = owner_email;
    if (phone !== undefined) updatePayload.phone = phone;
    if (address !== undefined) updatePayload.address = address;
    if (jwt_duration !== undefined) updatePayload.jwt_duration = jwt_duration;
    if (total_users !== undefined) updatePayload.total_users = total_users;
    if (total_properties !== undefined) updatePayload.total_properties = total_properties;

    const { data: companyData, error: updateErr } = await supabaseAdmin
      .from('companies')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 3. Đồng bộ bảng subscriptions khi Super Admin thay đổi status hoặc plan
    if (newStatus === 'active') {
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('company_id', id)
        .eq('status', 'active')
        .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const seatsMap: Record<string, number> = {
        starter: 5,
        professional: 20,
        enterprise: 999999,
      };
      const seats = seatsMap[newPlan] || 20;

      if (!activeSub || activeSub.plan !== newPlan) {
        // Hủy/hết hạn các subscription cũ
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'expired', updated_at: now.toISOString() })
          .eq('company_id', id)
          .eq('status', 'active');

        // Tạo subscription active mới do Super Admin cấp
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            company_id: id,
            plan: newPlan,
            status: 'active',
            seats,
            price_per_month: 0,
            starts_at: now.toISOString(),
            ends_at: null, // Vô thời hạn cho gói do Super Admin nâng cấp
          });
      }
    } else if (newStatus === 'suspended') {
      // Nếu công ty bị khóa, cho hết hạn tất cả subscription active
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'expired', updated_at: now.toISOString() })
        .eq('company_id', id)
        .eq('status', 'active');
    }

    return NextResponse.json(companyData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
