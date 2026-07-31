export const ALLOWED_ROOM_TYPES = [
  'Studio',
  'Studio + gác xép',
  '1N1K',
  '2N1K-1WC',
  '2N1k-2WC',
  'Giường tầng',
  'Gác xép',
  'MBKD',
  '1 Ngủ 1 Gác xép',
] as const;

export type RoomType = (typeof ALLOWED_ROOM_TYPES)[number];

export function parseRoomType(typeStr: string | null | undefined): RoomType {
  if (!typeStr) return 'Studio';
  const clean = typeStr.trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ phòng/g, '')
    .replace(/ phong/g, '');

  if (!clean) return 'Studio';

  const exactMatch = ALLOWED_ROOM_TYPES.find(
    (t) => t.toLowerCase() === clean
  );
  if (exactMatch) return exactMatch;

  const hasGacXep = clean.includes('gác') || clean.includes('gac') || clean.includes('xép') || clean.includes('xep');
  const hasStudio = clean.includes('studio') || clean.includes('stu');
  const has1N = clean.includes('1n') || clean.includes('1 ngủ') || clean.includes('1ngu') || clean.includes('1pn');
  const has2N = clean.includes('2n') || clean.includes('2 ngủ') || clean.includes('2ngu') || clean.includes('2pn') || clean.includes('3n') || clean.includes('3 ngủ') || clean.includes('3pn');
  const has2WC = clean.includes('2wc') || clean.includes('2 wc') || clean.includes('2tắm') || clean.includes('2 tắm') || clean.includes('2 phat');

  if (hasStudio && hasGacXep) return 'Studio + gác xép';
  if (has1N && hasGacXep) return '1 Ngủ 1 Gác xép';
  if (hasStudio) return 'Studio';
  if (has2N && has2WC) return '2N1k-2WC';
  if (has2N) return '2N1K-1WC';
  if (has1N) return '1N1K';
  if (clean.includes('giường tầng') || clean.includes('giuong tang') || clean.includes('dorm') || clean.includes('ktx')) return 'Giường tầng';
  if (clean.includes('mbkd') || clean.includes('mặt bằng') || clean.includes('mat bang') || clean.includes('shophouse') || clean.includes('kiot') || clean.includes('văn phòng')) return 'MBKD';
  if (hasGacXep || clean.includes('duplex')) return 'Gác xép';

  return 'Studio';
}
