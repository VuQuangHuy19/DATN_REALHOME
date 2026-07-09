export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  area: string;
  size: number;
  roomType: string;
  status: 'available' | 'rented' | 'sold' | 'pending';
  amenities: string[];
  images: string[];
  address: string;
  buildingId: string;
  buildingName: string;
  bedrooms: number;
  bathrooms: number;
  floor: number;
  yearBuilt: number;
  companyId?: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  area: string;
  address: string;
  yearBuilt: number;
  totalFloors: number;
  totalRooms: number;
  description: string;
  image: string;
  landlordId?: string;
  companyId?: string;
  hasElevator?: boolean;
  pcccCertified?: boolean;
  commonDryingArea?: string;
  allowPet?: boolean;
  allowForeigners?: boolean;
  allowVinfastElectric?: boolean;
}

export interface Room {
  id: string;
  code: string;
  buildingId: string;
  buildingName: string;
  area: string;
  floor: number;
  roomType: string;
  size: number;
  price: number;
  status: 'available' | 'rented' | 'sold' | 'pending';
  bedrooms: number;
  bathrooms: number;
  description: string;
  companyId?: string;
  hasPrivateBalcony?: boolean;
  maxOccupants?: number;
  maxVehiclesPerRoom?: number;
  minContractMonths?: number;
}

export interface BuildingService {
  id: string;
  buildingId: string;
  serviceName: string;
  price: number;
  unit: string;
  createdAt: string;
}


export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  propertyId: string;
  propertyTitle: string;
  date: string;
  time: string;
  area: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  evidenceImages: string[];
  assignedTo?: string;
  leadId?: string;
  companyId?: string;
}

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  propertiesCount: number;
  notes: string;
  companyId?: string;
  code?: string | null;
  imageUrl?: string | null;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  joinDate: string;
  status: 'active' | 'inactive';
  companyId?: string;
  roleId?: string;
}

export interface Account {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'locked';
  lastLogin: string;
  createdAt: string;
  companyId?: string;
  roleId?: string;
}

export interface PriceRange {
  id: string;
  label: string;
  min: number;
  max: number;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
}

export interface Area {
  id: string;
  name: string;
  description: string;
}

// ─── SaaS / CRM Extensions ───────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  domain: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  totalUsers: number;
  totalProperties: number;
  createdAt: string;
  trialEndsAt?: string;
}

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  source: 'website' | 'referral' | 'social' | 'cold_call' | 'walk_in' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';
  interest: string;
  budget: number;
  preferredArea: string;
  preferredRoomType: string;
  assignedTo: string;
  assignedToName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
  lastContactedAt?: string;
}

export interface LeadTimeline {
  id: string;
  leadId: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'assignment';
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  propertyId?: string;
  propertyTitle?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  source: 'website' | 'phone' | 'email' | 'walk_in';
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'lead' | 'appointment' | 'contract' | 'system' | 'consultation';
  isRead: boolean;
  recipientId: string;
  link?: string;
  createdAt: string;
  companyId?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  detail: string;
  ipAddress: string;
  createdAt: string;
  companyId?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  usersCount: number;
  createdAt: string;
  companyId?: string;
}

export interface KPI {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  leadsAssigned: number;
  leadsConverted: number;
  appointmentsCompleted: number;
  contractsSigned: number;
  revenueGenerated: number;
  targetRevenue: number;
  score: number;
  status: 'on_track' | 'behind' | 'exceeded';
  companyId?: string;
}
