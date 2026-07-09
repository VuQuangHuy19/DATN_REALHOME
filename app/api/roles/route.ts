import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function parseCookie(cookieString: string, key: string): string | null {
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k.trim() === key) {
      return decodeURIComponent(v.trim());
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload || !payload.id || !payload.company_id) {
      return NextResponse.json({ error: 'Không hợp lệ' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .or(`company_id.eq.${payload.company_id},company_id.is.null`)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload || !payload.id || !payload.company_id) {
      return NextResponse.json({ error: 'Không hợp lệ' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert({
        company_id: payload.company_id,
        name,
        description,
        permissions,
        is_system: false,
        users_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload || !payload.id || !payload.company_id) {
      return NextResponse.json({ error: 'Không hợp lệ' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, permissions } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id vai trò' }, { status: 400 });
    }

    const { data: existingRole, error: fetchError } = await supabaseAdmin
      .from('roles')
      .select('is_system, company_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'Không tìm thấy vai trò' }, { status: 404 });
    }
    if (existingRole.company_id !== payload.company_id) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }
    if (existingRole.is_system) {
      return NextResponse.json({ error: 'Không thể sửa vai trò hệ thống' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('roles')
      .update({
        name,
        description,
        permissions,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload || !payload.id || !payload.company_id) {
      return NextResponse.json({ error: 'Không hợp lệ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id vai trò' }, { status: 400 });
    }

    const { data: existingRole, error: fetchError } = await supabaseAdmin
      .from('roles')
      .select('is_system, company_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'Không tìm thấy vai trò' }, { status: 404 });
    }
    if (existingRole.company_id !== payload.company_id) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }
    if (existingRole.is_system) {
      return NextResponse.json({ error: 'Không thể xóa vai trò hệ thống' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
