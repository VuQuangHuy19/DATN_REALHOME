import { parseRoomType, RoomType } from '@/lib/constants/roomTypes';
import type { ParsedBuilding, ParsedRoom } from '../googleSheetAiParser';

export function parseFloorFromRoomCode(code: string): number {
  const clean = String(code).trim();
  const match = clean.match(/^P?\.?\s*(\d{1,4})/i) || clean.match(/(\d{1,4})/);
  if (match) {
    const numOnly = parseInt(match[1], 10);
    if (!isNaN(numOnly) && numOnly > 0) {
      if (numOnly >= 100) return Math.floor(numOnly / 100);
      return numOnly;
    }
  }
  return 1;
}

export function cleanRoomCodeAndType(rawCode: string, currentType: string): { code: string; roomType: RoomType } {
  let code = String(rawCode || '').trim();
  let roomType = currentType || 'Studio';

  if (code.includes('_') || code.includes('-')) {
    const parts = code.split(/[_|-]/).map(p => p.trim());
    if (parts.length >= 2) {
      const firstPart = parts[0];
      const secondPart = parts.slice(1).join(' ');
      if (/^\d{1,4}$/.test(firstPart) || /^P?\d{1,4}$/i.test(firstPart)) {
        code = firstPart;
        roomType = parseRoomType(secondPart);
      }
    }
  }

  return { code, roomType: parseRoomType(roomType) };
}

/**
 * Chuyển đổi các mã phòng dạng "trục 0x" hoặc "0x" thành mã phòng chuẩn "20x"
 * Ví dụ: "trục 01" / "01" -> "201", "trục 02" / "02" -> "202", "trục 03" -> "203"
 */
export function transformTrucRoomCode(codeStr: string): string | null {
  if (!codeStr) return null;
  const clean = String(codeStr).trim().toLowerCase();

  const match = clean.match(/^(?:trục\s*)?0?([1-9]\d?)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0 && num < 100) {
      return (200 + num).toString();
    }
  }

  return null;
}

/**
 * Tự động nhân bản/triển khai ma trận phòng (Building Grid Expansion x0y)
 * Khi xuất hiện các ô "trục 01", "trục 02", "trục 03"... hoặc "01", "02"...
 * Hệ thống tự phát hiện số tầng tối đa và triển khai toàn bộ các phòng còn thiếu
 */
export function expandBuildingGrid(bld: ParsedBuilding): ParsedBuilding {
  if (!bld.rooms || bld.rooms.length === 0) return bld;

  const normCode = (c: string) => c.trim().toLowerCase().replace(/^p\.?/i, '').replace(/\.0+$/, '');

  let maxFloor = 1;
  const explicitRooms: ParsedRoom[] = [];
  const trucEntries: { axis: number; price: number; description?: string | null; drive_media_url?: string | null }[] = [];

  bld.rooms.forEach(r => {
    const cleanCode = r.code.trim().toLowerCase();
    const cleanDesc = (r.description || '').trim().toLowerCase();

    const matchCode = cleanCode.match(/^(?:trục\s*)?0?([1-9]\d?)$/i) || cleanCode.match(/^0([1-9]\d?)$/);
    const matchDesc = cleanDesc.match(/(?:trục\s*)0?([1-9]\d?)/i);

    let axis: number | null = null;
    if (matchCode) {
      axis = parseInt(matchCode[1], 10);
    } else if (matchDesc) {
      axis = parseInt(matchDesc[1], 10);
    }

    if (axis !== null && !isNaN(axis) && axis > 0 && axis < 100) {
      trucEntries.push({ axis, price: r.price, description: r.description, drive_media_url: r.drive_media_url });
      if (!matchCode) {
        if (r.floor > maxFloor && r.floor < 25) maxFloor = r.floor;
        explicitRooms.push(r);
      }
      return;
    }

    if (r.floor > maxFloor && r.floor < 25) {
      maxFloor = r.floor;
    }
    explicitRooms.push(r);
  });

  if (trucEntries.length === 0) {
    return bld;
  }

  if (maxFloor < 2) maxFloor = 5;

  const roomMap = new Map<string, ParsedRoom>();
  explicitRooms.forEach(r => {
    roomMap.set(normCode(r.code), r);
  });

  const hasFloor1 = explicitRooms.some(r => r.code.startsWith('1') || r.floor === 1);
  const startFloor = hasFloor1 ? 2 : 1;

  trucEntries.forEach(t => {
    const axisStr = t.axis.toString().padStart(2, '0');
    for (let f = startFloor; f <= maxFloor; f++) {
      const rawCode = `${f}${axisStr}`;
      const codeKey = normCode(rawCode);
      if (!roomMap.has(codeKey)) {
        const newRoom: ParsedRoom = {
          code: `P.${f}${axisStr}`,
          floor: f,
          price: t.price > 0 ? t.price : 0,
          room_type: parseRoomType(null),
          size: 25,
          status: 'rented', // Các phòng tự động triển khai từ trục mặc định là Đã thuê (chỉ phòng ghi rõ mới trống)
          bedrooms: 1,
          bathrooms: 1,
          description: t.description || null,
          drive_media_url: t.drive_media_url || bld.drive_media_url || null,
        };
        roomMap.set(codeKey, newRoom);
      }
    }
  });

  const sortedRooms = Array.from(roomMap.values()).sort((a, b) => a.floor - b.floor || a.code.localeCompare(b.code));
  bld.rooms = sortedRooms;
  return bld;
}
