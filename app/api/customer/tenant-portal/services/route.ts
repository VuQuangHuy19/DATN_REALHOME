import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // 1. Đọc token xác thực
    let token = '';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      const cookieHeader = request.headers.get('cookie') || '';
      for (const pair of cookieHeader.split(';')) {
        const [k, v] = pair.split('=');
        if (k.trim() === 'auth_token') {
          token = decodeURIComponent(v.trim());
          break;
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn' }, { status: 401 });
    }

    // 2. Lấy profile của khách thuê
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone, email, full_name')
      .eq('id', payload.id)
      .single();

    const phone = profile?.phone || '';
    const email = profile?.email || payload.email || '';
    const fullName = profile?.full_name || '';

    // 3. Tìm hợp đồng thuê phòng của khách
    const filters: string[] = [];
    if (phone) filters.push(`party_b_phone.eq.${phone}`);
    if (email) filters.push(`party_b_email.eq.${email}`);
    if (fullName) filters.push(`party_b_name.ilike.%${fullName}%`);

    if (filters.length === 0) {
      return NextResponse.json({ services: [], building: null });
    }

    const { data: contracts } = await supabaseAdmin
      .from('rental_contracts')
      .select('room_id')
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(1);

    const roomId = contracts?.[0]?.room_id;
    if (!roomId) {
      return NextResponse.json({ services: [], building: null });
    }

    // 4. Lấy thông tin phòng để có building_id
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('building_id')
      .eq('id', roomId)
      .single();

    const buildingCode = room?.building_id; // Có thể là UUID hoặc code TEXT như '249YH'
    if (!buildingCode) {
      return NextResponse.json({ services: [], building: null });
    }

    // 5. Resolve building UUID: building_id trong rooms có thể là code TEXT (e.g. '249YH')
    //    hoặc UUID - cần tìm building thực sự để lấy UUID chuẩn
    let buildingUUID: string | null = null;
    let buildingInfo: any = null;

    // Thử match theo UUID trước
    const { data: byId } = await supabaseAdmin
      .from('buildings')
      .select('id, name, address, code')
      .eq('id', buildingCode)
      .maybeSingle();

    if (byId) {
      buildingUUID = byId.id;
      buildingInfo = byId;
    } else {
      // Fallback: match theo code (e.g. '249YH')
      const { data: byCode } = await supabaseAdmin
        .from('buildings')
        .select('id, name, address, code')
        .eq('code', buildingCode)
        .maybeSingle();

      if (byCode) {
        buildingUUID = byCode.id;
        buildingInfo = byCode;
      }
    }

    if (!buildingUUID) {
      console.error(`[services API] Không tìm thấy building với code/id: ${buildingCode}`);
      return NextResponse.json({ services: [], building: null });
    }

    // 6. Lấy dịch vụ bổ sung của tòa nhà dùng UUID chuẩn (supabaseAdmin bỏ qua RLS)
    const { data: services, error: svcErr } = await supabaseAdmin
      .from('building_services')
      .select('*')
      .eq('building_id', buildingUUID)
      .order('created_at', { ascending: false });

    if (svcErr) {
      console.error('[services API] Lỗi lấy dịch vụ:', svcErr.message);
      return NextResponse.json({ error: svcErr.message }, { status: 500 });
    }

    console.log(`[services API] userId=${payload.id} roomId=${roomId} buildingCode=${buildingCode} buildingUUID=${buildingUUID} services=${services?.length ?? 0}`);



    return NextResponse.json({
      success: true,
      building: buildingInfo || null,
      services: services || [],
    });
  } catch (err: any) {
    console.error('[services API] Lỗi hệ thống:', err.message);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
