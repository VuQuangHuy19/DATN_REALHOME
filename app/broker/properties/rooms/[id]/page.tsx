'use client';

import { Suspense } from 'react';
import { CustomerCompanyProvider } from '@/components/customer/CustomerCompanyProvider';
import { CompareProvider } from '@/lib/customer/RoomCompareContext';
import { Loader2 } from 'lucide-react';
import RoomDetailPage from '@/app/customer/properties/rooms/[id]/page';

/**
 * /broker/properties/rooms/[id] — Trang chi tiết Phòng dành cho Sale
 * Nhúng RoomDetailPage từ /customer/properties/rooms/[id] vào layout /broker (có AdminBottomNav của Sale)
 */
export default function BrokerRoomDetailPage() {
  return (
    <CustomerCompanyProvider>
      <CompareProvider>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          }
        >
          <RoomDetailPage />
        </Suspense>
      </CompareProvider>
    </CustomerCompanyProvider>
  );
}
