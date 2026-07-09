import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Thiếu roomId' }, { status: 400 });
    }

    // Thực hiện thêm phòng vào danh sách yêu thích
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .insert({
        user_id: user.id,
        room_id: roomId,
      })
      .select()
      .single();

    if (error) {
      // Trường hợp trùng lặp (đã yêu thích trước đó)
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Phòng đã được thêm vào danh sách yêu thích trước đó' }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
