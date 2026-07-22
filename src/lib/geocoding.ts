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

/**
 * Chuyển tên địa danh / trường học / địa chỉ thành tọa độ địa lý (lat, lng)
 * Sử dụng Dịch vụ OpenStreetMap Nominatim API (Free & Không cần API Key)
 */
export async function geocodeLandmark(query: string): Promise<GeoCoordinates | null> {
  if (!query || !query.trim()) return null;

  try {
    const cleanQuery = query.trim();
    // Bổ sung ', Hà Nội, Việt Nam' hoặc ', Việt Nam' nếu chưa có để tăng độ chính xác tìm kiếm tại VN
    const searchQuery = cleanQuery.toLowerCase().includes('việt nam') || cleanQuery.toLowerCase().includes('vietnam')
      ? cleanQuery
      : `${cleanQuery}, Việt Nam`;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=vn&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RealHome-App/1.0 (contact@realhome.vn)',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
    });

    if (!response.ok) {
      console.warn(`[Geocoding] Nominatim API responded with status ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          lat,
          lng,
          displayName: data[0].display_name,
        };
      }
    }

    return null;
  } catch (err: any) {
    console.error('[Geocoding] Exception during geocoding:', err?.message || err);
    return null;
  }
}
