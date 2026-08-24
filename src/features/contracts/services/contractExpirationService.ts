import { supabase } from '@/lib/supabase/client';

export interface ExpiringContractInfo {
  contractId: string;
  contractCode: string;
  roomCode: string;
  buildingName: string;
  partyBName: string;
  partyBPhone: string;
  partyBEmail?: string;
  endDate: string;
  daysRemaining: number;
  companyId: string;
  landlordId?: string;
}

/**
 * Kiểm tra các hợp đồng thuê đang active có ngày hết hạn trong khoảng [minDays, maxDays] (mặc định 15-30 ngày).
 * Tự động tạo bản ghi thông báo (notifications) cho Chủ nhà/Manager và Khách thuê.
 */
export async function checkAndNotifyExpiringContracts(
  companyId?: string,
  minDays = 0,
  maxDays = 30
): Promise<ExpiringContractInfo[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + minDays);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDays);

  const minDateStr = minDate.toISOString().slice(0, 10);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  let query = supabase
    .from('rental_contracts')
    .select('*, rooms(code, buildings(name, landlord_id))')
    .eq('status', 'active')
    .gte('end_date', minDateStr)
    .lte('end_date', maxDateStr);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: contracts, error } = await query;
  if (error) {
    console.error('Error fetching expiring contracts:', error);
    throw error;
  }

  if (!contracts || contracts.length === 0) {
    return [];
  }

  const expiringList: ExpiringContractInfo[] = [];
  const notificationsToInsert: any[] = [];

  for (const c of contracts as any[]) {
    const end = new Date(c.end_date);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const roomCode = c.rooms?.code || 'N/A';
    const buildingName = c.rooms?.buildings?.name || 'Tòa nhà';
    const landlordId = c.rooms?.buildings?.landlord_id || undefined;

    expiringList.push({
      contractId: c.id,
      contractCode: c.contract_code,
      roomCode,
      buildingName,
      partyBName: c.party_b_name,
      partyBPhone: c.party_b_phone,
      partyBEmail: c.party_b_email,
      endDate: c.end_date,
      daysRemaining,
      companyId: c.company_id,
      landlordId,
    });

    // 1. Tạo thông báo cho Chủ nhà/Manager nếu có landlord_id
    if (landlordId) {
      notificationsToInsert.push({
        company_id: c.company_id,
        recipient_id: landlordId,
        recipient_role: 'landlord',
        type: 'contract_expiring',
        title: '⚠️ Hợp đồng sắp hết hạn',
        body: `Hợp đồng ${c.contract_code} (Phòng ${roomCode} - ${c.party_b_name}) sẽ hết hạn sau ${daysRemaining} ngày (ngày ${c.end_date}).`,
        link: `/landlord/contracts`,
        is_read: false,
      });
    }

    // 2. Tìm profile của Khách thuê dựa trên SĐT/Email để gửi thông báo phía Khách thuê
    if (c.party_b_phone) {
      const { data: tenantProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', c.party_b_phone)
        .maybeSingle();

      if (tenantProfile) {
        notificationsToInsert.push({
          company_id: c.company_id,
          recipient_id: tenantProfile.id,
          recipient_role: 'customer',
          type: 'contract_expiring',
          title: '📅 Hợp đồng thuê nhà sắp hết hạn',
          body: `Hợp đồng thuê phòng ${roomCode} của bạn sẽ hết hạn sau ${daysRemaining} ngày (ngày ${c.end_date}). Vui lòng liên hệ Chủ nhà nếu muốn gia hạn.`,
          link: `/customer/contracts`,
          is_read: false,
        });
      }
    }
  }

  // Insert notifications
  if (notificationsToInsert.length > 0) {
    try {
      await supabase.from('notifications').insert(notificationsToInsert as any);
    } catch (notifErr) {
      console.error('Error inserting contract expiration notifications:', notifErr);
    }
  }

  return expiringList;
}
