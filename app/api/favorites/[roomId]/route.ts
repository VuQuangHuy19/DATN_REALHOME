import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = params;
    if (!roomId) {
      return NextResponse.json({ error: 'Thiếu roomId' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('room_id', roomId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
