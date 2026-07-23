'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CustomerListing } from '@/lib/customer/types';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { getRoomDisplayStatus } from '@/lib/room-status';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, MapPin } from 'lucide-react';
import ImageGallery from '@/src/features/properties/components/ImageGallery';
import { haversineDistanceKm } from '@/src/lib/geocoding';

export function SameLandlordRoomsWidget({ currentRoom }: { currentRoom: CustomerListing }) {
  // Pass showAll=false to only get available or soon_available rooms
  const { listings, loading } = usePublicListings(currentRoom.companyId, false);

  const sameLandlordRooms = useMemo(() => {
    if (!listings || listings.length === 0) return [];

    // Filter out current room
    const filtered = listings.filter((r) => r.id !== currentRoom.id);

    // If current room has a landlordId, filter by same landlordId
    let landlordMatches = currentRoom.landlordId
      ? filtered.filter((r) => r.landlordId === currentRoom.landlordId)
      : [];

    // Fallback: If no landlordId or no matching rooms with same landlordId, fallback to same building
    if (landlordMatches.length === 0 && currentRoom.buildingId) {
      landlordMatches = filtered.filter((r) => r.buildingId === currentRoom.buildingId);
    }

    if (landlordMatches.length === 0) return [];

    // Calculate score and sort
    const scored = landlordMatches.map((room) => {
      // 1. Price difference percentage: abs(price - currentPrice) / currentPrice
      const priceDiffRatio = Math.abs(room.price - currentRoom.price) / currentRoom.price;
      const isWithin2Percent = priceDiffRatio <= 0.02; // ±2%

      // 2. Distance in KM if coordinates are available
      let distanceKm: number | null = null;
      if (
        room.latitude &&
        room.longitude &&
        currentRoom.latitude &&
        currentRoom.longitude
      ) {
        distanceKm = haversineDistanceKm(
          currentRoom.latitude,
          currentRoom.longitude,
          room.latitude,
          room.longitude
        );
      }

      // 3. Location proximity score
      const sameBuilding = room.buildingId === currentRoom.buildingId;
      const sameArea = room.area === currentRoom.area || room.districtId === currentRoom.districtId;

      let score = 0;
      // High score for ±2% price diff
      if (isWithin2Percent) score += 50;
      // Score for proximity
      if (sameBuilding) score += 30;
      else if (distanceKm !== null && distanceKm <= 1.0) score += 25;
      else if (distanceKm !== null && distanceKm <= 3.0) score += 15;
      else if (sameArea) score += 10;

      // Deduct score for price difference
      score -= priceDiffRatio * 20;

      const diffPctFormatted = ((room.price - currentRoom.price) / currentRoom.price) * 100;

      return {
        room,
        score,
        priceDiffRatio,
        isWithin2Percent,
        distanceKm,
        diffPctFormatted: diffPctFormatted > 0 ? `+${diffPctFormatted.toFixed(1)}%` : `${diffPctFormatted.toFixed(1)}%`,
      };
    });

    // Sort by score desc, then by distanceKm asc, then by priceDiffRatio asc
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.priceDiffRatio - b.priceDiffRatio;
    });

    return scored.slice(0, 4);
  }, [listings, currentRoom]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (sameLandlordRooms.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold font-heading text-ink">Cùng nguồn chủ nhà</h2>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Các căn phòng thuộc cùng chủ sở hữu, vị trí gần và chênh lệch giá khoảng ±2%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {sameLandlordRooms.map(({ room, isWithin2Percent, diffPctFormatted, distanceKm }) => {
          const ds = getRoomDisplayStatus({
            id: room.id,
            status: room.status === 'soon_available' ? 'rented' : room.status,
            description: room.description,
          } as any);

          return (
            <Link
              key={room.id}
              href={`/customer/properties/rooms/${room.id}`}
              className="group border border-border-subtle rounded-lg overflow-hidden bg-card hover:border-accent transition-all flex flex-col relative"
            >
              <div
                className="relative w-full border-b border-border-subtle"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
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

                <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
                  <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 border-none rounded-full backdrop-blur-sm shadow-sm">
                    Cùng chủ nhà
                  </Badge>
                  {isWithin2Percent && (
                    <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 border-none rounded-full backdrop-blur-sm shadow-sm">
                      Chênh giá {diffPctFormatted}
                    </Badge>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1 pointer-events-none">
                  <Badge
                    className={`${ds.colorClass} text-[9px] font-bold px-2 py-0.5 border rounded-full shadow-none pointer-events-auto`}
                  >
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

                  <div className="text-[10px] text-ink-muted flex items-center justify-between pt-0.5">
                    <span>{room.size}m² • {room.roomType}</span>
                    {distanceKm !== null && (
                      <span className="text-accent font-semibold flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 text-accent" />
                        Cách {distanceKm}km
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border-subtle font-mono font-bold text-accent text-sm flex items-center justify-between">
                  <span>
                    {room.price.toLocaleString('vi-VN')}đ
                    <span className="text-[9px] font-normal text-ink-muted">/tháng</span>
                  </span>
                  {!isWithin2Percent && (
                    <span className="text-[10px] text-ink-muted font-normal">
                      ({diffPctFormatted})
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
