'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ImageGallery from '@/features/properties/components/ImageGallery';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { getAreaColorClass } from '@/lib/utils/colors';
import { maskHouseNumberInBuildingName, formatVnPriceRange } from '@/lib/utils';
import type { CustomerListing } from '@/lib/customer/types';
import { Calendar, Phone, Cat, FileText, Eye, Link as LinkIcon, CheckCheck, ShieldCheck, Layers, Zap, Globe, Ban, Sparkles } from 'lucide-react';
import KYCBadge from '@/components/kyc/KYCBadge';
import { formatDateDisplay } from '@/lib/room-status';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export interface BuildingGroup {
  buildingId: string;
  buildingName: string;
  area: string;
  address: string;
  companyId: string;
  availableRoomCodes: string[];
  soonAvailableRooms?: { code: string; expectedAvailableDate?: string | null }[];
  minPrice: number;
  maxPrice: number;
  allImages: string[];
  rooms: CustomerListing[];
  representativeRoom: CustomerListing;
  allowPet?: boolean;
  isVerifiedProperty?: boolean;
  landlordSystemName?: string | null;
  landlordName?: string | null;
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
  const [copyDone, setCopyDone] = useState(false);
  const { user, profile } = useAuth();

  const handleCopyBuildingLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const baseUrl = `${window.location.origin}/customer/properties/${group.buildingId}`;
    const saleId = user?.id || profile?.id;
    const finalUrl = saleId ? `${baseUrl}?ref=${saleId}` : baseUrl;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const hasAvailable = group.availableRoomCodes.length > 0;
  const priceLabel = formatVnPriceRange(group.minPrice, group.maxPrice);

  const petVal = (group.allowPet ?? group.representativeRoom?.allowPet ?? group.rooms?.some((r) => r.allowPet)) as any;
  const isPetAllowed = petVal === true || petVal === 'true' || (typeof petVal === 'string' && petVal !== 'Không' && petVal !== 'false');
  const isPetDisallowed = petVal === false || petVal === 'false' || petVal === 'Không';

  const evVal = group.representativeRoom?.allowVinfastElectric;
  const isEvDisallowed = evVal === false;

  const isVerified = Boolean(group.isVerifiedProperty || group.representativeRoom?.isVerifiedProperty);

  // Extract room types for Tag
  const roomTypesList = Array.from(new Set(group.rooms?.map((r) => r.roomType).filter(Boolean))) as string[];
  const roomTypeTagText = roomTypesList.length > 0 ? roomTypesList.slice(0, 2).join(' • ') : (group.representativeRoom?.roomType || 'Căn hộ');

  return (
    <Link
      href={`/customer/properties/${group.buildingId}`}
      className="rounded-2xl overflow-hidden bg-card border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-amber-400/60 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
    >
      <div className="relative" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <ImageGallery items={group.allImages} alt={group.buildingName} />

        {/* Top Badges: KYC Badge & Pet Badge */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-1 pointer-events-none">
          <KYCBadge
            type="property"
            isVerified={isVerified}
            size="sm"
            systemName={group.landlordSystemName || group.representativeRoom?.landlordSystemName}
            name={group.landlordName || group.representativeRoom?.landlordName}
          />
        </div>

        {/* Tag Loại phòng: Nền xám mờ + Chữ màu Cam RealHome */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <Badge className="bg-slate-900/85 backdrop-blur-md text-amber-400 border border-amber-500/40 text-[11px] font-extrabold px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1.5">
            <span>🏠 {roomTypeTagText}</span>
          </Badge>
        </div>
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

        {/* Phòng trống & Sắp trống */}
        <div className="flex flex-col gap-1 text-xs py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
          {hasAvailable && (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              🟢 Phòng trống:{' '}
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {group.availableRoomCodes.slice(0, 5).join(', ')}
                {group.availableRoomCodes.length > 5 && ` +${group.availableRoomCodes.length - 5} phòng`}
              </span>
            </span>
          )}

          {group.soonAvailableRooms && group.soonAvailableRooms.length > 0 && (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              🟡 Sắp trống:{' '}
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {group.soonAvailableRooms.slice(0, 5).map(s => `${s.code}${s.expectedAvailableDate ? ` (${formatDateDisplay(s.expectedAvailableDate)})` : ''}`).join(', ')}
                {group.soonAvailableRooms.length > 5 && ` +${group.soonAvailableRooms.length - 5} phòng`}
              </span>
            </span>
          )}

          {!hasAvailable && (!group.soonAvailableRooms || group.soonAvailableRooms.length === 0) && (
            <span className="text-slate-400 italic text-xs">Hiện tại hết phòng trống</span>
          )}
        </div>

        {/* Highlights Bar: Tiện ích, Nội thất & Quy định (đặc biệt là 🚫 Cấm pet, 🚫 Cấm xe điện) */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {group.representativeRoom?.pcccCertified !== false && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> PCCC
            </span>
          )}
          {group.representativeRoom?.hasElevator !== false && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <Layers className="h-3 w-3 text-blue-600" /> Thang máy
            </span>
          )}
          {isPetAllowed && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Cat className="h-3 w-3 text-emerald-600" /> Cho pet
            </span>
          )}
          {isPetDisallowed && (
            <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
              <Ban className="h-3 w-3 text-red-600" /> Cấm nuôi pet
            </span>
          )}
          {isEvDisallowed && (
            <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
              <Ban className="h-3 w-3 text-red-600" /> Cấm xe điện
            </span>
          )}
          {!isEvDisallowed && group.representativeRoom?.allowVinfastElectric !== false && (
            <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
              <Zap className="h-3 w-3 text-teal-600" /> Sạc xe điện
            </span>
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
              className={`h-9 px-2.5 text-xs rounded-xl font-bold transition-all ${copyDone
                  ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                  : 'border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 hover:border-indigo-300'
                }`}
              onClick={handleCopyBuildingLink}
              title="Copy link xem tòa nhà gửi cho khách"
            >
              {copyDone ? <CheckCheck className="h-3.5 w-3.5 mr-1" /> : <LinkIcon className="h-3.5 w-3.5 mr-1" />}
              <span>{copyDone ? 'Đã copy' : 'Copy Link'}</span>
            </Button>

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
