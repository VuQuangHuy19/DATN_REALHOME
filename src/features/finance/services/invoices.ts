import { supabase } from '@/lib/supabase/client';
import type { DBInvoice, Database } from '@/lib/supabase/types';

export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export type InvoiceWithRoomAndContract = DBInvoice & {
  rooms: {
    code: string;
    buildings: {
      name: string;
      address: string | null;
    } | null;
  } | null;
  rental_contracts: {
    contract_code: string;
    party_b_name: string;
    party_b_phone: string;
  } | null;
};

/**
 * Lấy danh sách hóa đơn theo company_id và kỳ (period).
 */
export async function getInvoices(
  companyId?: string,
  period?: string,
  landlordId?: string
): Promise<InvoiceWithRoomAndContract[]> {
  let filterLandlordCode = landlordId;
  if (landlordId && landlordId.includes('-')) {
    const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
    filterLandlordCode = landlord?.code || landlordId;
  }

  const selectQuery = filterLandlordCode
    ? '*, rooms!inner(code, buildings!inner(name, address, landlord_id)), rental_contracts(contract_code, party_b_name, party_b_phone)'
    : '*, rooms(code, buildings(name, address)), rental_contracts(contract_code, party_b_name, party_b_phone)';

  let q = supabase
    .from('invoices')
    .select(selectQuery)
    .order('created_at', { ascending: false });

  if (companyId) {
    q = q.eq('company_id', companyId);
  }
  if (period) {
    q = q.eq('period', period);
  }
  if (filterLandlordCode) {
    q = q.eq('rooms.buildings.landlord_id', filterLandlordCode);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as InvoiceWithRoomAndContract[];
}

/**
 * Lấy chi tiết một hóa đơn theo id.
 */
export async function getInvoice(id: string): Promise<InvoiceWithRoomAndContract | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, rooms(code, buildings(name, address)), rental_contracts(contract_code, party_b_name, party_b_phone)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as InvoiceWithRoomAndContract | null;
}

/**
 * Tạo mới hóa đơn.
 */
export async function createInvoice(invoice: InvoiceInsert): Promise<DBInvoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert(invoice as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBInvoice;
}

/**
 * Cập nhật thông tin hóa đơn.
 */
export async function updateInvoice(id: string, updates: InvoiceUpdate): Promise<DBInvoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ ...(updates as any), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBInvoice;
}

/**
 * Xóa hóa đơn.
 */
export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Lập hóa đơn tự động hàng loạt cho một kỳ nhất định (period = 'YYYY-MM').
 * Lấy tất cả hợp đồng thuê đang có trạng thái 'active' trong kỳ đó và tính toán dựa trên chỉ số dịch vụ đã ghi nhận.
 */
