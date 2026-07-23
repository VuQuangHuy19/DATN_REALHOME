import { PLACEHOLDER_LISTING_IMAGE } from './constants';
import type { CustomerListing } from './types';
import { getRoomDisplayStatus } from '@/lib/room-status';

type RoomRow = {
  id: string;
  company_id: string | null;
  building_id: string | null;
  code: string;
  floor: number;
  room_type: string | null;
  size: number | null;
  price: number;
  status: 'available' | 'rented' | 'maintenance' | 'reserved';
  bedrooms: number;
  bathrooms: number;
  description: string | null;
  has_private_balcony?: boolean | null;
  max_occupants?: number | null;
  max_vehicles_per_room?: number | null;
  min_contract_months?: number | null;
  landlord_id?: string | null;
  deposit_terms?: string | null;
  created_at?: string;
  buildings: {
    id: string;
    name: string;
    area: string;
    address: string | null;
    landlord_id?: string | null;
    year_built: number | null;
    image_url: string | null;
    thumbnail_url?: string | null;
    description: string | null;
    deposit_terms?: string | null;
    has_elevator?: boolean | null;
    pccc_certified?: boolean | null;
    common_drying_area?: string | null;
    allow_pet?: boolean | null;
    allow_foreigners?: boolean | null;
    allow_vinfast_electric?: boolean | null;
    has_air_conditioner?: boolean | null;
    has_water_heater?: boolean | null;
    has_bed?: boolean | null;
    has_wardrobe?: boolean | null;
    has_kitchen_cabinet?: boolean | null;
    has_refrigerator?: boolean | null;
    has_hood?: boolean | null;
    has_dressing_table?: boolean | null;
    district_id?: string | null;
    ward_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  room_images?: { url: string; thumbnail_url?: string | null; is_thumbnail: boolean; priority: number; media_type?: string }[] | null;
  rental_contracts?: any[] | null;
};

export function mapRoomToListing(room: RoomRow): CustomerListing | null {
  if (!room.company_id) return null;

  const building = room.buildings;
  const buildingName = building?.name ?? 'Tòa nhà';
  const roomType = room.room_type ?? 'Phòng';

  const isVideoStr = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm');
  };

  // Chọn ảnh đại diện từ room_images hoặc fallback về ảnh của Tòa nhà
  let buildingImage = building?.image_url;
  let buildingThumbnail = building?.thumbnail_url || building?.image_url;
  if (buildingImage && isVideoStr(buildingImage)) {
    buildingImage = PLACEHOLDER_LISTING_IMAGE;
    buildingThumbnail = PLACEHOLDER_LISTING_IMAGE;
  }

  let imageUrl = buildingImage || PLACEHOLDER_LISTING_IMAGE;
  let imageUrls: string[] = [];
  let thumbnailUrl = buildingThumbnail || PLACEHOLDER_LISTING_IMAGE;
  let thumbnailUrls: string[] = [];

  if (room.room_images && room.room_images.length > 0) {
    const sorted = [...room.room_images].sort((a, b) => a.priority - b.priority);
    imageUrls = sorted.map((img) => img.url);
    thumbnailUrls = sorted.map((img) => img.thumbnail_url || img.url);
    
    let coverImg = sorted.find((img) => img.is_thumbnail && img.media_type !== 'video' && !isVideoStr(img.url));
    if (!coverImg) {
      coverImg = sorted.find((img) => img.media_type !== 'video' && !isVideoStr(img.url));
    }

    if (coverImg) {
      imageUrl = coverImg.url;
      thumbnailUrl = coverImg.thumbnail_url || coverImg.url;
    } else {
      imageUrl = buildingImage || PLACEHOLDER_LISTING_IMAGE;
      thumbnailUrl = buildingThumbnail || PLACEHOLDER_LISTING_IMAGE;
    }
  } else {
    imageUrl = buildingImage || PLACEHOLDER_LISTING_IMAGE;
    imageUrls = [imageUrl];
    thumbnailUrl = buildingThumbnail || PLACEHOLDER_LISTING_IMAGE;
    thumbnailUrls = [thumbnailUrl];
  }

  const ds = getRoomDisplayStatus(room as any, room.rental_contracts || []);

  return {
    id: room.id,
    title: `${buildingName} — ${room.code}`,
    description: room.description || building?.description || `${roomType} tại ${building?.area ?? ''}`.trim(),
    price: room.price,
    area: building?.area ?? '',
    size: room.size ?? 0,
    roomType,
    status: ds.status as any,
    expectedAvailableDate: ds.expectedEmptyDate,
    address: building?.address ?? building?.area ?? '',
    buildingId: building?.id ?? room.building_id ?? '',
    buildingName,
    bedrooms: room.bedrooms,
    bathrooms: room.bathrooms,
    floor: room.floor,
    yearBuilt: building?.year_built ?? null,
    imageUrl,
    imageUrls,
    thumbnailUrl,
    thumbnailUrls,
    companyId: room.company_id,
    landlordId: room.landlord_id ?? building?.landlord_id ?? null,
    buildingCode: room.building_id ?? null,
    depositTerms: room.deposit_terms || building?.deposit_terms || null,
    hasElevator: building?.has_elevator ?? undefined,
    pcccCertified: building?.pccc_certified ?? undefined,
    commonDryingArea: building?.common_drying_area ?? null,
    allowPet: building?.allow_pet ?? undefined,
    allowForeigners: building?.allow_foreigners ?? undefined,
    allowVinfastElectric: building?.allow_vinfast_electric ?? undefined,
    hasPrivateBalcony: room.has_private_balcony ?? undefined,
    maxOccupants: room.max_occupants ?? undefined,
    maxVehiclesPerRoom: room.max_vehicles_per_room ?? undefined,
    minContractMonths: room.min_contract_months ?? undefined,
    hasAirConditioner: building?.has_air_conditioner ?? undefined,
    hasWaterHeater: building?.has_water_heater ?? undefined,
    hasBed: building?.has_bed ?? undefined,
    hasWardrobe: building?.has_wardrobe ?? undefined,
    hasKitchenCabinet: building?.has_kitchen_cabinet ?? undefined,
    hasRefrigerator: building?.has_refrigerator ?? undefined,
    hasHood: building?.has_hood ?? undefined,
    hasDressingTable: building?.has_dressing_table ?? undefined,
    districtId: building?.district_id ?? null,
    wardId: building?.ward_id ?? null,
    latitude: building?.latitude ?? null,
    longitude: building?.longitude ?? null,
    createdAt: room.created_at || null,
  };
}
