import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assigned_tech_name, assigned_tech_phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID yêu cầu bảo trì' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updatePayload.status = status;
    }

    // Cập nhật trạng thái yêu cầu bảo trì
    const { data, error } = await supabaseAdmin
      .from('maintenance_requests')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance_request in admin API:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Nếu có thông tin phân công thợ, tự động thêm comment thông báo vào maintenance_comments
    if (assigned_tech_name && assigned_tech_phone) {
      const commentContent = `🔧 [Phân công thợ]: ${assigned_tech_name} | SĐT: ${assigned_tech_phone}`;
      
      const { error: commentErr } = await supabaseAdmin
        .from('maintenance_comments')
        .insert({
          request_id: id,
          sender_id: '00000000-0000-0000-0000-000000000000',
          sender_name: 'Ban Quản Lý',
          sender_role: 'landlord',
          content: commentContent,
        });

      if (commentErr) {
        console.error('Error inserting assignment comment:', commentErr);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Maintenance PATCH API Error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
