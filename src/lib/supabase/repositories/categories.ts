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

export const DEFAULT_PRICE_RANGES: DBPriceRange[] = [
  { id: 'def-p1', company_id: null, label: 'Dưới 3 triệu', min: 0, max: 3000000, created_at: '', updated_at: '' },
  { id: 'def-p2', company_id: null, label: '3 - 5 triệu', min: 3000000, max: 5000000, created_at: '', updated_at: '' },
  { id: 'def-p3', company_id: null, label: '5 - 7 triệu', min: 5000000, max: 7000000, created_at: '', updated_at: '' },
  { id: 'def-p4', company_id: null, label: '7 - 10 triệu', min: 7000000, max: 10000000, created_at: '', updated_at: '' },
  { id: 'def-p5', company_id: null, label: 'Trên 10 triệu', min: 10000000, max: null, created_at: '', updated_at: '' },
];

export async function getPriceRanges(companyId: string): Promise<DBPriceRange[]> {
  let query = supabase.from('price_ranges').select('*');
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }
  const { data, error } = await query.order('min', { ascending: true });
  if (error) throw error;

  const mergedMap = new Map<string, DBPriceRange>();
  DEFAULT_PRICE_RANGES.forEach((item) => {
    mergedMap.set((item.label || '').trim().toLowerCase(), item);
  });

  if (data && data.length > 0) {
    data.forEach((item: DBPriceRange) => {
      mergedMap.set((item.label || '').trim().toLowerCase(), item);
    });
  }

  return Array.from(mergedMap.values());
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

// ─── Amenities & Rental Rules ────────────────────────────────────────────────

