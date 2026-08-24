import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      targetType,
      landlordId,
      companyId,
      fullName,
      idCardNumber,
      idCardIssueDate,
      idCardIssuePlace,
      frontCardUrl,
      backCardUrl,
      selfieUrl,
      ownershipDocumentUrl,
    } = body;

    if (!userId || !fullName || !idCardNumber || !frontCardUrl || !backCardUrl || !selfieUrl) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ thông tin cá nhân và 3 ảnh xác thực (CCCD 2 mặt + Selfie 3D)' },
        { status: 400 }
      );
    }

    if (targetType === 'landlord' && !ownershipDocumentUrl) {
      return NextResponse.json(
        { error: 'Chủ nhà cần tải lên giấy chứng nhận quyền sở hữu hoặc hợp đồng ủy quyền bất động sản' },
        { status: 400 }
      );
    }

    // Check if an existing KYC verification request exists for this user
    const { data: existing } = await supabase
      .from('kyc_verifications')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let recordId = existing?.id;

    if (recordId) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('kyc_verifications')
        .update({
          target_type: targetType || 'sale',
          landlord_id: landlordId || null,
          company_id: companyId || null,
          full_name: fullName,
          id_card_number: idCardNumber,
          id_card_issue_date: idCardIssueDate || null,
          id_card_issue_place: idCardIssuePlace || null,
          front_card_url: frontCardUrl,
          back_card_url: backCardUrl,
          selfie_url: selfieUrl,
          ownership_document_url: ownershipDocumentUrl || null,
          status: 'pending',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (updateError) {
        console.error('Error updating KYC:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from('kyc_verifications')
        .insert({
          user_id: userId,
          target_type: targetType || 'sale',
          landlord_id: landlordId || null,
          company_id: companyId || null,
          full_name: fullName,
          id_card_number: idCardNumber,
          id_card_issue_date: idCardIssueDate || null,
          id_card_issue_place: idCardIssuePlace || null,
          front_card_url: frontCardUrl,
          back_card_url: backCardUrl,
          selfie_url: selfieUrl,
          ownership_document_url: ownershipDocumentUrl || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting KYC:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      recordId = inserted.id;
    }

    // Update profile kyc_status to pending
    await supabase
      .from('profiles')
      .update({ kyc_status: 'pending', is_kyc_verified: false })
      .eq('id', userId);

    if (landlordId) {
      await supabase
        .from('landlords')
        .update({ kyc_status: 'pending', is_kyc_verified: false })
        .eq('id', landlordId);
    }

    // If landlordId and systemName provided, update landlords system_name
    if (landlordId && body.systemName) {
      await supabase
        .from('landlords')
        .update({ system_name: body.systemName.trim() })
        .eq('id', landlordId);
    }

    return NextResponse.json({
      success: true,
      message: 'Gửi hồ sơ KYC thành công! Ban Quản Trị sẽ thẩm định và phê duyệt trong vòng 24 giờ.',
    });
  } catch (e: any) {
    console.error('KYC Submit Exception:', e);
    return NextResponse.json({ error: e.message || 'Lỗi xử lý máy chủ' }, { status: 500 });
  }
}
