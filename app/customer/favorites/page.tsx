'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListingsByIds } from '@/lib/hooks/usePublicListings';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { formatDateDisplay } from '@/lib/room-status';
import { Heart, MapPin, Bed, Bath, Square, Trash2, Loader2 } from 'lucide-react';
import { useFavorites } from '@/src/lib/hooks/useFavorites';
import { toast } from 'sonner';

// We now use the useFavorites hook from '@/src/lib/hooks/useFavorites'

export default function FavoritesPage() {
  const { company, companies } = useCustomerCompany();
  const { favorites, removeFavorite, loading: favLoading } = useFavorites();
  const favoriteIds = Array.from(favorites);
  const { listings: favoriteProperties, loading: propertiesLoading } = usePublicListingsByIds(
    favoriteIds,
    useMemo(() => companies.map((c) => c.id), [companies])
  );

  const loading = favLoading || propertiesLoading;

  return (
    <div className="container mx-auto px-4 py-10 bg-bg-base min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-7 w-7 text-danger fill-danger" />
        <div>
          <h1 className="text-3xl font-bold font-heading text-ink">Yêu Thích</h1>
          <p className="text-ink-muted text-sm mt-0.5">{favoriteProperties.length} bất động sản đã lưu</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : favoriteProperties.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border-subtle rounded-lg max-w-lg mx-auto p-8 shadow-none">
          <Heart className="h-16 w-16 text-ink-muted/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-heading text-ink mb-2">Danh sách yêu thích trống</h2>
          <p className="text-ink-muted text-sm mb-6 leading-relaxed">
            Bạn chưa lưu bất kỳ căn phòng nào vào danh sách yêu thích. Hãy quay lại trang danh sách phòng và nhấn nút trái tim để lưu lại những lựa chọn bạn ưng ý nhất.
          </p>
          <Button asChild className="bg-accent hover:bg-accent-500 text-white font-semibold shadow-none">
            <Link href="/customer/properties">Khám phá bất động sản</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden border border-border-subtle rounded-lg bg-card shadow-none hover:border-accent hover:shadow-sm transition-all flex flex-col group">
              <div className="relative h-52 overflow-hidden flex-shrink-0">
                <Link href={`/customer/properties/${property.id}`} className="block w-full h-full animate-fade">
                  <Image src={property.imageUrl} alt={property.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </Link>
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  <Badge variant={property.status === 'available' ? 'default' : 'secondary'} className="shadow-none">
                    {LISTING_STATUS_LABELS[property.status]}
                  </Badge>
                  {property.status === 'soon_available' && property.expectedAvailableDate && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-accent-900/80 text-white backdrop-blur-sm shadow-sm select-none">
                      Trống từ: {formatDateDisplay(property.expectedAvailableDate)}
                    </span>
                  )}
                </div>
              </div>
              <CardHeader className="pb-2 pt-4 px-5">
                <Link href={`/customer/properties/${property.id}`} className="block">
                  <h3 className="text-base font-bold text-ink leading-snug hover:text-accent font-heading transition-colors line-clamp-1">{property.title}</h3>
                </Link>
                <div className="flex items-center gap-1 text-sm text-ink-muted">
                  <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  <span className="line-clamp-1">{property.area}</span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 mt-auto">
                <div className="flex items-center gap-4 text-xs text-ink-muted mb-4 border-b border-border-subtle pb-3">
                  <span className="flex items-center gap-1"><Bed className="h-4 w-4 text-accent/80" />{property.bedrooms} phòng ngủ</span>
                  <span className="flex items-center gap-1"><Bath className="h-4 w-4 text-accent/80" />{property.bathrooms} WC</span>
                  <span className="flex items-center gap-1"><Square className="h-4 w-4 text-accent/80" />{property.size}m²</span>
                </div>
                <p className="text-lg font-bold text-ink font-mono">
                  {property.price.toLocaleString('vi-VN')}đ<span className="text-xs font-normal text-ink-muted">/tháng</span>
                </p>
              </CardContent>
              <div className="px-5 pb-4 pt-3 border-t border-border-subtle bg-bg-subtle/50 rounded-b-lg">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-sm text-ink border-border-subtle bg-card shadow-none" asChild>
                    <Link href={`/customer/properties/${property.id}`}>Xem chi tiết</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-danger hover:text-danger hover:bg-danger/10 shadow-none"
                    onClick={() => {
                      removeFavorite(property.id);
                      toast.success('Đã xóa khỏi danh sách yêu thích');
                    }}
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
