import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';

export const runtime = 'nodejs';

/**
 * POST /api/company/setup
 * Cho phép người dùng mới tự tạo công ty và trở thành Company Admin
 * Không yêu cầu quyền Super Admin
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['customer', 'company_admin', 'manager', 'sales_agent', 'landlord', 'tenant'] as any);
    if (isApiError(auth)) return auth;

    const profile = auth.profile;

    // Nếu đã có company rồi thì không cho tạo nữa
    if (profile.company_id) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã được liên kết với một công ty.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { company_name, company_phone, company_address, owner_name } = body;

    if (!company_name || !company_phone || !owner_name) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ: Tên công ty, Số điện thoại, Tên đại diện.' },
        { status: 400 }
      );
    }

    // Tạo mã company code ngắn tự động
    const rawCode = company_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 6);
    const companyCode = `${rawCode}-${Date.now().toString().slice(-4)}`;

    // 1. Tạo bản ghi Company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: company_name.trim(),
        code: companyCode,
        owner_name: owner_name.trim(),
        owner_email: profile.email || '',
        phone: company_phone.trim(),
        address: company_address?.trim() || '',
        plan: 'starter',         // Mặc định gói Starter (dùng thử)
        status: 'trial',         // Trạng thái dùng thử, chờ nâng cấp
        total_users: 1,
        total_properties: 0,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 ngày trial
      } as any)
      .select('id, name, code, plan, status')
      .single();

    if (companyError) {
      console.error('Lỗi tạo công ty:', companyError);
      return NextResponse.json(
        { error: `Không thể tạo công ty: ${companyError.message}` },
        { status: 500 }
      );
    }

    // 2. Nâng quyền profile lên company_admin và gán company_id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: company.id,
        role: 'company_admin',
        full_name: owner_name.trim(),
      })
      .eq('id', profile.id);

    if (profileError) {
      // Rollback: xóa company vừa tạo
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: `Không thể cập nhật quyền tài khoản: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      company,
      message: `Công ty "${company.name}" đã được tạo thành công. Bạn đang trong giai đoạn dùng thử 14 ngày.`,
    });
  } catch (err: any) {
    console.error('Lỗi /api/company/setup:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
