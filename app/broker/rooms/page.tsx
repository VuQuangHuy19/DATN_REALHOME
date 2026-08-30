'use client';

import { Suspense } from 'react';
import { CustomerCompanyProvider } from '@/components/customer/CustomerCompanyProvider';
import { CompareProvider } from '@/lib/customer/RoomCompareContext';
import { RoomComparisonDrawer } from '@/features/properties/components/RoomComparisonDrawer';
import { Loader2 } from 'lucide-react';
import PropertiesPage from '@/app/customer/properties/page';

/**
 * /broker/rooms — Trang duyệt Phòng trống dành riêng cho Sale
 * Nhúng trực tiếp PropertiesPage từ /customer/properties vào trong
 * layout /broker (có AdminBottomNav của Sale), giữ nguyên toàn bộ
 * tính năng: bộ lọc, Copy Link Giới Thiệu, đặt lịch qua link ref, v.v.
 */
export default function BrokerRoomsPage() {
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
          <PropertiesPage />
        </Suspense>
        <RoomComparisonDrawer />
      </CompareProvider>
    </CustomerCompanyProvider>
  );
}