export interface DBAmenity {
  id: string;
  company_id: string | null;
  name: string;
  icon: string | null;
  category?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_AMENITIES: DBAmenity[] = [
  { id: 'def-a1', company_id: null, name: 'Wifi tốc độ cao', icon: '📶', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a2', company_id: null, name: 'Điều hòa', icon: '❄️', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a3', company_id: null, name: 'Bình nóng lạnh', icon: '♨️', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a4', company_id: null, name: 'Máy giặt', icon: '🧺', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a5', company_id: null, name: 'Giường & nệm cao cấp', icon: '🛏️', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a6', company_id: null, name: 'Tủ quần áo', icon: '🚪', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a7', company_id: null, name: 'Khu vực bếp', icon: '🍳', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a8', company_id: null, name: 'Ban công / Cửa sổ thoáng', icon: '🌇', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a9', company_id: null, name: 'Thang máy', icon: '🛗', category: 'amenity', created_at: '', updated_at: '' },
  { id: 'def-a10', company_id: null, name: 'Cửa khóa vân tay', icon: '🔒', category: 'amenity', created_at: '', updated_at: '' },
];

export const DEFAULT_RENTAL_RULES: DBAmenity[] = [
  { id: 'def-r1', company_id: null, name: 'Cho phép nuôi thú cưng (Pet)', icon: '🐶', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
  { id: 'def-r2', company_id: null, name: 'Giờ giấc tự do 24/7', icon: '🔑', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
  { id: 'def-r3', company_id: null, name: 'Không chung chủ', icon: '🏠', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
  { id: 'def-r4', company_id: null, name: 'Cho phép sạc xe điện VinFast', icon: '⚡', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
  { id: 'def-r5', company_id: null, name: 'Khóa cửa vân tay / Thẻ từ', icon: '🔒', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
  { id: 'def-r6', company_id: null, name: 'Cấm hút thuốc trong phòng', icon: '🚭', category: 'rule', description: 'Quy định cho phòng', created_at: '', updated_at: '' },
  { id: 'def-r7', company_id: null, name: 'Hợp đồng tối thiểu 6 - 12 tháng', icon: '📄', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
  { id: 'def-r8', company_id: null, name: 'Có chỗ để xe máy / Ô tô', icon: '🚗', category: 'rule', description: 'Quy định chung', created_at: '', updated_at: '' },
];

export async function getAmenities(companyId: string, category?: string): Promise<DBAmenity[]> {
  let query = supabase.from('amenities').select('*');
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  if (category === 'rule') {
    query = query.eq('category', 'rule');
  } else if (category === 'amenity') {
    query = query.or('category.eq.amenity,category.is.null');
  }

  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw error;

  const defaults = category === 'rule' ? DEFAULT_RENTAL_RULES : DEFAULT_AMENITIES;
  const mergedMap = new Map<string, DBAmenity>();

  defaults.forEach((item) => {
    mergedMap.set(item.name.trim().toLowerCase(), item);
  });

  if (data && data.length > 0) {
    data.forEach((item: DBAmenity) => {
      mergedMap.set(item.name.trim().toLowerCase(), item);
    });
  }

  return Array.from(mergedMap.values());
}

export const DEFAULT_AREAS: DBAmenity[] = [
  { id: 'def-ar1', company_id: null, name: 'Cầu Giấy', icon: '📍', category: 'area', description: 'Khu vực chính', created_at: '', updated_at: '' },
  { id: 'def-ar2', company_id: null, name: 'Đống Đa', icon: '📍', category: 'area', description: 'Khu vực chính', created_at: '', updated_at: '' },
  { id: 'def-ar3', company_id: null, name: 'Tây Hồ', icon: '📍', category: 'area', description: 'Khu vực chính', created_at: '', updated_at: '' },
  { id: 'def-ar4', company_id: null, name: 'Thanh Xuân', icon: '📍', category: 'area', description: 'Khu vực chính', created_at: '', updated_at: '' },
  { id: 'def-ar5', company_id: null, name: 'Nam Từ Liêm', icon: '📍', category: 'area', description: 'Khu vực chính', created_at: '', updated_at: '' },
  { id: 'def-ar6', company_id: null, name: 'Bắc Từ Liêm', icon: '📍', category: 'area', description: 'Khu vực chính', created_at: '', updated_at: '' },
  { id: 'def-ar7', company_id: null, name: 'Giáp ranh Cầu Giấy - Nam Từ Liêm', icon: '🗺️', category: 'area', description: 'Vùng giáp ranh', created_at: '', updated_at: '' },
  { id: 'def-ar8', company_id: null, name: 'Giáp ranh Thanh Xuân - Đống Đa', icon: '🗺️', category: 'area', description: 'Vùng giáp ranh', created_at: '', updated_at: '' },
  { id: 'def-ar9', company_id: null, name: 'Khu vực Ngã Tư Sở', icon: '🗺️', category: 'area', description: 'Vùng giáp ranh', created_at: '', updated_at: '' },
];

export async function getAreas(companyId?: string | null): Promise<DBAmenity[]> {
  const mergedMap = new Map<string, DBAmenity>();

  // 1. Thêm các khu vực mặc định
  DEFAULT_AREAS.forEach((item) => {
    mergedMap.set(item.name.trim().toLowerCase(), item);
  });

  try {
    // 2. Quét các khu vực thực tế đang có trong bảng buildings
    let bldQuery = supabase.from('buildings').select('area');
    if (companyId) {
      bldQuery = bldQuery.or(`company_id.eq.${companyId},company_id.is.null`);
    }
    const { data: bldData } = await bldQuery;
    if (bldData && bldData.length > 0) {
      const realBuildingAreas = Array.from(
        new Set(bldData.map((b: any) => b.area?.trim()).filter(Boolean))
      );
      realBuildingAreas.forEach((areaName: any, idx: number) => {
        const key = areaName.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: `bld-area-${idx}`,
            company_id: companyId || null,
            name: areaName,
            icon: '📍',
            category: 'area',
            created_at: '',
            updated_at: '',
          });
        }
      });
    }

    // 3. Quét các khu vực do người dùng tùy chỉnh thêm vào bảng amenities (category = 'area')
    let customQuery = supabase.from('amenities').select('*').eq('category', 'area');
    if (companyId) {
      customQuery = customQuery.or(`company_id.eq.${companyId},company_id.is.null`);
    }
    const { data: customData } = await customQuery;
    if (customData && customData.length > 0) {
      customData.forEach((item: DBAmenity) => {
        mergedMap.set(item.name.trim().toLowerCase(), item);
      });
    }
  } catch (e) {
    console.error('Error fetching areas:', e);
  }

  return Array.from(mergedMap.values());
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
  icon?: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_ROOM_TYPES: DBRoomType[] = [
  { id: 'def-studio', company_id: null, name: 'Studio', icon: '🏢', description: 'Phòng Studio khép kín hiện đại', created_at: '', updated_at: '' },
  { id: 'def-1n1k', company_id: null, name: '1N1K', icon: '🛋️', description: '1 Phòng ngủ + 1 Phòng khách', created_at: '', updated_at: '' },
  { id: 'def-2n1k', company_id: null, name: '2N1K', icon: '🏡', description: '2 Phòng ngủ + 1 Phòng khách', created_at: '', updated_at: '' },
  { id: 'def-2n1k1wc', company_id: null, name: '2N1K-1WC', icon: '🚪', description: '2 Phòng ngủ + 1 Phòng khách 1 WC', created_at: '', updated_at: '' },
  { id: 'def-1n1gac', company_id: null, name: '1 Ngủ 1 Gác xép', icon: '🛏️', description: 'Phòng 1 ngủ + 1 gác xép', created_at: '', updated_at: '' },
  { id: 'def-gacxep', company_id: null, name: 'Gác xép', icon: '🪜', description: 'Phòng gác xép / Mezzanine', created_at: '', updated_at: '' },
  { id: 'def-giuongtang', company_id: null, name: 'Giường tầng', icon: '🛌', description: 'Ký túc xá / Room có giường tầng', created_at: '', updated_at: '' },
  { id: 'def-mbkd', company_id: null, name: 'MBKD', icon: '🏪', description: 'Mặt bằng kinh doanh', created_at: '', updated_at: '' },
  { id: 'def-duplex', company_id: null, name: 'Duplex', icon: '🌇', description: 'Căn hộ Duplex thông tầng', created_at: '', updated_at: '' },
  { id: 'def-khac', company_id: null, name: 'Khác', icon: '🏠', description: 'Loại phòng khác', created_at: '', updated_at: '' }
];

export async function getRoomTypes(companyId?: string | null): Promise<DBRoomType[]> {
  let query = supabase.from('room_types').select('*');
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }
  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw error;

  const mergedMap = new Map<string, DBRoomType>();
  DEFAULT_ROOM_TYPES.forEach((item) => {
    mergedMap.set((item.name || '').trim().toLowerCase(), item);
  });

  if (data && data.length > 0) {
    data.forEach((item: DBRoomType) => {
      mergedMap.set((item.name || '').trim().toLowerCase(), item);
    });
  }

  return Array.from(mergedMap.values());
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
