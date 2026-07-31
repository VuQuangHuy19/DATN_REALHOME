/**
 * Utility Geocoding & Tính toán khoảng cách bán kính (Haversine Formula)
 * Phục vụ tìm kiếm bất động sản theo địa danh / tọa độ bán kính cho RealHome
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
  displayName?: string;
}

/**
 * Tính khoảng cách địa lý theo đường chim bay giữa 2 tọa độ (đơn vị: KM)
 * Sử dụng công thức Haversine
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính trái đất (KM)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Làm tròn 1 chữ số thập phân (ví dụ: 0.8 km, 2.5 km)
  return Math.round(distance * 10) / 10;
}

const HANOI_LANDMARKS: Record<string, GeoCoordinates> = {
  'đê la thành': { lat: 21.0253, lng: 105.8197, displayName: 'Đường Đê La Thành, Đống Đa, Hà Nội' },
  'de la thanh': { lat: 21.0253, lng: 105.8197, displayName: 'Đường Đê La Thành, Đống Đa, Hà Nội' },
  'cầu giấy': { lat: 21.0362, lng: 105.7906, displayName: 'Quận Cầu Giấy, Hà Nội' },
  'cau giay': { lat: 21.0362, lng: 105.7906, displayName: 'Quận Cầu Giấy, Hà Nội' },
  'đống đa': { lat: 21.0130, lng: 105.8275, displayName: 'Quận Đống Đa, Hà Nội' },
  'dong da': { lat: 21.0130, lng: 105.8275, displayName: 'Quận Đống Đa, Hà Nội' },
  'ba đình': { lat: 21.0341, lng: 105.8270, displayName: 'Quận Ba Đình, Hà Nội' },
  'ba dinh': { lat: 21.0341, lng: 105.8270, displayName: 'Quận Ba Đình, Hà Nội' },
  'tây hồ': { lat: 21.0694, lng: 105.8239, displayName: 'Quận Tây Hồ, Hà Nội' },
  'tay ho': { lat: 21.0694, lng: 105.8239, displayName: 'Quận Tây Hồ, Hà Nội' },
  'thanh xuân': { lat: 20.9950, lng: 105.8000, displayName: 'Quận Thanh Xuân, Hà Nội' },
  'thanh xuan': { lat: 20.9950, lng: 105.8000, displayName: 'Quận Thanh Xuân, Hà Nội' },
  'nam từ liêm': { lat: 21.0132, lng: 105.7645, displayName: 'Quận Nam Từ Liêm, Hà Nội' },
  'nam tu liem': { lat: 21.0132, lng: 105.7645, displayName: 'Quận Nam Từ Liêm, Hà Nội' },
  'bắc từ liêm': { lat: 21.0617, lng: 105.7615, displayName: 'Quận Bắc Từ Liêm, Hà Nội' },
  'bac tu liem': { lat: 21.0617, lng: 105.7615, displayName: 'Quận Bắc Từ Liêm, Hà Nội' },
  'hoàng mai': { lat: 20.9725, lng: 105.8500, displayName: 'Quận Hoàng Mai, Hà Nội' },
  'hoang mai': { lat: 20.9725, lng: 105.8500, displayName: 'Quận Hoàng Mai, Hà Nội' },
  'hai bà trưng': { lat: 21.0080, lng: 105.8520, displayName: 'Quận Hai Bà Trưng, Hà Nội' },
  'hai ba trung': { lat: 21.0080, lng: 105.8520, displayName: 'Quận Hai Bà Trưng, Hà Nội' },
  'hoàn kiếm': { lat: 21.0285, lng: 105.8542, displayName: 'Quận Hoàn Kiếm, Hà Nội' },
  'hoan kiem': { lat: 21.0285, lng: 105.8542, displayName: 'Quận Hoàn Kiếm, Hà Nội' },
  'hà đông': { lat: 20.9712, lng: 105.7766, displayName: 'Quận Hà Đông, Hà Nội' },
  'ha dong': { lat: 20.9712, lng: 105.7766, displayName: 'Quận Hà Đông, Hà Nội' },
  'nguyễn trãi': { lat: 20.9934, lng: 105.8055, displayName: 'Đường Nguyễn Trãi, Hà Nội' },
  'nguyen trai': { lat: 20.9934, lng: 105.8055, displayName: 'Đường Nguyễn Trãi, Hà Nội' },
  'hoàng hoa thám': { lat: 21.0425, lng: 105.8185, displayName: 'Đường Hoàng Hoa Thám, Hà Nội' },
  'hoang hoa tham': { lat: 21.0425, lng: 105.8185, displayName: 'Đường Hoàng Hoa Thám, Hà Nội' },
  'mễ trì': { lat: 21.0090, lng: 105.7794, displayName: 'Phường Mễ Trì, Nam Từ Liêm, Hà Nội' },
  'me tri': { lat: 21.0090, lng: 105.7794, displayName: 'Phường Mễ Trì, Nam Từ Liêm, Hà Nội' },
  'nguyễn ngọc vũ': { lat: 21.0095, lng: 105.8090, displayName: 'Đường Nguyễn Ngọc Vũ, Cầu Giấy, Hà Nội' },
  'nguyen ngoc vu': { lat: 21.0095, lng: 105.8090, displayName: 'Đường Nguyễn Ngọc Vũ, Cầu Giấy, Hà Nội' },
  'âu cơ': { lat: 21.0650, lng: 105.8250, displayName: 'Đường Âu Cơ, Tây Hồ, Hà Nội' },
  'au co': { lat: 21.0650, lng: 105.8250, displayName: 'Đường Âu Cơ, Tây Hồ, Hà Nội' },
  'bách khoa': { lat: 21.0047, lng: 105.8440, displayName: 'Đại học Bách Khoa Hà Nội' },
  'bach khoa': { lat: 21.0047, lng: 105.8440, displayName: 'Đại học Bách Khoa Hà Nội' },
  'ngoại thương': { lat: 21.0232, lng: 105.8080, displayName: 'Đại học Ngoại Thương, Đống Đa, Hà Nội' },
  'ngoai thuong': { lat: 21.0232, lng: 105.8080, displayName: 'Đại học Ngoại Thương, Đống Đa, Hà Nội' },
  'quốc gia': { lat: 21.0375, lng: 105.7818, displayName: 'Đại học Quốc Gia Hà Nội, Cầu Giấy' },
  'quoc gia': { lat: 21.0375, lng: 105.7818, displayName: 'Đại học Quốc Gia Hà Nội, Cầu Giấy' },
};

const geocodeCache = new Map<string, GeoCoordinates | null>();

/**
 * Chuyển tên địa danh / trường học / địa chỉ thành tọa độ địa lý (lat, lng)
 * Sử dụng Dịch vụ OpenStreetMap Nominatim API (Free & Không cần API Key)
 */
