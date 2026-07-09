import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/employees/update
 * Cập nhật thông tin nhân viên trong bảng employees VÀ đồng bộ sang profiles.
 * Dùng supabaseAdmin để bypass RLS khi cập nhật profiles.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id, name, phone, email, department, position, join_date, status, company_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id nhân viên' }, { status: 400 });
    }

    // Kiểm tra nhân viên thuộc về company của user đang đăng nhập
    const { data: emp, error: empCheckErr } = await supabaseAdmin
      .from('employees')
      .select('id, company_id')
      .eq('id', id)
      .maybeSingle();

    if (empCheckErr || !emp) {
      return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    if (emp.company_id !== auth.profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cập nhật bảng employees
    const employeePatch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) employeePatch.name = name;
    if (phone !== undefined) employeePatch.phone = phone || null;
    if (email !== undefined) employeePatch.email = email;
    if (department !== undefined) employeePatch.department = department;
    if (position !== undefined) employeePatch.position = position;
    if (join_date !== undefined) employeePatch.join_date = join_date || null;
    if (status !== undefined) employeePatch.status = status;

    const { data: updatedEmployee, error: updateErr } = await supabaseAdmin
      .from('employees')
      .update(employeePatch)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Đồng bộ full_name và phone sang bảng profiles (bypass RLS với supabaseAdmin)
    const profilePatch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) profilePatch.full_name = name;
    if (phone !== undefined) profilePatch.phone = phone || null;

    if (Object.keys(profilePatch).length > 1) { // > 1 vì luôn có updated_at
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update(profilePatch)
        .eq('id', id);

      if (profileErr) {
        console.warn('[employees/update] Không thể sync profile:', profileErr.message);
      }
    }

    return NextResponse.json(updatedEmployee);
  } catch (error: any) {
    console.error('Lỗi cập nhật nhân viên:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
