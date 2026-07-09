'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListingsByIds } from '@/lib/hooks/usePublicListings';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { formatDateDisplay } from '@/lib/room-status';
import { Heart, MapPin, Bed, Bath, Square, Trash2, Loader2 } from 'lucide-react';

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('property-favorites');
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const remove = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(id);
      try {
        localStorage.setItem('property-favorites', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  return { favorites, remove };
}

export default function FavoritesPage() {
  const { company, companies } = useCustomerCompany();
  const { favorites, remove } = useFavorites();
  const favoriteIds = Array.from(favorites);
  const { listings: favoriteProperties, loading } = usePublicListingsByIds(
    favoriteIds,
    useMemo(() => companies.map((c) => c.id), [companies])
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-7 w-7 text-red-500 fill-red-500" />
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Yêu Thích</h1>
          <p className="text-slate-500">{favoriteProperties.length} bất động sản đã lưu</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : favoriteProperties.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-600 mb-2">Chưa có bất động sản yêu thích</h2>
          <p className="text-slate-400 mb-6">Nhấn vào biểu tượng trái tim khi xem bất động sản để lưu vào đây.</p>
          <Button asChild>
            <Link href="/customer/properties">Khám phá bất động sản</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              <Link href={`/customer/properties/${property.id}`} className="block">
                <div className="relative h-48">
                  <Image src={property.imageUrl} alt={property.title} fill className="object-cover" />
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                      {LISTING_STATUS_LABELS[property.status]}
                    </Badge>
                    {property.status === 'soon_available' && property.expectedAvailableDate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm shadow-sm select-none">
                        Trống từ: {formatDateDisplay(property.expectedAvailableDate)}
                      </span>
                    )}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-semibold text-slate-800 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {property.area}
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                    <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bedrooms}</span>
                    <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{property.bathrooms}</span>
                    <span className="flex items-center gap-1"><Square className="h-4 w-4" />{property.size}m²</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">
                    {property.price.toLocaleString('vi-VN')}đ/tháng
                  </p>
                </CardContent>
              </Link>
              <div className="px-6 pb-4 pt-1 border-t border-slate-100 mt-auto">
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/customer/properties/${property.id}`}>Xem chi tiết</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => remove(property.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
