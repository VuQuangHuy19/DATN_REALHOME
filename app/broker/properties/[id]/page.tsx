'use client';

import { Suspense } from 'react';
import { CustomerCompanyProvider } from '@/components/customer/CustomerCompanyProvider';
import { CompareProvider } from '@/lib/customer/RoomCompareContext';
import { RoomComparisonDrawer } from '@/features/properties/components/RoomComparisonDrawer';
import { Loader2 } from 'lucide-react';
import BuildingDetailPage from '@/app/customer/properties/[id]/page';

/**
 * /broker/properties/[id] — Trang chi tiết Tòa nhà / BĐS dành cho Sale
 * Nhúng BuildingDetailPage từ /customer/properties/[id] vào layout /broker (có AdminBottomNav của Sale)
 */
export default function BrokerBuildingDetailPage() {
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
          <BuildingDetailPage />
        </Suspense>
        <RoomComparisonDrawer />
      </CompareProvider>
    </CustomerCompanyProvider>
  );
}
