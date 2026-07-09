export interface CustomerListing {
  id: string;
  title: string;
  description: string;
  price: number;
  area: string;
  size: number;
  roomType: string;
  status: 'available' | 'rented' | 'maintenance' | 'reserved' | 'soon_available';
  address: string;
  buildingId: string;
  buildingName: string;
  bedrooms: number;
  bathrooms: number;
  floor: number;
  yearBuilt: number | null;
  imageUrl: string;
  imageUrls?: string[];
  companyId: string;
  hasElevator?: boolean;
  pcccCertified?: boolean;
  commonDryingArea?: string | null;
  allowPet?: boolean;
  allowForeigners?: boolean;
  allowVinfastElectric?: boolean;
  hasPrivateBalcony?: boolean;
  maxOccupants?: number;
  maxVehiclesPerRoom?: number;
  minContractMonths?: number;
  hasAirConditioner?: boolean;
  hasWaterHeater?: boolean;
  hasBed?: boolean;
  hasWardrobe?: boolean;
  hasKitchenCabinet?: boolean;
  hasRefrigerator?: boolean;
  hasHood?: boolean;
  hasDressingTable?: boolean;
  expectedAvailableDate?: string | null;
  landlordId?: string | null;
  buildingCode?: string | null;
  depositTerms?: string | null;
}

export interface PublicCompany {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  owner_email?: string | null;
}
