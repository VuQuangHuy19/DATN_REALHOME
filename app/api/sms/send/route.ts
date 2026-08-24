import { NextRequest, NextResponse } from 'next/server';
import { sendESMS } from '@/lib/sms/esmsService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, content, smsType, isUnicode } = body;

    if (!phone || !content) {
      return NextResponse.json(
        { success: false, message: 'Thiếu số điện thoại hoặc nội dung tin nhắn' },
        { status: 400 }
      );
    }

    const result = await sendESMS({
      phone,
      content,
      smsType,
      isUnicode,
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API SMS Send Exception]', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi hệ thống khi gửi SMS' },
      { status: 500 }
    );
  }
}
