import type { DBRoom, DBRentalContract } from '@/lib/supabase/types';

// Helper parse expected empty date (YYYY-MM-DD, DD/MM/YYYY, or DD/MM) from description
export const parseSoonAvailableDate = (description: string | null): string | null => {
  if (!description) return null;
  
  // 1. Bracket Marker: [Sắp trống: YYYY-MM-DD] or [Sắp trống: DD/MM/YYYY] or [Sắp trống: DD/MM]
  const matchBracket = description.match(/\[Sắp trống:\s*([^\]]+)\]/i);
  if (matchBracket && matchBracket[1]) {
    const raw = matchBracket[1].trim();
    const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
    const dmyFull = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyFull) {
      return `${dmyFull[3]}-${dmyFull[2].padStart(2, '0')}-${dmyFull[1].padStart(2, '0')}`;
    }
    const dmyShort = raw.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (dmyShort) {
      const now = new Date();
      return `${now.getFullYear()}-${dmyShort[2].padStart(2, '0')}-${dmyShort[1].padStart(2, '0')}`;
    }
  }

  // 2. Explicit keywords: Sắp trống, Trống từ, Trống ngày, Dự kiến trống, Hết HĐ, Ra HĐ
  const keywordMatch = description.match(/(?:Sắp trống|Trống từ|Trống ngày|Dự kiến trống|Hết HĐ|Ra HĐ)\s*[:\s]*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/i);
  if (keywordMatch) {
    const day = keywordMatch[1].padStart(2, '0');
    const month = keywordMatch[2].padStart(2, '0');
    const year = keywordMatch[3] || String(new Date().getFullYear());
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Explicit ISO date (YYYY-MM-DD) anywhere in description
  const matchIso = description.match(/(\d{4}-\d{2}-\d{2})/);
  if (matchIso) return matchIso[1];

  // 4. Explicit full date DD/MM/YYYY with 4-digit year anywhere in description
  const matchDmyFull = description.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDmyFull) {
    const day = matchDmyFull[1].padStart(2, '0');
    const month = matchDmyFull[2].padStart(2, '0');
    const year = matchDmyFull[3];
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
};

// Helper update expected empty date in description
export const updateSoonAvailableDescription = (description: string | null, dateStr: string | null): string | null => {
  const cleanDesc = (description || '').replace(/\s*\[Sắp trống:\s*[^\]]+\]/g, '').trim();
  if (!dateStr) return cleanDesc || null;
  return `${cleanDesc} [Sắp trống: ${dateStr}]`.trim();
};

// Helper format date for display (YYYY-MM-DD -> DD/MM/YYYY)
export const formatDateDisplay = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0].trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
    const parts = cleanDate.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const day = parts[2].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[0];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

// Helper format room code cleanly (prevent P.P.202 -> P.202)
export const formatRoomCode = (code?: string): string => {
  if (!code) return 'P.—';
  const clean = String(code).trim().replace(/^(P\.?)+/gi, '');
  return `P.${clean}`;
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
  if (!room) {
    return {
      status: 'rented',
      label: 'Đã cho thuê',
      colorClass: 'bg-red-100 text-red-700 border-red-200',
      expectedEmptyDate: null,
      isSoonAvailable: false
    };
  }

  // Quét ngày trong description -> Có ngày là => Sắp trống!
  const roomAvailableDate = (room as any).available_date || parseSoonAvailableDate(room.description);
  if (roomAvailableDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedDate = new Date(roomAvailableDate);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(0, 0, 0, 0);
      if (parsedDate <= today && room.status === 'available') {
        return {
          status: 'available',
          label: 'Còn trống',
          colorClass: 'bg-green-100 text-green-700 border-green-200',
          expectedEmptyDate: null,
          isSoonAvailable: false
        };
      }
      return {
        status: 'soon_available',
        label: `Sắp trống (${formatDateDisplay(roomAvailableDate)})`,
        colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
        expectedEmptyDate: roomAvailableDate,
        isSoonAvailable: true
      };
    }
  }

  // Nguồn 1: Active contracts ending in <= 30 days
  const roomContract = contracts.find(
    (c) => (c.room_id === room.id || (c as any).roomId === room.id) && c.status === 'active'
  );
  if (roomContract && roomContract.end_date) {
    const end = new Date(roomContract.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) {
      return {
        status: 'soon_available',
        label: `Sắp trống (${diffDays > 0 ? `${diffDays} ngày` : 'hôm nay'})`,
        colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
        expectedEmptyDate: roomContract.end_date,
        isSoonAvailable: true
      };
    }
  }

  // Nguồn 3 Fallback: Check status or description text containing "sắp trống" / "sap trong"
  const roomStatusClean = (room.status || '').toLowerCase();
  const descClean = (room.description || '').toLowerCase();
  if (
    roomStatusClean === 'soon_available' ||
    roomStatusClean === 'sap_trong' ||
    roomStatusClean === 'soon_vacant' ||
    roomStatusClean === 'soon' ||
    descClean.includes('sắp trống') ||
    descClean.includes('sap trong')
  ) {
    return {
      status: 'soon_available',
      label: 'Sắp trống',
      colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
      expectedEmptyDate: null,
      isSoonAvailable: true
    };
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
