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

const STATIC_PROVINCES: VnProvince[] = [
  { id: '01', name: 'Hà Nội' },
  { id: '79', name: 'TP. Hồ Chí Minh' },
  { id: '48', name: 'Đà Nẵng' },
  { id: '31', name: 'Hải Phòng' },
  { id: '92', name: 'Cần Thơ' },
  { id: '74', name: 'Bình Dương' },
  { id: '75', name: 'Đồng Nai' },
];

const STATIC_DISTRICTS: VnDistrict[] = [
  // Hà Nội
  { id: '01_dongda', name: 'Quận Đống Đa', province_id: '01' },
  { id: '01_caugiay', name: 'Quận Cầu Giấy', province_id: '01' },
  { id: '01_badinh', name: 'Quận Ba Đình', province_id: '01' },
  { id: '01_haibatrung', name: 'Quận Hai Bà Trưng', province_id: '01' },
  { id: '01_thanhxuan', name: 'Quận Thanh Xuân', province_id: '01' },
  { id: '01_namtuliem', name: 'Quận Nam Từ Liêm', province_id: '01' },
  { id: '01_bactuliem', name: 'Quận Bắc Từ Liêm', province_id: '01' },
  { id: '01_hadong', name: 'Quận Hà Đông', province_id: '01' },
  { id: '01_hoangmai', name: 'Quận Hoàng Mai', province_id: '01' },
  { id: '01_tayho', name: 'Quận Tây Hồ', province_id: '01' },
  { id: '01_longbien', name: 'Quận Long Biên', province_id: '01' },
  { id: '01_gialam', name: 'Huyện Gia Lâm', province_id: '01' },
  { id: '01_donganh', name: 'Huyện Đông Anh', province_id: '01' },
  { id: '01_hoaiduc', name: 'Huyện Hoài Đức', province_id: '01' },
  { id: '01_thanhtri', name: 'Huyện Thanh Trì', province_id: '01' },

  // TP. HCM
  { id: '79_q1', name: 'Quận 1', province_id: '79' },
  { id: '79_q3', name: 'Quận 3', province_id: '79' },
  { id: '79_q5', name: 'Quận 5', province_id: '79' },
  { id: '79_q7', name: 'Quận 7', province_id: '79' },
  { id: '79_q10', name: 'Quận 10', province_id: '79' },
  { id: '79_thuduc', name: 'TP. Thủ Đức', province_id: '79' },
  { id: '79_binhthanh', name: 'Quận Bình Thạnh', province_id: '79' },
  { id: '79_tanbinh', name: 'Quận Tân Bình', province_id: '79' },
  { id: '79_govap', name: 'Quận Gò Vấp', province_id: '79' },
  { id: '79_phunhuan', name: 'Quận Phú Nhuận', province_id: '79' },
];

export async function getProvinces(): Promise<VnProvince[]> {
  return STATIC_PROVINCES;
}

export async function getDistricts(provinceId?: string): Promise<VnDistrict[]> {
  if (!provinceId) return STATIC_DISTRICTS;
  return STATIC_DISTRICTS.filter((d) => d.province_id === provinceId);
}

export async function getWards(_districtId: string): Promise<VnWard[]> {
  return [];
}
