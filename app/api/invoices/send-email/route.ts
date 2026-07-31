import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendMonthlyInvoiceEmail } from '@/src/lib/mail';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, overrideEmail } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Thiếu invoiceId' }, { status: 400 });
    }

    // 1. Fetch invoice data with room, building, and tenant contract
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        rooms (
          code,
          buildings (
            name,
            address
          )
        ),
        rental_contracts (
          party_b_name,
          party_b_phone,
          party_b_email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy hóa đơn: ' + (error?.message || '') }, { status: 404 });
    }

    // Determine target email
    const tenantEmail = overrideEmail || invoice.rental_contracts?.party_b_email || 'cquang398@gmail.com';
    const tenantName = invoice.rental_contracts?.party_b_name || 'Khách thuê';
    const roomCode = invoice.rooms?.code || '---';
    const month = invoice.period || new Date().toISOString().substring(0, 7);

    // Format money values
    const rentAmountStr = Number(invoice.rent_amount || 0).toLocaleString('vi-VN') + 'đ';
    const elecUsage = Number(invoice.electricity_usage || 0);
    const elecAmountStr = Number(invoice.electricity_amount || 0).toLocaleString('vi-VN') + 'đ' + (elecUsage > 0 ? ` (${elecUsage} số)` : '');
    const waterAmountStr = Number(invoice.water_amount || 0).toLocaleString('vi-VN') + 'đ';
    const totalAmountStr = Number(invoice.total_amount || 0).toLocaleString('vi-VN');
    const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('vi-VN') : 'Mùng 5 hàng tháng';

    // Payment portal / VietQR link
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/tenant-portal/finance`;

    // 2. Send email via Mailjet
    const result = await sendMonthlyInvoiceEmail({
      toEmail: tenantEmail,
      name: tenantName,
      roomCode: `Phòng ${roomCode}`,
      month: `Kỳ ${month}`,
      rentAmount: rentAmountStr,
      electricityAmount: elecAmountStr,
      waterAmount: waterAmountStr,
      totalAmount: totalAmountStr,
      dueDate: dueDateStr,
      paymentUrl,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Gửi Mailjet thất bại. Kiểm tra cấu hình MAILJET_API_KEY.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi Email hóa đơn ${month} tới ${tenantEmail} thành công!`,
      sentTo: tenantEmail,
    });
  } catch (err: any) {
    console.error('Error in send invoice email route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
