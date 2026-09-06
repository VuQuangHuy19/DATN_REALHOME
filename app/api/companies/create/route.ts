import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { name, plan, status, owner_name, owner_email, phone, address, code, logo_url } = body;

    if (!name || !owner_name || !owner_email || !phone || !address || !code) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Tên công ty, Số điện thoại, Email, Chủ sở hữu, Địa chỉ, Mã công ty)' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: owner_email,
      password: 'RealHome@2026',
      email_confirm: true,
      user_metadata: {
        full_name: owner_name,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        code,
        logo_url: logo_url || null,
        plan,
        status,
        owner_name,
        owner_email,
        phone,
        address,
        total_users: 0,
        total_properties: 0,
        trial_ends_at: null,
      } as any)
      .select()
      .single();

    if (companyError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: companyError.message }, { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: companyData.id,
        role: 'company_admin',
      })
      .eq('id', userId);

    if (profileError) {
      await supabaseAdmin.from('companies').delete().eq('id', companyData.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (status === 'active') {
      const seatsMap: Record<string, number> = {
        starter: 5,
        professional: 20,
        enterprise: 999999,
      };
      const pricesMap: Record<string, number> = {
        starter: 500000,
        professional: 2000000,
        enterprise: 5000000,
      };
      const planName = plan || 'starter';
      await supabaseAdmin.from('subscriptions').insert({
        company_id: companyData.id,
        plan: planName,
        status: 'active',
        seats: seatsMap[planName] || 5,
        price_per_month: pricesMap[planName] || 500000,
        starts_at: new Date().toISOString(),
        ends_at: null,
      });
    }

    return NextResponse.json(companyData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
