import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'Realhome2026_Cron';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Chuyển về timezone VN (UTC+7) để lấy ngày hiện tại chính xác
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentPeriod = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}`;

    let contractsEnded = 0;
    let invoicesCreated = 0;

    // 1. QUÉT HỢP ĐỒNG HẾT HẠN
    const { data: expiredContracts, error: expiredError } = await supabaseAdmin
      .from('rental_contracts')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', todayStr);

    if (expiredError) throw expiredError;

    if (expiredContracts && expiredContracts.length > 0) {
      const ids = expiredContracts.map((c: any) => c.id);
      await supabaseAdmin
        .from('rental_contracts')
        .update({ status: 'ended', updated_at: now.toISOString() })
        .in('id', ids);
      contractsEnded = ids.length;
    }

    // 2. TỰ ĐỘNG SINH HÓA ĐƠN HÀNG THÁNG
    // Chỉ lấy các hợp đồng active
    const { data: activeContracts, error: activeError } = await supabaseAdmin
      .from('rental_contracts')
      .select('id, company_id, room_id, rent_price, payment_day_of_month, other_services')
      .eq('status', 'active');

    if (activeError) throw activeError;

    if (activeContracts && activeContracts.length > 0) {
      // Lấy danh sách hóa đơn đã sinh trong kỳ này để tránh trùng
      const { data: existingInvoices } = await supabaseAdmin
        .from('invoices')
        .select('rental_contract_id')
        .eq('period', currentPeriod);
      
      const existingSet = new Set(existingInvoices?.map((inv: any) => inv.rental_contract_id) || []);

      const newInvoices = [];

      for (const contract of activeContracts) {
        if (!existingSet.has(contract.id)) {
          // Tính ngày hạn thanh toán (due_date)
          let dueDate = new Date(vnTime.getFullYear(), vnTime.getMonth(), contract.payment_day_of_month || 5);
          if (dueDate < vnTime) {
            // Nếu ngày hạn đã qua trong tháng này (vd sinh hóa đơn vào mùng 10 mà payment day là mùng 5),
            // có thể dời sang tháng sau, hoặc cho 5 ngày kể từ ngày tạo
            dueDate = new Date(vnTime.getTime() + 5 * 24 * 60 * 60 * 1000);
          }

          const rentAmount = Number(contract.rent_price || 0);
          
          // Phí dịch vụ cố định (Tạm tính cứng hoặc lấy từ JSON other_services nếu có)
          let serviceAmount = 0;
          if (contract.other_services && typeof contract.other_services === 'object') {
             // Logic tính phí dịch vụ cố định từ settings
             const os = contract.other_services as any;
             if (os.internet) serviceAmount += Number(os.internet);
             if (os.cleaning) serviceAmount += Number(os.cleaning);
             if (os.parking) serviceAmount += Number(os.parking);
          }

          // Generate unique invoice code
          const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          const invoiceCode = `INV-${currentPeriod.replace('-', '')}-${randomSuffix}`;

          newInvoices.push({
            company_id: contract.company_id,
            room_id: contract.room_id,
            rental_contract_id: contract.id,
            invoice_code: invoiceCode,
            period: currentPeriod,
            issue_date: todayStr,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'unpaid',
            rent_amount: rentAmount,
            service_amount: serviceAmount,
            total_amount: rentAmount + serviceAmount,
            note: 'Hóa đơn tự động. Tiền điện nước sẽ được chốt và cộng thêm sau.',
          });
        }
      }

      if (newInvoices.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('invoices')
          .insert(newInvoices);
          
        if (insertError) throw insertError;
        invoicesCreated = newInvoices.length;
      }
    }

    return NextResponse.json({
      success: true,
      contractsEnded,
      invoicesCreated,
    });
  } catch (err: any) {
    console.error('Lỗi chạy daily cron job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