export async function geocodeLandmark(query: string): Promise<GeoCoordinates | null> {
  if (!query || !query.trim()) return null;

  const cleanQuery = query.trim().toLowerCase();

  // 1. Kiểm tra từ điển tọa độ địa danh cố định tại Hà Nội (0ms, siêu nhanh & chính xác 100%)
  for (const [key, coords] of Object.entries(HANOI_LANDMARKS)) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      return coords;
    }
  }

  // 2. Kiểm tra Cache
  if (geocodeCache.has(cleanQuery)) {
    return geocodeCache.get(cleanQuery) || null;
  }

  try {
    // Bổ sung ', Hà Nội, Việt Nam' làm ưu tiên hàng đầu nếu chưa có địa danh tỉnh/thành
    const searchQuery = cleanQuery.includes('hà nội') ||cleanQuery.includes('Hà Nội')|| cleanQuery.includes('hanoi')
      ? cleanQuery
      : `${cleanQuery}, Hà Nội, Việt Nam`;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=vn&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RealHome-App/1.0 (contact@realhome.vn)',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      console.warn(`[Geocoding] Nominatim API responded with status ${response.status}`);
      geocodeCache.set(cleanQuery, null);
      return null;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        const result = {
          lat,
          lng,
          displayName: data[0].display_name,
        };
        geocodeCache.set(cleanQuery, result);
        return result;
      }
    }

    geocodeCache.set(cleanQuery, null);
    return null;
  } catch (err: any) {
    console.warn('[Geocoding] Exception or timeout during geocoding:', err?.message || err);
    return null;
  }
}
