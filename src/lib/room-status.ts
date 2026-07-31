import type { DBRoom, DBRentalContract } from '@/lib/supabase/types';

// Helper parse expected empty date (YYYY-MM-DD) from description
export const parseSoonAvailableDate = (description: string | null): string | null => {
  if (!description) return null;
  const match = description.match(/\[Sắp trống:\s*(\d{4}-\d{2}-\d{2})\]/);
  return match ? match[1] : null;
};

// Helper update expected empty date in description
export const updateSoonAvailableDescription = (description: string | null, dateStr: string | null): string | null => {
  const cleanDesc = (description || '').replace(/\s*\[Sắp trống:\s*\d{4}-\d{2}-\d{2}\]/g, '').trim();
  if (!dateStr) return cleanDesc || null;
  return `${cleanDesc} [Sắp trống: ${dateStr}]`.trim();
};

// Helper format date for display (YYYY-MM-DD -> DD/MM/YYYY)
export const formatDateDisplay = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export interface RoomDisplayStatus {
  status: string;
  label: string;
  colorClass: string;
  expectedEmptyDate: string | null;
  isSoonAvailable: boolean;
}

// Compute display status for a room based on database status and active contracts
export const getRoomDisplayStatus = (
  room: DBRoom,
  contracts: DBRentalContract[] = [],
  depositContracts: any[] = []
): RoomDisplayStatus => {
  // 1. Check for manual override in description
  const manualDate = parseSoonAvailableDate(room.description);
  if (manualDate) {
    return {
      status: 'soon_available',
      label: `Sắp trống (${formatDateDisplay(manualDate)})`,
      colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
      expectedEmptyDate: manualDate,
      isSoonAvailable: true
    };
  }

  // 2. Check active contracts ending in <= 30 days
  const roomContract = contracts.find(
    (c) => c.room_id === room.id && c.status === 'active'
  );
  if (roomContract) {
    const end = new Date(roomContract.end_date);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) {
      return {
        status: 'soon_available',
        label: `Sắp trống (${diffDays} ngày)`,
        colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
        expectedEmptyDate: roomContract.end_date,
        isSoonAvailable: true
      };
    }
  }

  // 3. Fallback to normal status
  if (room.status === 'rented') {
    return {
      status: 'rented',
      label: 'Đã cho thuê',
      colorClass: 'bg-red-100 text-red-700 border-red-200',
      expectedEmptyDate: null,
      isSoonAvailable: false
    };
  }
  if (room.status === 'available') {
    return {
      status: 'available',
      label: 'Còn trống',
      colorClass: 'bg-green-100 text-green-700 border-green-200',
      expectedEmptyDate: null,
      isSoonAvailable: false
    };
  }
  if (room.status === 'maintenance') {
    return {
      status: 'maintenance',
      label: 'Bảo trì',
      colorClass: 'bg-orange-100 text-orange-700 border-orange-200',
      expectedEmptyDate: null,
      isSoonAvailable: false
    };
  }
  if (room.status === 'reserved') {
    const isExpiredLock = room.reserved_until ? new Date(room.reserved_until) < new Date() : false;
    const hasActiveDeposit = (depositContracts || []).some(
      (dc: any) => dc.room_id === room.id && ['active', 'signed'].includes(dc.status)
    );
    if (isExpiredLock && !hasActiveDeposit) {
      return {
        status: 'available',
        label: 'Còn trống',
        colorClass: 'bg-green-100 text-green-700 border-green-200',
        expectedEmptyDate: null,
        isSoonAvailable: false
      };
    }
    return {
      status: 'reserved',
      label: 'Đặt trước / Đang giữ',
      colorClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      expectedEmptyDate: null,
      isSoonAvailable: false
    };
  }

  return {
    status: room.status,
    label: room.status,
    colorClass: 'bg-gray-100 text-gray-700 border-gray-200',
    expectedEmptyDate: null,
    isSoonAvailable: false
  };
};
