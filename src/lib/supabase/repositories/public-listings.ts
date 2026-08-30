import { supabase, isUserLoggedIn } from '../client';
import { mapRoomToListing } from '@/lib/customer/listing-mapper';
import type { CustomerListing, PublicCompany } from '@/lib/customer/types';
import { getRoomDisplayStatus } from '@/lib/room-status';

const companySelect = 'id, name, code, phone, address, owner_email';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Explicit column list — không dùng * để tránh lấy dư thừa.
// QUAN TRỌNG: KHÔNG bao giờ thêm rooms(*) vào buildings(...) — gây data explosion & timeout.
const buildingFields = `
  id, name, area, address, landlord_id, is_verified_property, year_built,
  image_url, thumbnail_url, description, deposit_terms, has_elevator,
  pccc_certified, common_drying_area, allow_pet, allow_foreigners,
  allow_vinfast_electric, has_air_conditioner, has_water_heater, has_bed,
  has_wardrobe, has_kitchen_cabinet, has_refrigerator, has_hood,
  has_dressing_table, latitude, longitude,
  electricity_price, water_price, internet_price, common_service_price, electric_vehicle_fee
`.trim();

const roomFields = `
  id, code, floor, room_type, size, price, status, bedrooms, bathrooms,
  description, building_id, company_id, landlord_id,
  has_private_balcony, max_occupants, max_vehicles_per_room, min_contract_months,
  deposit_terms, created_at,
  buildings(${buildingFields}),
  room_images(url, thumbnail_url, is_thumbnail, priority, media_type)
`.trim();

async function attachLandlordsToRooms(rows: any[]) {
  if (!rows || rows.length === 0) return rows;

  const rawKeys = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.landlord_id, r.buildings?.landlord_id])
        .filter(Boolean) as string[]
    )
  );

  if (rawKeys.length === 0) return rows;

  const uuids = rawKeys.filter((k) => UUID_REGEX.test(k));
  const codes = rawKeys.filter((k) => !UUID_REGEX.test(k));

  let q = supabase
    .from('landlords')
    .select('id, code, system_name, name, is_kyc_verified, kyc_status');

  if (uuids.length > 0 && codes.length > 0) {
    q = q.or(`id.in.(${uuids.join(',')}),code.in.(${codes.join(',')})`);
  } else if (uuids.length > 0) {
    q = q.in('id', uuids);
  } else if (codes.length > 0) {
    q = q.in('code', codes);
  } else {
    return rows;
  }

  const { data: landlordsData } = await q;

  if (!landlordsData || landlordsData.length === 0) return rows;

  const landlordMap = new Map<string, any>();
  for (const l of landlordsData) {
    if (l.id) landlordMap.set(l.id, l);
    if (l.code) landlordMap.set(l.code, l);
  }

  for (const r of rows) {
    const key = r.buildings?.landlord_id || r.landlord_id;
    if (key && landlordMap.has(key)) {
      const landlordObj = landlordMap.get(key);
      if (r.buildings) {
        r.buildings.landlords = landlordObj;
      }
      r.landlords = landlordObj;
    }
  }

  return rows;
}

export async function getCompanyByCode(code: string): Promise<PublicCompany | null> {
  const { data, error } = await supabase
    .from('companies')
    .select(companySelect)
    .eq('code', code)
    .in('status', ['active', 'trial'])
    .maybeSingle();

  if (error) throw error;
  return data as PublicCompany | null;
}

export async function getDefaultCompany(): Promise<PublicCompany | null> {
  const { data, error } = await supabase
    .from('companies')
    .select(companySelect)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as PublicCompany | null;
}

export async function resolveCompany(codeParam?: string | null): Promise<PublicCompany | null> {
  const code = codeParam?.trim();
  if (code) {
    const company = await getCompanyByCode(code);
    if (company) return company;
  }
  return getDefaultCompany();
}

