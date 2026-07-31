import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;
    const value = body.value?.trim();

    console.log('Received forgot-password request:', { type, value });

    if (!type || !value) {
      return NextResponse.json({ error: 'Thiếu thông tin yêu cầu' }, { status: 400 });
    }

    let userProfile = null;
    let userId = null;

    if (type === 'email') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', value)
        .maybeSingle();
      
      if (error || !data) {
        // Tránh tiết lộ email tồn tại hay không, vẫn báo thành công
        return NextResponse.json({ success: true, message: 'Nếu email tồn tại, mã xác nhận đã được gửi.' });
      }
      userProfile = data;
      userId = data.id;
    } else if (type === 'phone') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone')
        .eq('phone', value)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Lỗi khi truy vấn phone:', error);
      }
      console.log('Lookup phone result:', { value, data, error });

      if (!data) {
        return NextResponse.json({ error: 'Không tìm thấy tài khoản với số điện thoại này' }, { status: 404 });
      }
      userProfile = data;
      userId = data.id;
    } else {
      return NextResponse.json({ error: 'Phương thức không hợp lệ' }, { status: 400 });
    }

    const otp = generateOTP();
    // Hết hạn sau 5 phút
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Lưu OTP vào DB
    const { error: insertError } = await supabaseAdmin.from('auth_otps').insert({
      user_id: userId,
      type: type === 'email' ? 'email_reset' : 'phone_otp',
      email_or_phone: value,
      code: otp,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Lỗi lưu OTP:', insertError);
      return NextResponse.json({ error: 'Lỗi máy chủ khi tạo mã xác nhận' }, { status: 500 });
    }

    // Gửi OTP qua Mailjet Email
    if (type === 'email') {
      const { sendPasswordResetOTPEmail } = await import('@/lib/mail');
      const mailResult = await sendPasswordResetOTPEmail({
        toEmail: value,
        name: userProfile?.full_name || 'Quý khách',
        otp,
      });

      if (!mailResult.success) {
        console.error('Lỗi gửi email Mailjet OTP:', mailResult.error);
        console.log(`[MOCK EMAIL FALLBACK] OTP cho ${value} là ${otp}`);
      }
    } else if (type === 'phone') {
      // Gửi SMS thật qua SpeedSMS
      const accessToken = process.env.SPEEDSMS_API_TOKEN;
      
      if (!accessToken) {
        console.error('Chưa cấu hình SPEEDSMS_API_TOKEN');
        return NextResponse.json({ error: 'Hệ thống gửi SMS chưa được cấu hình.' }, { status: 500 });
      }

      const buf = Buffer.from(accessToken + ':x');
      const auth = "Basic " + buf.toString('base64');
      
      try {
        const smsResponse = await fetch('https://api.speedsms.vn/index.php/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': auth
          },
          body: JSON.stringify({
            to: [value],
            content: `Ma xac nhan RealHome cua ban la ${otp}. Ma co hieu luc trong 5 phut.`,
            sms_type: 4 // Dùng sms_type: 4 (đầu số ngẫu nhiên/cố định) cho tài khoản chưa có Brandname
          })
        });

        const smsJson = await smsResponse.json();
        
        if (smsJson.status === 'success') {
          console.log(`[SPEEDSMS] Gửi OTP tới ${value} thành công.`);
        } else {
          console.error("[SPEEDSMS] Gửi SMS thất bại: ", smsJson);
          console.log(`[MOCK SMS DỰ PHÒNG] Mã xác nhận của bạn là: ${otp}`);
          // Vẫn cho phép frontend đi tiếp để dev không bị block
          return NextResponse.json({ success: true, message: 'Đã gửi mã xác nhận (Mock do lỗi SMS)' });
        }
      } catch (smsError) {
        console.error("[SPEEDSMS] Lỗi kết nối gửi SMS: ", smsError);
        console.log(`[MOCK SMS DỰ PHÒNG] Mã xác nhận của bạn là: ${otp}`);
        return NextResponse.json({ success: true, message: 'Đã gửi mã xác nhận (Mock do lỗi SMS)' });
      }
    }

    return NextResponse.json({ success: true, message: 'Đã gửi mã xác nhận thành công' });

  } catch (error: any) {
    console.error('Lỗi trong api forgot-password:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
