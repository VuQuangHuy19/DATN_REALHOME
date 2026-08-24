import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kycId, action, rejectionReason, reviewerId } = body;

    if (!kycId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Tham số kycId hoặc action không hợp lệ' }, { status: 400 });
    }

    // Fetch existing KYC record
    const { data: kycRecord, error: fetchError } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('id', kycId)
      .single();

    if (fetchError || !kycRecord) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ KYC' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // 1. Update kyc_verifications
      const { error: updateError } = await supabase
        .from('kyc_verifications')
        .update({
          status: 'verified',
          rejection_reason: null,
          verified_at: now,
          verified_by: reviewerId || null,
          updated_at: now,
        })
        .eq('id', kycId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // 2. Update user profile
      await supabase
        .from('profiles')
        .update({ is_kyc_verified: true, kyc_status: 'verified' })
        .eq('id', kycRecord.user_id);

      // 3. If landlord, update landlord and their properties
      let landlordId = kycRecord.landlord_id;
      if (!landlordId && kycRecord.user_id) {
        const { data: userProf } = await supabase
          .from('profiles')
          .select('landlord_id')
          .eq('id', kycRecord.user_id)
          .maybeSingle();
        landlordId = userProf?.landlord_id;
      }

      if (landlordId) {
        await supabase
          .from('landlords')
          .update({ is_kyc_verified: true, kyc_status: 'verified' })
          .eq('id', landlordId);

        // Update all buildings owned by this landlord to is_verified_property = true
        await supabase
          .from('buildings')
          .update({ is_verified_property: true })
          .eq('landlord_id', landlordId);
      }

      // 4. Send notification
      await supabase.from('notifications').insert({
        title: 'Hồ sơ KYC đã được phê duyệt thành công! ✅',
        body: kycRecord.target_type === 'landlord'
          ? 'Chúc mừng! Hồ sơ xác thực chính chủ của bạn đã được phê duyệt. Tất cả bất động sản của bạn đã được gắn nhãn Nguồn hàng sạch!'
          : 'Chúc mừng! Bạn đã được xác thực Badge Môi giới chính thức của RealHome. Khách hàng sẽ hoàn toàn tin tưởng làm việc cùng bạn!',
        type: 'system',
        recipient_id: kycRecord.user_id,
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        message: 'Đã phê duyệt hồ sơ KYC thành công. Tích xanh xác thực đã được cấp!',
      });
    } else {
      // Action === 'reject'
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Vui lòng cung cấp lý do từ chối' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('kyc_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          verified_at: now,
          verified_by: reviewerId || null,
          updated_at: now,
        })
        .eq('id', kycId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await supabase
        .from('profiles')
        .update({ is_kyc_verified: false, kyc_status: 'rejected' })
        .eq('id', kycRecord.user_id);

      if (kycRecord.landlord_id) {
        await supabase
          .from('landlords')
          .update({ is_kyc_verified: false, kyc_status: 'rejected' })
          .eq('id', kycRecord.landlord_id);
      }

      // Send notification
      await supabase.from('notifications').insert({
        title: 'Hồ sơ KYC chưa được phê duyệt ❌',
        body: `Rất tiếc, hồ sơ KYC của bạn bị từ chối với lý do: "${rejectionReason}". Vui lòng cập nhật lại giấy tờ để được duyệt lại.`,
        type: 'system',
        recipient_id: kycRecord.user_id,
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        message: 'Đã từ chối hồ sơ KYC và gửi thông báo yêu cầu cập nhật lại đến người dùng.',
      });
    }
  } catch (error: any) {
    console.error('KYC Review API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server xử lý duyệt KYC' }, { status: 500 });
  }
}
