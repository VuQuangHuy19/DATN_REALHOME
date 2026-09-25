import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// GET: Lấy danh sách dịch vụ bổ sung của tòa nhà
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json({ services: [] });
    }

    // 1. Thử tìm theo building_id trực tiếp
    const { data: services, error } = await supabaseAdmin
      .from('building_services')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API building_services GET] Lỗi:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Nếu tìm thấy hoặc buildingId đã là UUID
    if (services && services.length > 0) {
      return NextResponse.json({ services });
    }

    // 2. Fallback: Nếu buildingId truyền vào là code (TEXT), tìm UUID của tòa nhà
    const { data: bld } = await supabaseAdmin
      .from('buildings')
      .select('id')
      .or(`id.eq.${buildingId},code.eq.${buildingId}`)
      .maybeSingle();

    if (bld && bld.id !== buildingId) {
      const { data: servicesByUUID, error: err2 } = await supabaseAdmin
        .from('building_services')
        .select('*')
        .eq('building_id', bld.id)
        .order('created_at', { ascending: true });

      if (!err2 && servicesByUUID) {
        return NextResponse.json({ services: servicesByUUID });
      }
    }

    return NextResponse.json({ services: services || [] });
  } catch (err: any) {
    console.error('[API building_services GET] Lỗi server:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Thêm mới dịch vụ bổ sung cho tòa nhà
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { building_id, service_name, price, unit, description } = body;

    if (!building_id || !service_name) {
      return NextResponse.json({ error: 'Thiếu thông tin tòa nhà hoặc tên dịch vụ' }, { status: 400 });
    }

    // Resolve UUID của tòa nhà nếu building_id truyền vào là code
    let uuid = building_id;
    const { data: bld } = await supabaseAdmin
      .from('buildings')
      .select('id')
      .or(`id.eq.${building_id},code.eq.${building_id}`)
      .maybeSingle();

    if (bld?.id) {
      uuid = bld.id;
    }

    const { data, error } = await supabaseAdmin
      .from('building_services')
      .insert({
        building_id: uuid,
        service_name,
        price: Number(price) || 0,
        unit: unit || 'lần',
      })
      .select()
      .single();

    if (error) {
      console.error('[API building_services POST] Lỗi:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ service: data });
  } catch (err: any) {
    console.error('[API building_services POST] Lỗi server:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa dịch vụ bổ sung
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID dịch vụ cần xóa' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('building_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[API building_services DELETE] Lỗi:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API building_services DELETE] Lỗi server:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