export async function batchGenerateInvoices(
  companyId: string,
  period: string,
  landlordId?: string
): Promise<{ successCount: number; skipCount: number }> {
  let filterLandlordCode = landlordId;
  if (landlordId && landlordId.includes('-')) {
    const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
    filterLandlordCode = landlord?.code || landlordId;
  }

  // 1. Lấy tất cả hợp đồng thuê đang có hiệu lực (active)
  let contractQuery = supabase
    .from('rental_contracts')
    .select('*, rooms!inner(buildings!inner(landlord_id))')
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (filterLandlordCode) {
    contractQuery = contractQuery.eq('rooms.buildings.landlord_id', filterLandlordCode);
  }

  const { data: contracts, error: contractError } = await contractQuery;

  if (contractError) throw contractError;
  if (!contracts || contracts.length === 0) return { successCount: 0, skipCount: 0 };

  // 2. Lấy tất cả chỉ số ghi nhận dịch vụ cho kỳ này
  const { data: readings, error: readingError } = await supabase
    .from('service_readings')
    .select('*')
    .eq('company_id', companyId)
    .eq('period', period);

  if (readingError) throw readingError;

  // 3. Lấy tất cả hóa đơn đã lập cho kỳ này để tránh trùng lặp
  const { data: existingInvoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('room_id')
    .eq('company_id', companyId)
    .eq('period', period);

  if (invoiceError) throw invoiceError;
  const existingRoomIds = new Set((existingInvoices ?? []).map((inv: { room_id: string | null }) => inv.room_id).filter(Boolean));

  let successCount = 0;
  let skipCount = 0;

  for (const contract of contracts) {
    if (!contract.room_id) {
      skipCount++;
      continue;
    }

    // Nếu đã có hóa đơn rồi thì bỏ qua
    if (existingRoomIds.has(contract.room_id)) {
      skipCount++;
      continue;
    }

    // Tìm chỉ số dịch vụ kỳ này
    const reading = (readings ?? []).find((r: { room_id: string | null }) => r.room_id === contract.room_id);
    
    // Tính toán tiền điện nước
    let electricityUsage = 0;
    let electricityAmount = 0;
    let waterAmount = 0;
    
    if (reading) {
      electricityUsage = Math.max(0, Number(reading.electricity_new) - Number(reading.electricity_old));
      electricityAmount = electricityUsage * (Number(contract.electricity_price) || 4000);
      
      const waterRate = contract.water_price || '150000/người/tháng';
      if (waterRate.includes('/người')) {
        waterAmount = (Number(contract.tenant_count) || 1) * parseInt(waterRate.replace(/[^\d]/g, '') || '150000', 10);
      } else if (waterRate.includes('/khối')) {
        const waterUsage = Math.max(0, Number(reading.water_new) - Number(reading.water_old));
        waterAmount = waterUsage * parseInt(waterRate.replace(/[^\d]/g, '') || '35000', 10);
      } else {
        waterAmount = parseInt(waterRate.replace(/[^\d]/g, '') || '150000', 10);
      }
    } else {
      // Phác thảo nếu chưa ghi nhận chỉ số dịch vụ (tính nước cố định, điện = 0)
      const waterRate = contract.water_price || '150000/người/tháng';
      waterAmount = (Number(contract.tenant_count) || 1) * parseInt(waterRate.replace(/[^\d]/g, '') || '150000', 10);
    }

    // Tiền phí dịch vụ chung
    const serviceRate = contract.service_price || '200000/người/tháng';
    let serviceAmount = 0;
    if (serviceRate.includes('/người')) {
      serviceAmount = (Number(contract.tenant_count) || 1) * parseInt(serviceRate.replace(/[^\d]/g, '') || '200000', 10);
    } else {
      serviceAmount = parseInt(serviceRate.replace(/[^\d]/g, '') || '200000', 10);
    }

    // Phí dịch vụ khác từ other_services json
    let otherAmount = 0;
    if (contract.other_services && typeof contract.other_services === 'object') {
      const os = contract.other_services as any;
      if (os.internet) {
        otherAmount += parseInt(os.internet.replace(/[^\d]/g, '') || '0', 10);
      }
      if (os.laundry) {
        otherAmount += parseInt(os.laundry.replace(/[^\d]/g, '') || '0', 10);
      }
    }

    const rentAmount = Number(contract.rent_price);
    const totalAmount = rentAmount + electricityAmount + waterAmount + serviceAmount + otherAmount;

    // Hạn thanh toán mặc định là ngày đóng tiền hàng tháng
    const paymentDay = Number(contract.payment_day_of_month) || 5;
    const [year, month] = period.split('-');
    const dueDate = `${year}-${month}-${String(paymentDay).padStart(2, '0')}`;

    const invoiceCode = `HDD-${period.replace('-', '')}-${contract.contract_code.slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;

    await supabase.from('invoices').insert({
      company_id: companyId,
      room_id: contract.room_id,
      rental_contract_id: contract.id,
      invoice_code: invoiceCode,
      period,
      due_date: dueDate,
      status: 'unpaid',
      rent_amount: rentAmount,
      electricity_usage: electricityUsage,
      electricity_amount: electricityAmount,
      water_amount: waterAmount,
      service_amount: serviceAmount,
      other_amount: otherAmount,
      other_details: 'Internet + Máy giặt/sấy',
      total_amount: totalAmount,
    } as any);

    successCount++;
  }

  return { successCount, skipCount };
}
