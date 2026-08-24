import { NextResponse } from 'next/server';
import { checkAndNotifyExpiringContracts } from '@/features/contracts/services/contractExpirationService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const results = await checkAndNotifyExpiringContracts(companyId, 0, 30);

    return NextResponse.json({
      success: true,
      message: `Đã quét và tạo thông báo cho ${results.length} hợp đồng sắp hết hạn trong 30 ngày tới.`,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    console.error('Lỗi khi chạy Cronjob kiểm tra hợp đồng hết hạn:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
