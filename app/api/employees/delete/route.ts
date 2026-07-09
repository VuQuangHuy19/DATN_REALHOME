import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { id, company_id } = body;

    if (!id || !company_id) {
      return NextResponse.json({ error: 'Thiếu thông tin ID nhân viên hoặc ID công ty' }, { status: 400 });
    }

    if (auth.profile.company_id !== company_id) {
      return NextResponse.json({ error: 'Không có quyền thực hiện hành động này' }, { status: 403 });
    }

    // 1. Kiểm tra xem nhân viên có đúng thuộc công ty này không
    const { data: employee, error: checkError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', id)
      .eq('company_id', company_id)
      .maybeSingle();

    if (checkError || !employee) {
      return NextResponse.json({ error: 'Không tìm thấy nhân sự trong công ty này' }, { status: 404 });
    }

    // 2. Xóa trong bảng employees
    const { error: employeeDeleteError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (employeeDeleteError) {
      return NextResponse.json({ error: 'Lỗi xóa thông tin nhân sự: ' + employeeDeleteError.message }, { status: 400 });
    }

    // 3. Xóa trong bảng profiles (nếu chưa bị xóa bởi trigger/foreign key cascade)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      console.warn('Lỗi xóa profile (hoặc đã bị xóa bởi cascade):', profileDeleteError.message);
    }

    // 4. Xóa tài khoản đăng nhập trong Supabase Auth (chỉ admin mới có quyền này)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.warn('Lỗi xóa tài khoản đăng nhập Supabase Auth:', authDeleteError.message);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống khi xóa nhân viên: ' + error.message }, { status: 500 });
  }
}
