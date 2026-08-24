import { NextResponse } from 'next/server';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatStandardBuildingAddress } from '@/lib/utils';

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
      .select('id, code, name, address')
      .eq('company_id', companyId);

    if (bldErr) throw bldErr;
    if (!buildings || buildings.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    let updated = 0;
    for (const bld of buildings) {
      try {
        let formattedName = formatStandardBuildingAddress(bld.name || '');
        let formattedAddress = formatStandardBuildingAddress(bld.address || formattedName);

        // Nếu name đang bị dính mặt nạ x (ví dụ 43.21x GIÁP NHẤT) nhưng address chứa số đầy đủ (43.213 GIÁP NHẤT)
        if (formattedName.toLowerCase().includes('x') && formattedAddress && !formattedAddress.toLowerCase().includes('x')) {
          formattedName = formattedAddress;
        }

        // Đếm thực tế từ bảng rooms theo cả building code và UUID
        const { data: rooms } = await supabaseAdmin
          .from('rooms')
          .select('floor')
          .eq('company_id', companyId)
          .or(`building_id.eq.${bld.code},building_id.eq.${bld.id}`);

        const updateData: any = {
          name: formattedName,
          address: formattedAddress,
        };

        if (rooms && rooms.length > 0) {
          updateData.total_rooms = rooms.length;
          updateData.total_floors = Math.max(...rooms.map((r: { floor: number | null }) => r.floor ? Number(r.floor) : 1));
        } else {
          updateData.total_rooms = 0;
          updateData.total_floors = 1;
        }

        const { error } = await supabaseAdmin
          .from('buildings')
          .update(updateData)
          .eq('id', bld.id);

        if (!error) updated++;
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
