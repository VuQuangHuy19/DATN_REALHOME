'use client';

import { useMemo, useRef, useState } from 'react';
import { CustomerListing } from '@/lib/customer/types';
import { usePublicListings } from '@/hooks/usePublicListings';
import { BuildingCard, type BuildingGroup } from '@/components/customer/BuildingCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';

export function SameLandlordBuildingsWidget({
  currentBuilding,
}: {
  currentBuilding: {
    id: string;
    landlord_id?: string | null;
    company_id?: string;
    area?: string;
    district_id?: string;
  };
}) {
  const { listings, loading } = usePublicListings(currentBuilding.company_id || null, false);
  const { company } = useCustomerCompany();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [viewingGroup, setViewingGroup] = useState<BuildingGroup | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Group listings into BuildingGroup[] and filter for same landlord
  const sameLandlordGroups = useMemo<BuildingGroup[]>(() => {
    if (!listings || listings.length === 0) return [];

    // Filter out rooms belonging to current building
    const pool = listings.filter((r) => r.buildingId !== currentBuilding.id);

    // Group by building
    const map = new Map<string, CustomerListing[]>();
    for (const listing of pool) {
      const key = listing.buildingId || listing.buildingName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(listing);
    }

    const extractNum = (t: string) => {
      const code = t.split('—')[1]?.trim() || t;
      const match = code.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 99999;
    };

    const groups = Array.from(map.entries()).map(([buildingId, rooms]) => {
      const rep = rooms[0];
      const available = rooms
        .filter((r) => r.status === 'available')
        .sort((a, b) => {
          if (a.floor !== b.floor) return a.floor - b.floor;
          const numA = extractNum(a.title);
          const numB = extractNum(b.title);
          if (numA !== numB) return numA - numB;
          return a.title.localeCompare(b.title, undefined, { numeric: true });
        });

      const soonAvailable = rooms
        .filter((r) => {
          if (r.status !== 'soon_available') return false;
          const targetDateStr = r.expectedAvailableDate || r.availableDate;
          if (!targetDateStr) return false;
          const end = new Date(targetDateStr);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        })
        .sort((a, b) => {
          if (a.floor !== b.floor) return a.floor - b.floor;
          const numA = extractNum(a.title);
          const numB = extractNum(b.title);
          if (numA !== numB) return numA - numB;
          return a.title.localeCompare(b.title, undefined, { numeric: true });
        });

      const prices = rooms.map((r) => r.price).filter((p) => p > 0);
      const allImages = Array.from(
        new Set(
          rooms.flatMap((r) => {
            const highResImgs =
              r.imageUrls && r.imageUrls.length > 0
                ? r.imageUrls
                : r.imageUrl
                ? [r.imageUrl]
                : r.thumbnailUrls && r.thumbnailUrls.length > 0
                ? r.thumbnailUrls
                : [r.thumbnailUrl];
            return highResImgs.filter((img): img is string => !!img);
          })
        )
      );

      return {
        buildingId,
        buildingName: rep.buildingName,
        area: rep.area,
        address: rep.address,
        companyId: rep.companyId,
        availableRoomCodes: available.map((r) => r.title.split('—')[1]?.trim() || r.id.slice(0, 6)),
        soonAvailableRooms: soonAvailable.map((r) => ({
          code: r.title.split('—')[1]?.trim() || r.id.slice(0, 6),
          expectedAvailableDate: r.expectedAvailableDate || r.availableDate,
        })),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        allImages: allImages.length ? allImages : ['/placeholder.jpg'],
        rooms,
        representativeRoom: rep,
        allowPet: rooms.some((r) => r.allowPet),
        isVerifiedProperty: rooms.some((r) => r.isVerifiedProperty),
        landlordSystemName: rep.landlordSystemName ?? rooms.find((r) => r.landlordSystemName)?.landlordSystemName,
        landlordName: rep.landlordName ?? rooms.find((r) => r.landlordName)?.landlordName,
      } satisfies BuildingGroup;
    });

    // Keep only buildings with available or soon_available rooms
    const activeGroups = groups.filter(
      (g) => g.availableRoomCodes.length > 0 || (g.soonAvailableRooms && g.soonAvailableRooms.length > 0)
    );

    // Primary: Match landlord_id
    let candidates = currentBuilding.landlord_id
      ? activeGroups.filter((g) => g.rooms.some((r) => r.landlordId === currentBuilding.landlord_id))
      : [];

    // Fallback: Same area / district
    if (candidates.length === 0 && currentBuilding.area) {
      candidates = activeGroups.filter(
        (g) => g.area === currentBuilding.area || (currentBuilding.district_id && g.rooms.some((r) => r.districtId === currentBuilding.district_id))
      );
    }

    return candidates.slice(0, 8);
  }, [listings, currentBuilding]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (sameLandlordGroups.length === 0) return null;

  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  return (
    <div className="mt-12 pt-8 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold font-heading text-ink">Tòa cùng nguồn chủ</h2>
            <Badge variant="secondary" className="text-xs bg-accent/10 text-accent font-semibold border-none px-2 py-0.5">
              {sameLandlordGroups.length} tòa nhà
            </Badge>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Các tòa nhà khác thuộc cùng chủ nhà hoặc cùng mạng lưới quản lý (kéo ngang để xem thêm)
          </p>
        </div>

        {/* Controls */}
        {sameLandlordGroups.length > 3 && (
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

      {/* Carousel */}
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
          className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sameLandlordGroups.map((group) => (
            <div key={group.buildingId} className="flex-none w-[300px] sm:w-[330px] snap-start">
              <BuildingCard
                group={group}
                onBook={setViewingGroup}
                onContact={() => setIsContactOpen(true)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => handleScroll('right')}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white/95 dark:bg-card/95 shadow-md border border-border-subtle text-ink hover:bg-accent hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Cuộn sang phải"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dialog Hẹn xem */}
      {viewingGroup && (
        <ViewingRequestDialog
          open={!!viewingGroup}
          onOpenChange={(open) => {
            if (!open) setViewingGroup(null);
          }}
          companyId={viewingGroup.companyId}
          property={{
            id: viewingGroup.buildingId,
            title: viewingGroup.buildingName,
            address: viewingGroup.address,
            area: viewingGroup.area,
          }}
        />
      )}

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
    </div>
  );
}
