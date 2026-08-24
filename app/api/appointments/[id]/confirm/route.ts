import { NextRequest, NextResponse } from 'next/server';
import { confirmAppointmentService } from '@/features/notifications/services/appointmentNotificationService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { sale_id, sale_name, sale_phone } = body;

    if (!id || !sale_id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu id lịch hẹn hoặc sale_id' },
        { status: 400 }
      );
    }

    const updatedApp = await confirmAppointmentService({
      appointment_id: id,
      sale_id,
      sale_name: sale_name || 'Sale',
      sale_phone: sale_phone || '',
    });

    return NextResponse.json({
      success: true,
      message: 'Tiếp nhận lịch hẹn thành công',
      data: updatedApp,
    });
  } catch (err: any) {
    console.error('[API Appointment Confirm Error]', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Không thể tiếp nhận lịch hẹn' },
      { status: err.statusCode || 500 }
    );
  }
}
