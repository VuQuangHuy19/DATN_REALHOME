'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { formatDateDisplay } from '@/lib/room-status';
import { Filter, MapPin, Bed, Bath, Square, SlidersHorizontal, Heart, Phone, Calendar, Loader2, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import Pagination from '@/components/Pagination';

const STATUS_OPTIONS = ['available', 'rented', 'maintenance', 'reserved'] as const;

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('property-favorites');
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch { }
  }, []);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('property-favorites', JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
  }, []);

  return { favorites, toggle };
}

export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('q') || '';
  const { company, companies, loading: companyLoading } = useCustomerCompany();
  const { role } = useAuth();
  const isSale = role === 'sales_agent';
  const { listings, loading: listingsLoading, error } = usePublicListings(
    useMemo(() => companies.map((c) => c.id), [companies]),
    isSale
  );

  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [priceSlider, setPriceSlider] = useState<number[]>([500000, 100000000]);
  const [priceRange, setPriceRange] = useState<number[]>([500000, 100000000]);
  const [sizeSlider, setSizeSlider] = useState<number[]>([0, 500]);
  const [sizeRange, setSizeRange] = useState<number[]>([0, 500]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState<string | null>(null);
  const [viewingProperty, setViewingProperty] = useState<{
    id: string;
    title: string;
    address: string;
    area: string;
    companyId: string;
  } | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAreas, selectedRoomTypes, selectedStatuses, priceRange, sizeRange]);

  const areaOptions = useMemo(
    () => Array.from(new Set(listings.map((p) => p.area).filter(Boolean))).sort(),
    [listings]
  );

  const roomTypeOptions = useMemo(
    () => Array.from(new Set(listings.map((p) => p.roomType).filter(Boolean))).sort(),
    [listings]
  );

  const filteredProperties = useMemo(() => {
    return listings.filter((property) => {
      const matchesSearch =
        !searchQuery ||
        property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (isSale && property.landlordId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (isSale && property.buildingCode?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(property.area);
      const matchesRoomType = selectedRoomTypes.length === 0 || selectedRoomTypes.includes(property.roomType);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(property.status);

      // Chỉ lọc giá khi khoảng giá thực sự thay đổi khỏi mặc định
      const isPriceFilterActive = priceRange[0] !== 500000 || priceRange[1] !== 100000000;
      const matchesPrice = !isPriceFilterActive || (property.price >= priceRange[0] && property.price <= priceRange[1]);

      // Chỉ lọc diện tích khi diện tích thực sự thay đổi khỏi mặc định
      const isSizeFilterActive = sizeRange[0] !== 0 || sizeRange[1] !== 500;
      const matchesSize = !isSizeFilterActive || (property.size >= sizeRange[0] && property.size <= sizeRange[1]);

      return matchesSearch && matchesArea && matchesRoomType && matchesStatus && matchesPrice && matchesSize;
    });
  }, [listings, searchQuery, selectedAreas, selectedRoomTypes, selectedStatuses, priceRange, sizeRange, isSale]);

  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProperties.slice(startIndex, startIndex + pageSize);
  }, [filteredProperties, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProperties.length / pageSize);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('q');
    const qs = params.toString();
    router.replace(`/customer/properties${qs ? `?${qs}` : ''}`, { scroll: false });
    setSelectedAreas([]);
    setSelectedRoomTypes([]);
    setSelectedStatuses([]);
    setPriceSlider([500000, 100000000]);
    setPriceRange([500000, 100000000]);
    setSizeSlider([0, 500]);
    setSizeRange([0, 500]);
  };

  const hasActiveFilters =
    !!searchQuery || selectedAreas.length > 0 || selectedRoomTypes.length > 0 || selectedStatuses.length > 0 ||
    priceRange[0] > 500000 || priceRange[1] < 100000000 ||
    sizeRange[0] > 0 || sizeRange[1] < 500;

  const handleHeartClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(id);
    setHeartAnimating(id);
    setTimeout(() => setHeartAnimating(null), 300);
  };

  const loading = companyLoading || listingsLoading;
  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  const renderFilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Khoảng giá</h3>
        <div className="px-2">
          <Slider
            value={priceSlider}
            onValueChange={setPriceSlider}
            onValueCommit={(v) => setPriceRange(v)}
            min={500000}
            max={100000000}
            step={10000}
            className="w-full"
          />
          <div className="flex justify-between mt-3 text-sm font-medium text-slate-700">
            <span className="tabular-nums">
              {priceSlider[0].toLocaleString('vi-VN')} đ
            </span>
            <span className="tabular-nums">
              {priceSlider[1].toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Diện tích (m²)</h3>
        <div className="px-2">
          <Slider
            value={sizeSlider}
            onValueChange={setSizeSlider}
            onValueCommit={(v) => setSizeRange(v)}
            max={500}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between mt-3 text-sm font-medium text-slate-700">
            <span className="tabular-nums">{sizeSlider[0]}m²</span>
            <span className="tabular-nums">{sizeSlider[1]}m²</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Khu vực</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedAreas([])}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedAreas.length === 0
                ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
          >
            Tất cả
          </button>
          {areaOptions.map((area) => {
            const isSelected = selectedAreas.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => {
                  setSelectedAreas((prev) =>
                    prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {area}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Loại phòng</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedRoomTypes([])}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedRoomTypes.length === 0
                ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
          >
            Tất cả
          </button>
          {roomTypeOptions.map((type) => {
            const isSelected = selectedRoomTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedRoomTypes((prev) =>
                    prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bất Động Sản</h1>
          {company && <p className="text-sm text-slate-500 mt-1">{company.name}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:inline">
            {filteredProperties.length} bất động sản được tìm thấy
          </span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Bộ lọc
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto py-6">
                {renderFilterContent()}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-20 flex flex-col max-h-[calc(100vh-5.5rem)]">
            <div className="flex-1 overflow-y-auto pr-1">
              {renderFilterContent()}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600">Không tìm thấy bất động sản</h3>
              <p className="text-slate-500 mt-2">Hãy thử điều chỉnh bộ lọc</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    <Link href={`/customer/properties/${property.id}`} className="block flex-1">
                      <div className="relative h-48">
                        <Image src={property.imageUrl} alt={property.title} fill className="object-cover" />
                        <button
                          onClick={(e) => handleHeartClick(e, property.id)}
                          className={`absolute top-3 left-3 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors ${heartAnimating === property.id ? 'heart-pop' : ''}`}
                          aria-label="Yêu thích"
                        >
                          <Heart
                            className="h-4 w-4"
                            style={{
                              fill: favorites.has(property.id) ? '#ef4444' : 'none',
                              stroke: favorites.has(property.id) ? '#ef4444' : '#64748b',
                            }}
                          />
                        </button>
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                          <Badge className={
                            property.status === 'available' ? 'bg-green-600 hover:bg-green-700 text-white font-semibold' :
                            property.status === 'reserved' ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold' :
                            property.status === 'rented' ? 'bg-red-600 hover:bg-red-700 text-white font-semibold' :
                            property.status === 'soon_available' ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md border border-blue-500 animate-pulse' :
                            'bg-slate-600 hover:bg-slate-700 text-white'
                          }>
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
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {property.area}
                          </div>
                          {isSale && (
                            <span className="text-xs bg-slate-100 border text-slate-600 px-2 py-0.5 rounded font-mono">
                              Nhà: {property.landlordId || '—'} | Tòa: {property.buildingCode || '—'}
                            </span>
                          )}
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
                      {isSale && (
                        <div className="flex pb-3 pt-2 border-b border-dashed mb-2 text-xs">
                          <Button
                            size="sm"
                            className="w-full h-8 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
                            asChild
                          >
                            <Link href={`/admin/contracts/create?room_id=${property.id}`} onClick={(e) => e.stopPropagation()}>
                              <FileText className="h-3 w-3 mr-1" /> Soạn cọc
                            </Link>
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          disabled={!company}
                          onClick={() =>
                            setViewingProperty({
                              id: property.id,
                              title: property.title,
                              address: property.address,
                              area: property.area,
                              companyId: property.companyId,
                            })
                          }
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          Hẹn xem
                        </Button>
                        <Button size="sm" className="flex-1 h-9" onClick={() => setIsContactOpen(true)}>
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          Liên Hệ
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <Phone className="h-5 w-5" />
              Liên Hệ Môi Giới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2 pb-2 text-center">
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Phone className="h-6 w-6 text-slate-600" />
              </div>
              <span className="text-2xl font-semibold text-slate-800">{hotline}</span>
            </div>
            <Button className="w-full" size="lg" asChild>
              <a href={hotlineHref}>
                <Phone className="h-4 w-4 mr-2" />
                Gọi ngay
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewingProperty && (
        <ViewingRequestDialog
          open={viewingProperty !== null}
          onOpenChange={(open) => { if (!open) setViewingProperty(null); }}
          companyId={viewingProperty.companyId}
          property={viewingProperty}
        />
      )}
    </div>
  );
}
