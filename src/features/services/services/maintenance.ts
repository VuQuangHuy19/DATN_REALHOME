import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/src/lib/supabase/types';

export type DBMaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];
export type DBMaintenanceComment = Database['public']['Tables']['maintenance_comments']['Row'];

export type MaintenanceWithRoom = DBMaintenanceRequest & {
  rooms?: {
    code: string;
    building_id?: string | null;
    buildings?: {
      id?: string;
      name: string;
      code?: string | null;
      address: string | null;
    } | null;
  } | null;
  maintenance_comments?: DBMaintenanceComment[];
};

/**
 * Lấy danh sách yêu cầu bảo trì theo company_id (hoặc cho khách hàng theo created_by).
 */
export async function getMaintenanceRequests(
  companyId?: string,
  userId?: string
): Promise<MaintenanceWithRoom[]> {
  let q = supabase
    .from('maintenance_requests')
    .select('*, rooms(code, building_id, buildings(id, name, code, address)), maintenance_comments(*)')
    .order('created_at', { ascending: false });

  if (companyId) {
    q = q.eq('company_id', companyId);
  }
  if (userId) {
    q = q.eq('created_by', userId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as MaintenanceWithRoom[];
}

/**
 * Cập nhật chi phí bảo trì, phân định bên chịu phí (Khách chịu / Chủ nhà chịu / Chia đôi).
 */
export async function updateMaintenanceCost(
  id: string,
  payload: {
    repair_details: string;
    cost_amount: number;
    cost_bearer: 'landlord' | 'tenant' | 'shared';
    tenant_amount: number;
    payment_status: 'waived' | 'unpaid' | 'paid' | 'added_to_monthly_invoice';
    status?: string;
  }
): Promise<DBMaintenanceRequest> {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({
      repair_details: payload.repair_details,
      cost_amount: payload.cost_amount,
      cost_bearer: payload.cost_bearer,
      tenant_amount: payload.tenant_amount,
      payment_status: payload.payment_status,
      status: payload.status || 'Hoàn tất',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBMaintenanceRequest;
}

/**
 * In / Xuất File PDF Biên Bản Nghiệm Thu & Hóa Đơn Bảo Trì
 */
export function exportMaintenancePDF(request: {
  id: string;
  title: string;
  roomCode?: string;
  buildingName?: string;
  createdAt: string;
  repairDetails?: string;
  costAmount?: number;
  costBearer?: string;
  tenantAmount?: number;
  paymentStatus?: string;
  tenantName?: string;
  tenantPhone?: string;
}) {
  const isFree = request.costBearer === 'landlord' || (request.tenantAmount ?? 0) === 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Biên Bản Nghiệm Thu & Hóa Đơn Bảo Trì - ${request.id.slice(0, 8)}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 900; color: #d97706; text-transform: uppercase; }
        .title { font-size: 20px; font-weight: 800; margin-top: 10px; color: #0f172a; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
        .badge-free { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .badge-paid { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { font-weight: bold; color: #64748b; width: 35%; }
        .detail-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .footer-signatures { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
        .sig-block { width: 45%; }
        .sig-space { height: 80px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">REALHOME - QUẢN LÝ BẤT ĐỘNG SẢN</div>
        <div class="title">BIÊN BẢN NGHIỆM THU & HÓA ĐƠN BẢO TRÌ</div>
        <p style="font-size: 13px; color: #64748b; margin-top: 5px;">Mã phiếu: BT-${request.id.slice(0, 8).toUpperCase()} | Ngày: ${request.createdAt}</p>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Tòa nhà / Căn hộ:</td>
          <td><strong>${request.buildingName || 'Hệ thống'} - Phòng ${request.roomCode || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td class="label">Khách thuê:</td>
          <td>${request.tenantName || 'Khách thuê'} (${request.tenantPhone || 'Chưa cập nhật'})</td>
        </tr>
        <tr>
          <td class="label">Nội dung sự cố:</td>
          <td><strong>${request.title}</strong></td>
        </tr>
        <tr>
          <td class="label">Phân định chi phí:</td>
          <td>
            ${
              isFree
                ? `<span class="badge badge-free">🟢 CHỦ NHÀ CHỊU 100% (MIỄN PHÍ DÀNH CHO KHÁCH)</span>`
                : `<span class="badge badge-paid">🟡 KHÁCH THUÊ CHỊU CHI PHÍ</span>`
            }
          </td>
        </tr>
      </table>

      <div class="detail-box">
        <h4 style="margin-top:0; color: #0f172a;">Chi tiết Vật tư & Nhân công Sửa chữa:</h4>
        <p style="white-space: pre-wrap; font-size: 14px;">${request.repairDetails || 'Đã sửa chữa và kiểm tra hoạt động ổn định.'}</p>
        <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 15px 0;">
        <table style="width: 100%; font-size: 15px;">
          <tr>
            <td>Tổng chi phí sửa chữa:</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">${(request.costAmount || 0).toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr style="font-size: 18px; font-weight: bold; color: ${isFree ? '#16a34a' : '#d97706'};">
            <td>Thực thu từ Khách thuê:</td>
            <td style="text-align: right; font-family: monospace;">${(request.tenantAmount || 0).toLocaleString('vi-VN')} đ</td>
          </tr>
        </table>
      </div>

      <div class="footer-signatures">
        <div class="sig-block">
          <p><strong>KHÁCH THUÊ PHÒNG</strong></p>
          <p style="font-size: 11px; color: #94a3b8;">(Ký & ghi rõ họ tên / Đã nghiệm thu)</p>
          <div class="sig-space"></div>
          <p><strong>${request.tenantName || 'Khách thuê'}</strong></p>
        </div>
        <div class="sig-block">
          <p><strong>ĐẠI DIỆN BAN QUẢN LÝ / KỸ THUẬT</strong></p>
          <p style="font-size: 11px; color: #94a3b8;">(Ký & ghi rõ họ tên)</p>
          <div class="sig-space"></div>
          <p><strong>Ban Quản Lý RealHome</strong></p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 40px;" class="no-print">
        <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; cursor: pointer;">
          🖨️ In / Tải file PDF Biên Bản Nghiệm Thu
        </button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