function filterPublicListing(row: any): boolean {
  const ds = getRoomDisplayStatus(row, row.rental_contracts || []);
  if (ds.status === 'available') return true;
  if (ds.status === 'soon_available' || ds.isSoonAvailable) {
    if (!ds.expectedEmptyDate) return true;
    const end = new Date(ds.expectedEmptyDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 60;
  }
  return false;
}

export async function getPublicListings(companyId: string | string[], showAll: boolean = false): Promise<CustomerListing[]> {
  let query = supabase
    .from('rooms')
    .select(roomFields);

  // Lọc trực tiếp tại Database: Loại bỏ phòng đã thuê thuần túy (trừ phòng có thông tin sắp trống)
  if (!showAll) {
    query = query.or('status.neq.rented,status.eq.soon_available,description.ilike.%sắp trống%,description.ilike.%sap trong%');
  }

  query = query
    .order('created_at', { ascending: false })
    .limit(1000); // Giới hạn an toàn 1000 phòng trống cho toàn hệ thống

  if (Array.isArray(companyId)) {
    query = query.in('company_id', companyId);
  } else if (companyId.includes(',')) {
    query = query.in('company_id', companyId.split(',').map((id) => id.trim()));
  } else {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rowsWithLandlords = await attachLandlordsToRooms(data ?? []);

  return rowsWithLandlords
    .filter((row: any) => showAll || filterPublicListing(row))
    .map((row: Parameters<typeof mapRoomToListing>[0]) => mapRoomToListing(row))
    .filter((item: CustomerListing | null): item is CustomerListing => item !== null);
}

export async function getPublicListing(id: string): Promise<CustomerListing | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select(roomFields)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [rowWithLandlords] = await attachLandlordsToRooms([data]);
  return mapRoomToListing(rowWithLandlords as Parameters<typeof mapRoomToListing>[0]);
}

export async function getPublicListingsByIds(ids: string[], companyId?: string | string[] | null, showAll: boolean = false): Promise<CustomerListing[]> {
  if (ids.length === 0) return [];

  let query = supabase
    .from('rooms')
    .select(roomFields)
    .in('id', ids);

  if (companyId) {
    if (Array.isArray(companyId)) {
      query = query.in('company_id', companyId);
    } else if (companyId.includes(',')) {
      query = query.in('company_id', companyId.split(',').map((id) => id.trim()));
    } else {
      query = query.eq('company_id', companyId);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const rowsWithLandlords = await attachLandlordsToRooms(data ?? []);

  return rowsWithLandlords
    .filter((row: any) => showAll || filterPublicListing(row))
    .map((row: Parameters<typeof mapRoomToListing>[0]) => mapRoomToListing(row))
    .filter((item: CustomerListing | null): item is CustomerListing => item !== null);
}

export async function getPublicListingsByBuilding(buildingId: string, showAll: boolean = false): Promise<CustomerListing[]> {
  if (!buildingId) return [];
  const isUuid = UUID_REGEX.test(buildingId);
  let bQuery = supabase.from('buildings').select('id, code');
  if (isUuid) {
    bQuery = bQuery.or(`id.eq.${buildingId},code.eq.${buildingId}`);
  } else {
    bQuery = bQuery.eq('code', buildingId);
  }
  let { data: buildingData } = await bQuery.maybeSingle();

  // Fallback nếu buildingId truyền vào thực chất là room.id
  if (!buildingData && isUuid) {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('building_id')
      .eq('id', buildingId)
      .maybeSingle();

    if (roomData?.building_id) {
      const isBldUuid = UUID_REGEX.test(roomData.building_id);
      let fbQuery = supabase.from('buildings').select('id, code');
      if (isBldUuid) {
        fbQuery = fbQuery.or(`id.eq.${roomData.building_id},code.eq.${roomData.building_id}`);
      } else {
        fbQuery = fbQuery.eq('code', roomData.building_id);
      }
      const { data: fbBld } = await fbQuery.maybeSingle();
      if (fbBld) buildingData = fbBld;
    }
  }

  const buildingUuids = Array.from(
    new Set([buildingId, buildingData?.id].filter((k): k is string => !!k && UUID_REGEX.test(k)))
  );
  if (buildingUuids.length === 0) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select(roomFields)
    .in('building_id', buildingUuids)
    .order('created_at', { ascending: false })
    .limit(200); // Hard cap

  if (error) throw error;

  const rowsWithLandlords = await attachLandlordsToRooms(data ?? []);

  const mappedListings = rowsWithLandlords
    .filter((row: any) => showAll || filterPublicListing(row))
    .map((row: Parameters<typeof mapRoomToListing>[0]) => mapRoomToListing(row))
    .filter((item: CustomerListing | null): item is CustomerListing => item !== null);

  const extractRoomNum = (title: string): number => {
    if (!title) return 99999;
    const roomCodePart = title.split('—')[1]?.trim() || title;
    const match = roomCodePart.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 99999;
  };

  return mappedListings.sort((a: CustomerListing, b: CustomerListing) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    const numA = extractRoomNum(a.title);
    const numB = extractRoomNum(b.title);
    if (numA !== numB) return numA - numB;
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  });
}

export async function getPublicBuilding(id: string): Promise<any | null> {
  if (!id) return null;
  const isUuid = UUID_REGEX.test(id);
  
  // 1. Thử tìm trực tiếp trong bảng buildings theo id hoặc code
  let query = supabase.from('buildings').select('*');
  if (isUuid) {
    query = query.or(`id.eq.${id},code.eq.${id}`);
  } else {
    query = query.eq('code', id);
  }
  let { data, error } = await query.maybeSingle();

  // 2. Nếu không tìm thấy và id là UUID, thử kiểm tra xem đây có phải là room.id không
  if (!data && isUuid) {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('building_id')
      .eq('id', id)
      .maybeSingle();

    if (roomData?.building_id) {
      const isBldUuid = UUID_REGEX.test(roomData.building_id);
      let bQuery = supabase.from('buildings').select('*');
      if (isBldUuid) {
        bQuery = bQuery.or(`id.eq.${roomData.building_id},code.eq.${roomData.building_id}`);
      } else {
        bQuery = bQuery.eq('code', roomData.building_id);
      }
      const { data: bldFromRoom } = await bQuery.maybeSingle();
      if (bldFromRoom) data = bldFromRoom;
    }
  }

  if (error && !data) throw error;
  return data;
}
