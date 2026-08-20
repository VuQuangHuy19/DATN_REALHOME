'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CustomerListing } from '@/lib/customer/types';
import { usePublicListings } from '@/hooks/usePublicListings';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { getRoomDisplayStatus } from '@/lib/room-status';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ChevronLeft, ChevronRight, Cat, Calendar, Phone } from 'lucide-react';
import ImageGallery from '@/features/properties/components/ImageGallery';
import { getDiverseRooms } from '@/lib/recommendation-utils';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { formatArea } from '@/components/customer/BuildingCard';
import { getAreaColorClass } from '@/lib/utils/colors';
import KYCBadge from '@/components/kyc/KYCBadge';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';

export function SimilarRoomsWidget({ currentRoom }: { currentRoom: CustomerListing }) {
  // Only recommend available or soon_available rooms
  const { listings, loading } = usePublicListings(currentRoom.companyId, false);
  const { company } = useCustomerCompany();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedViewingRoom, setSelectedViewingRoom] = useState<CustomerListing | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const similarRooms = useMemo(() => {
    if (!listings || listings.length === 0) return [];
    
    // 1. Filter out current room
    const pool = listings.filter((r) => r.id !== currentRoom.id);
    
    // 2. Score candidate rooms based on location, area, price range & room type
    const scored = pool.map((room) => {
      let score = 0;
      // Same district / area
      if (room.districtId && room.districtId === currentRoom.districtId) score += 4;
      else if (room.area === currentRoom.area) score += 3;

      // Similar price (within +-25%)
      const priceDiff = Math.abs(room.price - currentRoom.price);
      if (priceDiff <= 500000) score += 5;
      else if (priceDiff <= 1500000) score += 3;
      else if (priceDiff <= 3000000) score += 1;

      // Room type
      if (room.roomType === currentRoom.roomType) score += 2;

      return { room, score };
    });

    // Sort by similarity score descending
    scored.sort((a, b) => b.score - a.score);

    // Candidate pool ordered by similarity
    const candidates = scored.map((s) => s.room);

    // Apply diversity algorithm: pick up to 10 rooms across multiple buildings (max 2 rooms per building)
    return getDiverseRooms(candidates, currentRoom.id, 10, 2);
  }, [listings, currentRoom]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getMaskedTitle = (room: CustomerListing): string => {
    const rawName = room.buildingName || room.address || '';
    const maskedAddr = maskHouseNumberInBuildingName(rawName);
    const roomCode = room.title.split('—')[1]?.trim() || room.buildingCode || '';
    if (roomCode) {
      return `Phòng ${roomCode} - ${maskedAddr}`;
    }
    return maskHouseNumberInBuildingName(room.title);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (similarRooms.length === 0) return null;

  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  return (
    <div className="mt-12 pt-8 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold font-heading text-ink">Có thể bạn cũng thích</h2>
            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 font-semibold border-amber-200 border px-2 py-0.5">
              {similarRooms.length} gợi ý
            </Badge>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Các căn phòng tương đồng về khu vực, mức giá và phân bố đa dạng qua nhiều tòa nhà (kéo ngang để xem thêm)
          </p>
        </div>

        {/* Carousel controls */}
        {similarRooms.length > 3 && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => handleScroll('left')}
              className="w-8 h-8 rounded-full border border-border-subtle bg-card hover:bg-accent hover:text-white text-ink transition-colors flex items-center justify-center shadow-none"
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-8 h-8 rounded-full border border-border-subtle bg-card hover:bg-accent hover:text-white text-ink transition-colors flex items-center justify-center shadow-none"
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Scroll Carousel */}
      <div className="relative group/carousel">
        <button
          onClick={() => handleScroll('left')}
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-card/95 shadow-md border border-border-subtle text-ink hover:bg-accent hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {similarRooms.map((room) => {
            const ds = getRoomDisplayStatus({
              id: room.id,
              status: room.status === 'soon_available' ? 'rented' : room.status,
              description: room.description,
            } as any);

            const isVerified = Boolean(
              room.isVerifiedProperty ||
              (room as any).is_kyc_verified ||
              (room as any).kycStatus === 'verified' ||
              (room as any).kycStatus === 'approved'
            );

            const displayTitle = getMaskedTitle(room);
            const roomCode = room.title.split('—')[1]?.trim() || room.buildingCode || room.id.slice(0, 4);

            return (
              <div key={room.id} className="flex-none w-[280px] sm:w-[300px] md:w-[320px] snap-start">
                <div className="rounded-2xl overflow-hidden bg-card border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-amber-400/60 hover:shadow-xl transition-all duration-300 flex flex-col h-full group relative">
                  
                  {/* Image container */}
                  <div className="relative w-full border-b border-slate-200/60" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <ImageGallery
                      items={Array.from(
                        new Set(
                          (room.thumbnailUrls ?? [])
                            .concat(room.imageUrls ?? [])
                            .concat([room.thumbnailUrl, room.imageUrl])
                            .filter(Boolean)
                        )
                      )}
                      alt={room.title}
                      aspectRatio="card"
                    />

                    {/* Top Left: KYC Badge (Như ảnh 2) */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
                      <KYCBadge
                        type="property"
                        isVerified={isVerified}
                        size="sm"
                        systemName={room.landlordSystemName}
                        name={room.landlordName}
                      />
                    </div>

                    {/* Top Right: Status / Pet Badge */}
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1 pointer-events-none">
                      <Badge className={`${ds.colorClass} text-[10px] font-bold px-2.5 py-0.5 border rounded-full shadow-sm pointer-events-auto`}>
                        {LISTING_STATUS_LABELS[room.status] || ds.label}
                      </Badge>
                      {room.allowPet && (
                        <Badge className="bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 border-none rounded-full shadow-sm flex items-center gap-1 pointer-events-auto">
                          <Cat className="h-3 w-3" /> Cho nuôi pet
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col gap-2.5 flex-1 justify-between">
                    {/* Title with Masked Address */}
                    <Link href={`/customer/properties/rooms/${room.id}`} className="block group-hover:text-blue-600 transition-colors">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 font-heading">
                        {displayTitle}
                      </h3>
                    </Link>

                    {/* Area & Favorite Button */}
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <Badge variant="outline" className={`line-clamp-1 font-semibold text-[11px] ${getAreaColorClass(room.area)}`}>
                        {formatArea(room.area)}
                      </Badge>
                      <FavoriteButton roomId={room.id} className="h-7 w-7 [&>svg]:w-3.5 [&>svg]:h-3.5" />
                    </div>

                    {/* Available Room status bar */}
                    <div className="text-xs py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate">
                        🟢 Phòng trống: <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{roomCode}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium shrink-0 ml-1">
                        Tầng {room.floor} • {room.size}m²
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline justify-between pt-1">
                      <p className="text-base sm:text-lg font-extrabold text-amber-500 dark:text-amber-400 font-mono">
                        {room.price.toLocaleString('vi-VN')}đ
                        <span className="text-xs font-normal text-slate-400"> / tháng</span>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs rounded-xl border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600"
                        onClick={() => setSelectedViewingRoom(room)}
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Hẹn xem
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        onClick={() => setIsContactOpen(true)}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        Liên hệ
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => handleScroll('right')}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-card/95 shadow-md border border-border-subtle text-ink hover:bg-accent hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Cuộn sang phải"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dialog Liên hệ */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Liên Hệ Môi Giới</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <Phone className="h-5 w-5 text-accent" />
              <span className="text-lg font-bold text-ink font-mono">{hotline}</span>
            </div>
            <Button className="w-full bg-accent hover:bg-accent-500 text-white font-semibold" size="lg" asChild>
              <a href={hotlineHref}>
                <Phone className="h-4 w-4 mr-2" />
                Gọi ngay
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Hẹn xem */}
      {selectedViewingRoom && (
        <ViewingRequestDialog
          open={!!selectedViewingRoom}
          onOpenChange={(open) => {
            if (!open) setSelectedViewingRoom(null);
          }}
          companyId={selectedViewingRoom.companyId}
          property={{
            id: selectedViewingRoom.id,
            title: selectedViewingRoom.title,
            address: selectedViewingRoom.address,
            area: selectedViewingRoom.area,
          }}
        />
      )}
    </div>
  );
}
