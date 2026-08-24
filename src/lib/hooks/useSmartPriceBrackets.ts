import { useMemo } from 'react';
import type { CustomerListing } from '@/lib/customer/types';

export interface PriceBracket {
  key: string;
  label: string;
  min: number;
  max: number;
  count: number;
}

export function computeSmartPriceBrackets(listings: CustomerListing[]): PriceBracket[] {
  const brackets: PriceBracket[] = [
    { key: 'under_3m', label: 'Dưới 3 triệu', min: 0, max: 3_000_000, count: 0 },
    { key: '3m_5m', label: '3 - 5 triệu', min: 3_000_000, max: 5_000_000, count: 0 },
    { key: '5m_7m', label: '5 - 7 triệu', min: 5_000_000, max: 7_000_000, count: 0 },
    { key: '7m_10m', label: '7 - 10 triệu', min: 7_000_000, max: 10_000_000, count: 0 },
    { key: 'above_10m', label: 'Trên 10 triệu', min: 10_000_000, max: Infinity, count: 0 },
  ];

  if (!listings || listings.length === 0) return brackets;

  listings.forEach((item: any) => {
    const p = item.price;
    if (!p || p <= 0) return;
    for (const b of brackets) {
      if (p >= b.min && (b.max === Infinity ? true : p < b.max)) {
        b.count++;
        break;
      }
    }
  });

  return brackets;
}

export function useSmartPriceBrackets(listings: CustomerListing[]): PriceBracket[] {
  return useMemo(() => computeSmartPriceBrackets(listings), [listings]);
}

export default useSmartPriceBrackets;
