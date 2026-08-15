import { supabase, isUserLoggedIn } from '../client';
import { mapRoomToListing } from '@/lib/customer/listing-mapper';
import type { CustomerListing, PublicCompany } from '@/lib/customer/types';
import { getRoomDisplayStatus } from '@/lib/room-status';

const companySelect = 'id, name, code, phone, address, owner_email';

// Explicit column list — không dùng * để tránh lấy dư thừa.
// QUAN TRỌNG: KHÔNG bao giờ thêm rooms(*) vào buildings(...) — gây data explosion & timeout.
const buildingFields = `
  id, name, area, address, landlord_id, year_built,
  image_url, thumbnail_url, description, deposit_terms, has_elevator,
  pccc_certified, common_drying_area, allow_pet, allow_foreigners,
  allow_vinfast_electric, has_air_conditioner, has_water_heater, has_bed,
  has_wardrobe, has_kitchen_cabinet, has_refrigerator, has_hood,
  has_dressing_table, latitude, longitude
`.trim();

const roomFields = `
  id, code, floor, room_type, size, price, status, bedrooms, bathrooms,
  description, building_id, company_id, landlord_id, available_date,
  has_private_balcony, max_occupants, max_vehicles_per_room, min_contract_months,
  deposit_terms, created_at,
  buildings(${buildingFields}),
  room_images(url, thumbnail_url, is_thumbnail, priority, media_type),
  rental_contracts(id, status, end_date)
`.trim();

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

  return (data ?? [])
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

  return mapRoomToListing(data as Parameters<typeof mapRoomToListing>[0]);
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

  return (data ?? [])
    .filter((row: any) => showAll || filterPublicListing(row))
    .map((row: Parameters<typeof mapRoomToListing>[0]) => mapRoomToListing(row))
    .filter((item: CustomerListing | null): item is CustomerListing => item !== null);
}

export async function getPublicListingsByBuilding(buildingId: string, showAll: boolean = false): Promise<CustomerListing[]> {
  const { data: buildingData } = await supabase
    .from('buildings')
    .select('id, code')
    .or(`id.eq.${buildingId},code.eq.${buildingId}`)
    .maybeSingle();

  const buildingKeys = Array.from(
    new Set([buildingId, buildingData?.id, buildingData?.code].filter(Boolean) as string[])
  );
  if (buildingKeys.length === 0) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select(roomFields)
    .in('building_id', buildingKeys)
    .order('created_at', { ascending: false })
    .limit(200); // Hard cap

  if (error) throw error;

  const mappedListings = (data ?? [])
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
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .or(`id.eq.${id},code.eq.${id}`)
    .maybeSingle();

  if (error) throw error;
  return data;
}
