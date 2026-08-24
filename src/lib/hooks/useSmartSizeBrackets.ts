import { useMemo } from 'react';
import type { CustomerListing } from '@/lib/customer/types';

export interface SizeBracket {
  key: string;
  label: string;
  min: number;
  max: number;
  count: number;
}

export function computeSmartSizeBrackets(listings: CustomerListing[]): SizeBracket[] {
  const brackets: SizeBracket[] = [
    { key: 'under_20', label: 'Dưới 20m²', min: 0, max: 20, count: 0 },
    { key: '20_30', label: '20 - 30m²', min: 20, max: 30, count: 0 },
    { key: '30_50', label: '30 - 50m²', min: 30, max: 50, count: 0 },
    { key: 'above_50', label: 'Trên 50m²', min: 50, max: Infinity, count: 0 },
  ];

  if (!listings || listings.length === 0) return brackets;

  listings.forEach((item: any) => {
    const s = item.size;
    if (!s || s <= 0) return;
    for (const b of brackets) {
      if (s >= b.min && (b.max === Infinity ? true : s < b.max)) {
        b.count++;
        break;
      }
    }
  });

  return brackets;
}

export function useSmartSizeBrackets(listings: CustomerListing[]): SizeBracket[] {
  return useMemo(() => computeSmartSizeBrackets(listings), [listings]);
}

export default useSmartSizeBrackets;
