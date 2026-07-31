import { supabase } from '@/lib/supabase/client';
import type { DBServiceReading, Database } from '@/lib/supabase/types';

export type ServiceReadingInsert = Database['public']['Tables']['service_readings']['Insert'];
export type ServiceReadingUpdate = Database['public']['Tables']['service_readings']['Update'];

export type ServiceReadingWithRoom = DBServiceReading & {
  rooms: {
    code: string;
    buildings: {
      name: string;
    } | null;
  } | null;
};

/**
 * Lấy danh sách ghi nhận chỉ số dịch vụ theo company_id và kỳ (period, ví dụ '2026-07').
 */
export async function getServiceReadings(
  companyId?: string,
  period?: string,
  landlordId?: string
): Promise<ServiceReadingWithRoom[]> {
  let landlordRoomIds: string[] | null = null;
  if (landlordId) {
    let filterLandlordCode = landlordId;
    if (landlordId.includes('-')) {
      const { data: landlord } = await supabase.from('landlords').select('code').eq('id', landlordId).maybeSingle();
      filterLandlordCode = landlord?.code || landlordId;
    }
    const { data: landlordRooms } = await supabase
      .from('rooms')
      .select('id')
      .or(`landlord_id.eq.${filterLandlordCode},landlord_id.eq.${landlordId}`);
    landlordRoomIds = (landlordRooms ?? []).map((r: any) => r.id);
  }

  let q = supabase
    .from('service_readings')
    .select('*, rooms(code, buildings(name))')
    .order('reading_date', { ascending: false });

  if (companyId) {
    q = q.eq('company_id', companyId);
  }
  if (period) {
    q = q.eq('period', period);
  }
  if (landlordRoomIds !== null) {
    if (landlordRoomIds.length === 0) return [];
    q = q.in('room_id', landlordRoomIds);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ServiceReadingWithRoom[];
}

/**
 * Lấy chỉ số ghi nhận cũ hơn gần nhất của một phòng trước kỳ hiện tại.
 */
export async function getPreviousReading(
  roomId: string,
  currentPeriod: string
): Promise<DBServiceReading | null> {
  const { data, error } = await supabase
    .from('service_readings')
    .select('*')
    .eq('room_id', roomId)
    .lt('period', currentPeriod)
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DBServiceReading | null;
}

/**
 * Lưu hoặc cập nhật ghi nhận chỉ số dịch vụ (Upsert).
 */
export async function saveServiceReading(
  reading: ServiceReadingInsert
): Promise<DBServiceReading> {
  const { data, error } = await supabase
    .from('service_readings')
    .upsert(reading as any, { onConflict: 'room_id,period' })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DBServiceReading;
}

/**
 * Xóa bản ghi chỉ số dịch vụ.
 */
export async function deleteServiceReading(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_readings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
