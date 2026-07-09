import { supabase } from '@/lib/supabase/client';

// ─── Price Ranges ───────────────────────────────────────────────────────────

export interface DBPriceRange {
  id: string;
  company_id: string | null;
  label: string;
  min: number;
  max: number | null;
  created_at: string;
  updated_at: string;
}

export async function getPriceRanges(companyId: string): Promise<DBPriceRange[]> {
  const { data, error } = await supabase
    .from('price_ranges')
    .select('*')
    .eq('company_id', companyId)
    .order('min', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPriceRange(payload: Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>): Promise<DBPriceRange> {
  const { data, error } = await supabase
    .from('price_ranges')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePriceRange(id: string, payload: Partial<Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>>): Promise<DBPriceRange> {
  const { data, error } = await supabase
    .from('price_ranges')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePriceRange(id: string): Promise<void> {
  const { error } = await supabase.from('price_ranges').delete().eq('id', id);
  if (error) throw error;
}

// ─── Amenities ──────────────────────────────────────────────────────────────

export interface DBAmenity {
  id: string;
  company_id: string | null;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAmenities(companyId: string): Promise<DBAmenity[]> {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAmenity(payload: Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>): Promise<DBAmenity> {
  const { data, error } = await supabase
    .from('amenities')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAmenity(id: string, payload: Partial<Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>>): Promise<DBAmenity> {
  const { data, error } = await supabase
    .from('amenities')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAmenity(id: string): Promise<void> {
  const { error } = await supabase.from('amenities').delete().eq('id', id);
  if (error) throw error;
}

// ─── Room Types ─────────────────────────────────────────────────────────────

export interface DBRoomType {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function getRoomTypes(companyId: string): Promise<DBRoomType[]> {
  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createRoomType(payload: Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>): Promise<DBRoomType> {
  const { data, error } = await supabase
    .from('room_types')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoomType(id: string, payload: Partial<Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>>): Promise<DBRoomType> {
  const { data, error } = await supabase
    .from('room_types')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoomType(id: string): Promise<void> {
  const { error } = await supabase.from('room_types').delete().eq('id', id);
  if (error) throw error;
}
