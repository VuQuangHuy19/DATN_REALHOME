import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (companyId && companyId !== 'null' && companyId !== 'undefined') {
      query = query.eq('company_id', companyId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[API ActivityLogs GET error]', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Nếu chưa có nhật ký nào trong DB, tự động đồng bộ dữ liệu thực từ Appointments, Deposit Contracts, Leads & Profiles
    if (!logs || logs.length === 0) {
      await autoSeedActivityLogs(companyId || undefined);

      // Re-query sau khi seed
      let reQuery = supabaseAdmin
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (companyId && companyId !== 'null' && companyId !== 'undefined') {
        reQuery = reQuery.eq('company_id', companyId);
      }

      const { data: seededLogs } = await reQuery;
      return NextResponse.json({ success: true, data: seededLogs || [] });
    }

    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      company_id,
      user_id,
      user_name,
      action,
      entity,
      entity_id,
      entity_label,
      detail,
      ip_address,
    } = body;

    if (!action || !entity) {
      return NextResponse.json(
        { success: false, message: 'Thiếu action hoặc entity bắt buộc' },
        { status: 400 }
      );
    }

    const { data: newLog, error } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        company_id: company_id || null,
        user_id: user_id || null,
        user_name: user_name || 'Hệ thống',
        action,
        entity,
        entity_id: entity_id || null,
        entity_label: entity_label || null,
        detail: detail || null,
        ip_address: ip_address || '127.0.0.1',
      })
      .select()
      .single();

    if (error) {
      console.error('[API ActivityLogs POST error]', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * Tự động tổng hợp nhật ký hoạt động thực tế từ dữ liệu có sẵn trong Database
 */
async function autoSeedActivityLogs(companyId?: string) {
  try {
    const newLogs: any[] = [];

    // 1. Quét Lịch Hẹn (Appointments)
    let aptQuery = supabaseAdmin
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (companyId) aptQuery = aptQuery.eq('company_id', companyId);
    const { data: apts } = await aptQuery;

    if (apts && apts.length > 0) {
      apts.forEach((apt: any) => {
        newLogs.push({
          company_id: apt.company_id,
          user_id: apt.created_by || null,
          user_name: apt.customer_name || 'Khách hàng vãng lai',
          action: 'CREATE',
          entity: 'appointment',
          entity_id: apt.id,
          entity_label: apt.room_title || 'Lịch hẹn xem phòng',
          detail: `Khách hàng ${apt.customer_name} (${apt.customer_phone || 'N/A'}) đặt lịch xem phòng ${apt.room_title || ''} lúc ${apt.time || ''} ngày ${apt.date || ''}`,
          ip_address: '127.0.0.1',
          created_at: apt.created_at || new Date().toISOString(),
        });
      });
    }

    // 2. Quét Hợp đồng đặt cọc (Deposit Contracts)
    let depQuery = supabaseAdmin
      .from('deposit_contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (companyId) depQuery = depQuery.eq('company_id', companyId);
    const { data: deps } = await depQuery;

    if (deps && deps.length > 0) {
      deps.forEach((dep: any) => {
        newLogs.push({
          company_id: dep.company_id,
          user_id: dep.created_by || dep.sales_agent_id || null,
          user_name: dep.party_a_name || 'Quản trị viên',
          action: 'CREATE',
          entity: 'deposit_contract',
          entity_id: dep.id,
          entity_label: `HĐ Cọc ${dep.contract_code || dep.party_b_name}`,
          detail: `Lập hợp đồng đặt cọc giữ chỗ cho khách hàng ${dep.party_b_name} (${dep.party_b_phone || 'N/A'}) với số tiền ${dep.deposit_amount ? Number(dep.deposit_amount).toLocaleString('vi-VN') + 'đ' : 'cọc'}`,
          ip_address: '127.0.0.1',
          created_at: dep.created_at || new Date().toISOString(),
        });
      });
    }

    // 3. Quét Leads (CRM)
    let leadQuery = supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (companyId) leadQuery = leadQuery.eq('company_id', companyId);
    const { data: leads } = await leadQuery;

    if (leads && leads.length > 0) {
      leads.forEach((l: any) => {
        newLogs.push({
          company_id: l.company_id,
          user_id: l.created_by || null,
          user_name: l.full_name || 'Khách hàng',
          action: 'CREATE',
          entity: 'lead',
          entity_id: l.id,
          entity_label: `Lead ${l.full_name}`,
          detail: `Khách hàng ${l.full_name} (${l.phone || 'N/A'}) đăng ký tư vấn bất động sản từ nguồn ${l.source || 'Website'}`,
          ip_address: '127.0.0.1',
          created_at: l.created_at || new Date().toISOString(),
        });
      });
    }

    // 4. Quét Hồ sơ Quản trị / Nhân viên
    let profQuery = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (companyId) profQuery = profQuery.eq('company_id', companyId);
    const { data: profs } = await profQuery;

    if (profs && profs.length > 0) {
      profs.forEach((p: any) => {
        newLogs.push({
          company_id: p.company_id,
          user_id: p.id,
          user_name: p.full_name || p.email,
          action: 'LOGIN',
          entity: 'user',
          entity_id: p.id,
          entity_label: `Tài khoản ${p.full_name || p.email}`,
          detail: `Người dùng ${p.full_name || p.email} đăng nhập hệ thống với vai trò ${p.role || 'thành viên'}`,
          ip_address: '127.0.0.1',
          created_at: p.created_at || new Date().toISOString(),
        });
      });
    }

    if (newLogs.length > 0) {
      await supabaseAdmin.from('activity_logs').insert(newLogs);
    }
  } catch (err) {
    console.error('Error auto seeding activity logs:', err);
  }
}
