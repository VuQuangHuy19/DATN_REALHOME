import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

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
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split('T')[0];

    // 1. TÌM VÀ CẬP NHẬT HÓA ĐƠN QUÁ HẠN
    const { data: invoices, error: invError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id, 
        invoice_code, 
        total_amount, 
        due_date, 
        company_id,
        rental_contracts (
          party_b_name, 
          party_b_phone, 
          party_b_email,
          rooms (
            code,
            landlord_id
          )
        )
      `)
      .in('status', ['unpaid', 'partially_paid'])
      .lt('due_date', todayStr);

    if (invError) throw invError;

    let overdueCount = 0;
    let notificationsSent = 0;

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((i: any) => i.id);
      
      // Update status to 'overdue'
      await supabaseAdmin
        .from('invoices')
        .update({ status: 'overdue', updated_at: now.toISOString() })
        .in('id', invoiceIds);
        
      overdueCount = invoiceIds.length;

      // 2. GỬI THÔNG BÁO NHẮC NỢ
      for (const inv of invoices) {
        const contract = inv.rental_contracts as any;
        if (!contract) continue;
        
        const tenantName = contract.party_b_name || 'Quý khách';
        const tenantPhone = contract.party_b_phone;
        const tenantEmail = contract.party_b_email;
        const roomCode = contract.rooms?.code || '';
        
        let profileId = null;
        
        // Tìm tài khoản in-app của tenant (theo SĐT)
        if (tenantPhone) {
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('phone', tenantPhone)
            .limit(1);
            
          if (profiles && profiles.length > 0) {
            profileId = profiles[0].id;
          }
        }
        
        // Nếu có profile, gửi push notification in-app
        if (profileId) {
          await supabaseAdmin.from('notifications').insert({
            company_id: inv.company_id,
            title: `Nhắc nợ: Hóa đơn phòng ${roomCode} đã quá hạn`,
            body: `Hóa đơn ${inv.invoice_code} số tiền ${Number(inv.total_amount).toLocaleString('vi-VN')}đ đã quá hạn thanh toán từ ngày ${inv.due_date}. Vui lòng thanh toán sớm.`,
            type: 'invoice',
            recipient_id: profileId,
            link: `/customer/invoices`,
            is_read: false
          });
          notificationsSent++;
        }
        
        // Gửi qua Email (nếu có)
        if (tenantEmail) {
          await sendEmail({
            to: tenantEmail,
            subject: `[RealHome] Thông báo thanh toán hóa đơn quá hạn phòng ${roomCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ea580c; margin-bottom: 20px;">Thông báo hóa đơn quá hạn</h2>
                <p>Kính chào <strong>${tenantName}</strong>,</p>
                <p>Chúng tôi xin thông báo hóa đơn dịch vụ tháng này của phòng <strong>${roomCode}</strong> đã quá hạn thanh toán.</p>
                <ul>
                  <li>Mã hóa đơn: <strong>${inv.invoice_code}</strong></li>
                  <li>Số tiền: <strong>${Number(inv.total_amount).toLocaleString('vi-VN')} VNĐ</strong></li>
                  <li>Hạn thanh toán: <strong>${inv.due_date}</strong></li>
                </ul>
                <p>Kính mong quý khách vui lòng sắp xếp thanh toán sớm để tránh bị gián đoạn dịch vụ.</p>
                <p>Cảm ơn quý khách!</p>
              </div>
            `
          }).catch(err => console.error(`Lỗi gửi mail nhắc nợ cho ${tenantEmail}:`, err));
          notificationsSent++;
        } 
        else if (!profileId) {
          // TODO: Tích hợp SMS Brandname hoặc Zalo OA ở đây nếu khách không có Email và tài khoản App.
          console.log(`[SMS/Zalo Placeholder] Gửi nhắc nợ cho SĐT: ${tenantPhone}`);
        }

        // --- GỬI THÊM THÔNG BÁO CHO ADMIN ĐỂ ADMIN BIẾT HỆ THỐNG ĐÃ NHẮC NỢ ---
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('company_id', inv.company_id)
          .in('role', ['company_admin', 'super_admin', 'admin']);
          
        const notificationsToInsert = [];
          
        if (admins && admins.length > 0) {
          const adminNotifications = admins.map((admin: any) => ({
            company_id: inv.company_id,
            title: `Hóa đơn phòng ${roomCode} đã quá hạn`,
            body: `Hệ thống đã tự động gửi nhắc nợ hóa đơn ${inv.invoice_code} (${Number(inv.total_amount).toLocaleString('vi-VN')}đ) cho khách thuê ${tenantName}.`,
            type: 'invoice',
            recipient_id: admin.id,
            link: `/admin/services/invoices`,
            is_read: false
          }));
          notificationsToInsert.push(...adminNotifications);
        }

        // --- GỬI THÔNG BÁO CHO CHỦ NHÀ ---
        const landlordCode = contract.rooms?.landlord_id;
        if (landlordCode) {
          const { data: landlordProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('company_id', inv.company_id)
            .eq('role', 'landlord')
            .eq('landlord_id', landlordCode);
            
          if (landlordProfiles && landlordProfiles.length > 0) {
            const landlordNotifications = landlordProfiles.map((lp: any) => ({
              company_id: inv.company_id,
              title: `Hóa đơn phòng ${roomCode} đã quá hạn`,
              body: `Hệ thống đã gửi nhắc nợ khách thuê ${tenantName} cho hóa đơn ${inv.invoice_code} (${Number(inv.total_amount).toLocaleString('vi-VN')}đ).`,
              type: 'invoice',
              recipient_id: lp.id,
              link: `/landlord/services/invoices`,
              is_read: false
            }));
            notificationsToInsert.push(...landlordNotifications);
          }
        }
        
        if (notificationsToInsert.length > 0) {
          await supabaseAdmin.from('notifications').insert(notificationsToInsert);
        }
      }
    }

    return NextResponse.json({
      success: true,
      overdueInvoicesUpdated: overdueCount,
      notificationsSent,
    });
  } catch (err: any) {
    console.error('Lỗi chạy overdue cron job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
