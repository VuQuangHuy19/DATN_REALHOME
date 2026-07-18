import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['company_admin', 'manager']);
    if (isApiError(auth)) return auth;

    const companyId = auth.profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Tài khoản chưa thuộc công ty nào' }, { status: 400 });
    }

    // Lấy tất cả buildings của công ty
    const { data: buildings, error: bldErr } = await supabaseAdmin
      .from('buildings')
      .select('id, code')
      .eq('company_id', companyId);

    if (bldErr) throw bldErr;
    if (!buildings || buildings.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    let updated = 0;
    for (const bld of buildings) {
      try {
        // Đếm thực tế từ bảng rooms
        const { data: rooms } = await supabaseAdmin
          .from('rooms')
          .select('floor')
          .eq('company_id', companyId)
          .eq('building_id', bld.code);

        if (rooms && rooms.length > 0) {
          const totalRooms = rooms.length;
          const totalFloors = Math.max(...rooms.map((r: { floor: number | null }) => r.floor ? Number(r.floor) : 1));

          const { error } = await supabaseAdmin
            .from('buildings')
            .update({ total_rooms: totalRooms, total_floors: totalFloors })
            .eq('id', bld.id);

          if (!error) updated++;
        } else {
          // Không có phòng => reset về 0
          await supabaseAdmin
            .from('buildings')
            .update({ total_rooms: 0, total_floors: 1 })
            .eq('id', bld.id);
          updated++;
        }
      } catch (err) {
        console.error(`Lỗi sync tòa nhà ${bld.code}:`, err);
      }
    }

    return NextResponse.json({ success: true, updated, total: buildings.length });
  } catch (error: any) {
    console.error('Lỗi sync building counts:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
