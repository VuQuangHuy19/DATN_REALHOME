import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyJWT } from '@/lib/auth-utils';

export const runtime = 'nodejs';

function parseCookie(cookieString: string, key: string): string | null {
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k.trim() === key) return decodeURIComponent(v.trim());
  }
  return null;
}

async function authenticate(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = parseCookie(cookieHeader, 'auth_token');
  if (!token) return null;
  return verifyJWT(token);
}

/** PATCH /api/landlords/[id]  — Cập nhật thông tin chủ nhà */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { created_by, updated_by, ...updateData } = body;

    const { data, error } = await supabaseAdmin
      .from('landlords')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/landlords/[id]  — Xóa chủ nhà */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticate(request);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabaseAdmin
      .from('landlords')
      .delete()
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
