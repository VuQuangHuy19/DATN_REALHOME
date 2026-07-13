import { supabase, isUserLoggedIn } from '../client';
import { mapRoomToListing } from '@/lib/customer/listing-mapper';
import type { CustomerListing, PublicCompany } from '@/lib/customer/types';
import { getRoomDisplayStatus } from '@/lib/room-status';

const companySelect = 'id, name, code, phone, address, owner_email';

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
  if (ds.status === 'soon_available') {
    if (!ds.expectedEmptyDate) return false;
    const end = new Date(ds.expectedEmptyDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }
  return false;
}

export async function getPublicListings(companyId: string | string[], showAll: boolean = false): Promise<CustomerListing[]> {
  const loggedIn = await isUserLoggedIn();
  const selectFields = loggedIn
    ? '*, buildings(*), room_images(*), rental_contracts(*)'
    : '*, buildings(*), room_images(*)';

  let query = supabase
    .from('rooms')
    .select(selectFields);

  if (Array.isArray(companyId)) {
    query = query.in('company_id', companyId);
  } else if (companyId.includes(',')) {
    query = query.in('company_id', companyId.split(',').map((id) => id.trim()));
  } else {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => showAll || filterPublicListing(row))
    .map((row: Parameters<typeof mapRoomToListing>[0]) => mapRoomToListing(row))
    .filter((item: CustomerListing | null): item is CustomerListing => item !== null);
}

export async function getPublicListing(id: string): Promise<CustomerListing | null> {
  const loggedIn = await isUserLoggedIn();
  const selectFields = loggedIn
    ? '*, buildings(*), room_images(*), rental_contracts(*)'
    : '*, buildings(*), room_images(*)';

  const { data, error } = await supabase
    .from('rooms')
    .select(selectFields)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapRoomToListing(data as Parameters<typeof mapRoomToListing>[0]);
}

export async function getPublicListingsByIds(ids: string[], companyId?: string | string[] | null, showAll: boolean = false): Promise<CustomerListing[]> {
  if (ids.length === 0) return [];

  const loggedIn = await isUserLoggedIn();
  const selectFields = loggedIn
    ? '*, buildings(*), room_images(*), rental_contracts(*)'
    : '*, buildings(*), room_images(*)';

  let query = supabase
    .from('rooms')
    .select(selectFields)
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
  const { data: buildingData, error: bError } = await supabase
    .from('buildings')
    .select('code')
    .eq('id', buildingId)
    .maybeSingle();

  if (bError) throw bError;
  if (!buildingData) return [];

  const loggedIn = await isUserLoggedIn();
  const selectFields = loggedIn
    ? '*, buildings(*), room_images(*), rental_contracts(*)'
    : '*, buildings(*), room_images(*)';

  const { data, error } = await supabase
    .from('rooms')
    .select(selectFields)
    .eq('building_id', buildingData.code)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => showAll || filterPublicListing(row))
    .map((row: Parameters<typeof mapRoomToListing>[0]) => mapRoomToListing(row))
    .filter((item: CustomerListing | null): item is CustomerListing => item !== null);
}

export async function getPublicBuilding(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}



