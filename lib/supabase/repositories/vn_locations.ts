import { supabase } from '@/lib/supabase/client';

export interface VnProvince {
  id: string;
  name: string;
}

export interface VnDistrict {
  id: string;
  name: string;
  province_id: string;
}

export interface VnWard {
  id: string;
  name: string;
  level: string;
  district_id: string;
}

export async function getProvinces(): Promise<VnProvince[]> {
  const { data, error } = await supabase
    .from('vn_provinces')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDistricts(provinceId?: string): Promise<VnDistrict[]> {
  let query = supabase.from('vn_districts').select('*').order('name', { ascending: true });
  if (provinceId) query = query.eq('province_id', provinceId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getWards(districtId: string): Promise<VnWard[]> {
  const { data, error } = await supabase
    .from('vn_wards')
    .select('*')
    .eq('district_id', districtId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
