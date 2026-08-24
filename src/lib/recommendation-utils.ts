import { CustomerListing } from '@/lib/customer/types';

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Selects up to `limit` rooms from a candidate list with multi-building diversity.
 *
 * Algorithm:
 * 1. Excludes the current room.
 * 2. Groups candidates by building ID/Code.
 * 3. Shuffles rooms inside each building and shuffles the building buckets.
 * 4. Interleaves (round-robin) up to `maxPerBuilding` rooms per building so items come from multiple buildings.
 * 5. Fills up remaining slots up to `limit` if more candidates exist.
 */
export function getDiverseRooms(
  candidates: CustomerListing[],
  currentRoomId: string,
  limit: number = 10,
  maxPerBuilding: number = 2
): CustomerListing[] {
  // 1. Filter out current room
  const pool = candidates.filter((r) => r.id !== currentRoomId);
  if (pool.length === 0) return [];

  // 2. Group by building
  const buildingMap = new Map<string, CustomerListing[]>();
  for (const room of pool) {
    const key = room.buildingId || room.buildingCode || 'unknown';
    if (!buildingMap.has(key)) {
      buildingMap.set(key, []);
    }
    buildingMap.get(key)!.push(room);
  }

  // Shuffle rooms inside each building bucket
  buildingMap.forEach((rooms, key) => {
    buildingMap.set(key, shuffleArray(rooms));
  });

  // Convert map values to array and shuffle building buckets for random order
  const buildingBuckets = shuffleArray(Array.from(buildingMap.values()));

  const selected: CustomerListing[] = [];
  const selectedIds = new Set<string>();

  // 3. Round-robin selection: pick 1 room from each building, then 2nd room, up to maxPerBuilding
  let pass = 0;
  let addedInPass = true;

  while (selected.length < limit && addedInPass && pass < maxPerBuilding) {
    addedInPass = false;
    for (const bucket of buildingBuckets) {
      if (selected.length >= limit) break;
      if (bucket[pass]) {
        const item = bucket[pass];
        if (!selectedIds.has(item.id)) {
          selected.push(item);
          selectedIds.add(item.id);
          addedInPass = true;
        }
      }
    }
    pass++;
  }

  // 4. If we haven't reached `limit`, fill up with remaining rooms
  if (selected.length < limit) {
    const remaining = pool.filter((r) => !selectedIds.has(r.id));
    const shuffledRemaining = shuffleArray(remaining);
    for (const item of shuffledRemaining) {
      if (selected.length >= limit) break;
      selected.push(item);
      selectedIds.add(item.id);
    }
  }

  return selected;
}
