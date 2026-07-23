'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CustomerListing } from '@/lib/customer/types';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { getRoomDisplayStatus } from '@/lib/room-status';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import ImageGallery from '@/src/features/properties/components/ImageGallery';

export function SimilarRoomsWidget({ currentRoom }: { currentRoom: CustomerListing }) {
  // Only recommend available or soon_available rooms by passing showAll=false
  const { listings, loading } = usePublicListings(currentRoom.companyId, false);

  const similarRooms = useMemo(() => {
    if (!listings) return [];
    
    // Filter out the current room
    let filtered = listings.filter(r => r.id !== currentRoom.id);
    
    // Scoring system to sort by similarity
    const scored = filtered.map(room => {
      let score = 0;
      // Exact same building
      if (room.buildingId === currentRoom.buildingId) score += 5;
      // Same area/district
      if (room.area === currentRoom.area || room.districtId === currentRoom.districtId) score += 3;
      // Price diff
      const priceDiff = Math.abs(room.price - currentRoom.price);
      if (priceDiff <= 500000) score += 4;
      else if (priceDiff <= 1000000) score += 2;
      // Room type
      if (room.roomType === currentRoom.roomType) score += 2;
      
      return { room, score };
    });
    
    // Sort by score desc, then by price asc
    scored.sort((a, b) => b.score - a.score || a.room.price - b.room.price);
    
    // Take top 4 that have a reasonable score > 2
    return scored.filter(s => s.score > 2).slice(0, 4).map(s => s.room);
  }, [listings, currentRoom]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-ink-muted" /></div>;
  }

  if (similarRooms.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-border-subtle">
      <h2 className="text-xl font-bold font-heading text-ink mb-6">Có thể bạn cũng thích</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {similarRooms.map(room => {
          const ds = getRoomDisplayStatus({
            id: room.id,
            status: room.status === 'soon_available' ? 'rented' : room.status,
            description: room.description,
          } as any);

          return (
            <Link
              key={room.id}
              href={`/customer/properties/rooms/${room.id}`}
              className="group border border-border-subtle rounded-lg overflow-hidden bg-card hover:border-accent transition-all flex flex-col"
            >
              <div className="relative w-full border-b border-border-subtle" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
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
                <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1 pointer-events-none">
                  <Badge className={`${ds.colorClass} text-[9px] font-bold px-2 py-0.5 border rounded-full shadow-none pointer-events-auto`}>
                    {LISTING_STATUS_LABELS[room.status] || ds.label}
                  </Badge>
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-ink line-clamp-2 leading-snug">
                      <span className="font-mono text-accent font-extrabold">
                        Phòng {room.title.split('—')[1]?.trim() || room.id}
                      </span>
                      <span className="text-ink-muted font-normal mx-1">-</span>
                      <span className="text-ink font-semibold">{room.address}</span>
                    </h3>
                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <span className="text-[10px] text-ink-muted font-medium bg-bg-subtle px-1.5 py-0.5 rounded border border-border-subtle">
                        Tầng {room.floor}
                      </span>
                      <FavoriteButton roomId={room.id} className="h-6 w-6 [&>svg]:w-3.5 [&>svg]:h-3.5" />
                    </div>
                  </div>
                  <div className="text-[10px] text-ink-muted flex gap-1.5 pt-0.5">
                    <span>{room.size}m²</span>
                    <span>•</span>
                    <span>{room.roomType}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border-subtle font-mono font-bold text-accent text-sm">
                  {room.price.toLocaleString('vi-VN')}đ<span className="text-[9px] font-normal text-ink-muted">/tháng</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
