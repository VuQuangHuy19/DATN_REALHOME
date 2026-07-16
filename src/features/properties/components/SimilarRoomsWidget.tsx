'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CustomerListing } from '@/lib/customer/types';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import { getRoomDisplayStatus } from '@/lib/room-status';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2 } from 'lucide-react';

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
              className="group border border-border-subtle rounded-lg overflow-hidden bg-white hover:border-accent transition-all flex flex-col"
            >
              <div className="relative h-40 w-full bg-slate-100 border-b border-border-subtle">
                <Image
                  src={room.thumbnailUrl || room.imageUrl || '/placeholder.jpg'}
                  alt={room.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 250px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                  <Badge className={`${ds.colorClass} text-[9px] font-bold px-2 py-0.5 border rounded-full shadow-none`}>
                    {LISTING_STATUS_LABELS[room.status] || ds.label}
                  </Badge>
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-ink line-clamp-1" title={room.title}>
                    {room.title.split('—')[1]?.trim() || room.title}
                  </h3>
                  <p className="text-[10px] text-ink-muted line-clamp-1 mt-0.5 flex items-center gap-0.5" title={room.buildingName}>
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {room.buildingName}
                  </p>
                  <div className="text-[10px] text-ink-muted flex gap-1.5 mt-1.5">
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
