import { NextResponse } from 'next/server';
import { parseGoogleSheetFull } from '@/src/features/import/services/googleSheetAiParser';

export const runtime = 'nodejs';
export const maxDuration = 60; // Up to 60s for parsing

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sheetUrl } = body;

    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đường dẫn Google Sheet hợp lệ.' },
        { status: 400 }
      );
    }

    const parsedData = await parseGoogleSheetFull(sheetUrl);

    return NextResponse.json({
      success: true,
      sheetUrl,
      result: parsedData,
    });
  } catch (error: any) {
    console.error('[Google Sheet Parse Route Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể bóc tách dữ liệu từ Google Sheet này.' },
      { status: 500 }
    );
  }
}
