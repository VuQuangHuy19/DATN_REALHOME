'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ImageGallery from '@/src/features/properties/components/ImageGallery';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { getAreaColorClass } from '@/lib/utils/colors';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import type { CustomerListing } from '@/lib/customer/types';
import { Calendar, Phone, Cat, FileText, Eye } from 'lucide-react';

export interface BuildingGroup {
  buildingId: string;
  buildingName: string;
  area: string;
  address: string;
  companyId: string;
  availableRoomCodes: string[];
  minPrice: number;
  maxPrice: number;
  allImages: string[];
  rooms: CustomerListing[];
  representativeRoom: CustomerListing;
  allowPet?: boolean;
}

export function formatArea(area: string): string {
  if (!area) return '';
  const parts = area.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    const ward = parts[0].replace(/^(phường|phường|xã|xã|thị trấn|thị trấn)\s+/i, '').trim();
    const district = parts[1].replace(/^(quận|quận|huyện|huyện|thị xã|thị xã|thành phố|thành phố)\s+/i, '').trim();
    if (ward && district) return `${ward} - ${district}`;
  }
  return area;
}

interface BuildingCardProps {
  group: BuildingGroup;
  onBook: (g: BuildingGroup) => void;
  onContact?: () => void;
  canComposeDeposit?: boolean;
  onComposeDeposit?: (buildingId: string) => void;
}

export function BuildingCard({
  group,
  onBook,
  onContact,
  canComposeDeposit,
  onComposeDeposit,
}: BuildingCardProps) {
  const hasAvailable = group.availableRoomCodes.length > 0;
  const priceLabel =
    group.minPrice === group.maxPrice
      ? `${group.minPrice.toLocaleString('vi-VN')}đ`
      : `${group.minPrice.toLocaleString('vi-VN')} – ${group.maxPrice.toLocaleString('vi-VN')}đ`;

  const allowPet = group.allowPet ?? group.rooms?.some((r) => r.allowPet);

  return (
    <Link
      href={`/customer/properties/${group.buildingId}`}
      className="rounded-2xl overflow-hidden bg-card border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-amber-400/60 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
    >
      <div className="relative" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <ImageGallery items={group.allImages} alt={group.buildingName} />
        {allowPet && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-emerald-600 text-white font-medium text-[11px] gap-1 shadow-md">
              <Cat className="h-3 w-3" /> Cho nuôi pet
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        {/* Tên tòa nhà */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 font-heading transition-colors line-clamp-1">
          {maskHouseNumberInBuildingName(group.buildingName)}
        </h3>

        {/* Khu vực & Yêu thích */}
        <div className="flex items-center justify-between gap-1 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`line-clamp-1 font-semibold text-xs ${getAreaColorClass(group.area)}`}>
              {formatArea(group.area)}
            </Badge>
          </div>

          {group.representativeRoom && (
            <FavoriteButton roomId={group.representativeRoom.id} className="h-7 w-7 [&>svg]:w-3.5 [&>svg]:h-3.5" />
          )}
        </div>

        {/* Phòng trống */}
        <div className="text-xs sm:text-sm py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
          {hasAvailable ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              🟢 Phòng trống:{' '}
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {group.availableRoomCodes.slice(0, 5).join(', ')}
                {group.availableRoomCodes.length > 5 && ` +${group.availableRoomCodes.length - 5} phòng`}
              </span>
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">Hiện tại hết phòng trống</span>
          )}
        </div>

        {/* Giá */}
        <div className="flex items-baseline justify-between pt-1">
          <p className="text-lg sm:text-xl font-extrabold text-amber-500 dark:text-amber-400 font-mono">
            {priceLabel}
            <span className="text-xs font-normal text-slate-400"> / tháng</span>
          </p>
        </div>

        {/* Nút action */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
          {canComposeDeposit && onComposeDeposit && (
            <Button
              size="sm"
              className="w-full h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onComposeDeposit(group.buildingId);
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Soạn cọc
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBook(group);
              }}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Hẹn xem
            </Button>
            {onContact ? (
              <Button
                size="sm"
                className="flex-1 h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContact();
                }}
              >
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Liên hệ
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                asChild
              >
                <Link
                  href={`/customer/properties/${group.buildingId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Chi tiết
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default BuildingCard;
