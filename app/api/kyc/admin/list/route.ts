import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const targetTypeFilter = searchParams.get('targetType');

    let query = supabase
      .from('kyc_verifications')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (targetTypeFilter && targetTypeFilter !== 'all') {
      query = query.eq('target_type', targetTypeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching KYC list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map profile email and transform snake_case DB fields to camelCase interface properties
    const formattedData = (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      targetType: item.target_type,
      landlordId: item.landlord_id,
      companyId: item.company_id,
      fullName: item.full_name,
      idCardNumber: item.id_card_number,
      idCardIssueDate: item.id_card_issue_date,
      idCardIssuePlace: item.id_card_issue_place,
      frontCardUrl: item.front_card_url,
      backCardUrl: item.back_card_url,
      selfieUrl: item.selfie_url,
      ownershipDocumentUrl: item.ownership_document_url,
      status: item.status,
      rejectionReason: item.rejection_reason,
      verifiedAt: item.verified_at,
      verifiedBy: item.verified_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      userEmail: item.profiles?.email || 'N/A',
      profileFullName: item.profiles?.full_name || item.full_name,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error: any) {
    console.error('KYC Admin List API Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi server lấy danh sách KYC' }, { status: 500 });
  }
}
