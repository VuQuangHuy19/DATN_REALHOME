'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import type { CustomerListing } from '@/lib/customer/types';
import {
  MapPin, Phone, Calendar, Loader2, AlertCircle,
  SlidersHorizontal, Filter, ArrowUpDown, FileText
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { DEPOSIT_COMPOSER_ROLES } from '@/lib/customer/constants';
import Pagination from '@/components/Pagination';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import ImageGallery from '@/src/features/properties/components/ImageGallery';

const PropertiesMapViewDynamic = dynamic(() => import('@/src/features/properties/components/PropertiesMapView'), { ssr: false, loading: () => <div className="h-[600px] w-full rounded-md border bg-slate-100 animate-pulse flex items-center justify-center text-sm text-slate-500">Đang tải bản đồ...</div> });

// Helper format rút gọn khu vực
function formatArea(area: string): string {
  if (!area) return '';
  const parts = area.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    let ward = parts[0]
      .replace(/^(phường|phường|xã|xã|thị trấn|thị trấn)\s+/i, '')
      .trim();
    let district = parts[1]
      .replace(/^(quận|quận|huyện|huyện|thị xã|thị xã|thành phố|thành phố)\s+/i, '')
      .trim();
    if (ward && district) {
      return `${ward} - ${district}`;
    }
  }
  return area;
}

// ─── Kiểu dữ liệu nhóm theo tòa nhà ─────────────────────────────────────────
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
}



// ─── Thẻ tòa nhà ─────────────────────────────────────────────────────────────
function BuildingCard({
  group,
  onBook,
  onContact,
  canComposeDeposit,
  onComposeDeposit,
}: {
  group: BuildingGroup;
  onBook: (g: BuildingGroup) => void;
  onContact: () => void;
  canComposeDeposit: boolean;
  onComposeDeposit: (buildingId: string) => void;
}) {
  const hasAvailable = group.availableRoomCodes.length > 0;
  const priceLabel =
    group.minPrice === group.maxPrice
      ? `${group.minPrice.toLocaleString('vi-VN')}đ`
      : `${group.minPrice.toLocaleString('vi-VN')} – ${group.maxPrice.toLocaleString('vi-VN')}đ`;

  return (
    <Link
      href={`/customer/properties/${group.buildingId}`}
      className="rounded-lg overflow-hidden bg-card border border-border-subtle shadow-none hover:border-accent hover:shadow-sm transition-all flex flex-col cursor-pointer group"
    >
      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <ImageGallery items={group.allImages} alt={group.buildingName} />
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Tên tòa nhà */}
        <h3 className="text-base font-bold text-ink leading-snug group-hover:text-accent font-heading transition-colors line-clamp-1">
          {group.buildingName}
        </h3>

        {/* Khu vực */}
        <div className="flex items-center gap-1 text-sm text-ink-muted">
          <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
          <span className="line-clamp-1">{formatArea(group.area)}</span>
        </div>

        {/* Phòng trống */}
        <div className="text-sm">
          {hasAvailable ? (
            <span className="text-green-700 font-medium">
              Phòng trống:{' '}
              <span className="text-ink">
                {group.availableRoomCodes.slice(0, 6).join(', ')}
                {group.availableRoomCodes.length > 6 && ` +${group.availableRoomCodes.length - 6} phòng`}
              </span>
            </span>
          ) : (
            <span className="text-ink-muted italic text-xs">Hiện tại không còn phòng trống</span>
          )}
        </div>

        {/* Giá */}
        <p className="text-lg font-bold text-ink font-mono">
          {priceLabel}
          <span className="text-sm font-normal text-ink-muted"> / tháng</span>
        </p>

        {/* Nút action */}
        <div className="flex flex-col gap-2 pt-1 mt-auto">
          {canComposeDeposit && (
            <Button
              size="sm"
              className="w-full h-9 text-sm bg-accent hover:bg-accent-500 text-white font-semibold"
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
              className="flex-1 h-9 text-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBook(group);
              }}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Hẹn xem
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-sm bg-accent hover:bg-accent-500 text-white font-semibold"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContact();
              }}
            >
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Liên hệ
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Location Filter 3 cấp thật (vn_provinces → vn_districts → vn_wards) ────
interface VnProvince { id: string; name: string; }
interface VnDistrict { id: string; name: string; province_id: string; }
interface VnWard { id: string; name: string; level: string; district_id: string; }

function LocationFilter({
  selectedProvinceId,
  selectedDistrictId,
  selectedWardId,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
}: {
  selectedProvinceId: string;
  selectedDistrictId: string;
  selectedWardId: string;
  onProvinceChange: (id: string, name?: string) => void;
  onDistrictChange: (id: string, name?: string) => void;
  onWardChange: (id: string, name?: string) => void;
}) {
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [districts, setDistricts] = useState<VnDistrict[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingWard, setLoadingWard] = useState(false);

  // Load tất cả tỉnh/thành phố khi mount
  useEffect(() => {
    setLoadingProv(true);
    supabase
      .from('vn_provinces')
      .select('id, name')
      .order('name')
      .then(({ data }: { data: VnProvince[] | null }) => {
        setProvinces(data ?? []);
        setLoadingProv(false);
      });
  }, []);

  // Load quận/huyện khi chọn tỉnh
  useEffect(() => {
    setDistricts([]);
    setWards([]);
    if (!selectedProvinceId) return;
    setLoadingDist(true);
    supabase
      .from('vn_districts')
      .select('id, name, province_id')
      .eq('province_id', selectedProvinceId)
      .order('name')
      .then(({ data }: { data: VnDistrict[] | null }) => {
        setDistricts(data ?? []);
        setLoadingDist(false);
      });
  }, [selectedProvinceId]);

  // Load phường/xã khi chọn quận
  useEffect(() => {
    setWards([]);
    if (!selectedDistrictId) return;
    setLoadingWard(true);
    supabase
      .from('vn_wards')
      .select('id, name, level, district_id')
      .eq('district_id', selectedDistrictId)
      .order('name')
      .then(({ data }: { data: VnWard[] | null }) => {
        setWards(data ?? []);
        setLoadingWard(false);
      });
  }, [selectedDistrictId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {/* Tỉnh / Thành phố */}
      <div>
        <label className="block text-xs text-ink-muted mb-1 font-medium">Tỉnh / Thành phố</label>
        <select
          value={selectedProvinceId}
          onChange={(e) => { 
            const val = e.target.value;
            const name = provinces.find(p => p.id === val)?.name || '';
            onProvinceChange(val, name); 
            onDistrictChange('', ''); 
            onWardChange('', ''); 
          }}
          disabled={loadingProv}
          className="w-full h-10 rounded-lg border border-border-subtle bg-card px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition disabled:opacity-60"
        >
          <option value="">Tất cả tỉnh/thành</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Quận / Huyện */}
      <div>
        <label className="block text-xs text-ink-muted mb-1 font-medium">Quận / Huyện</label>
        <select
          value={selectedDistrictId}
          onChange={(e) => { 
            const val = e.target.value;
            const name = districts.find(d => d.id === val)?.name || '';
            onDistrictChange(val, name); 
            onWardChange('', ''); 
          }}
          disabled={!selectedProvinceId || loadingDist}
          className="w-full h-10 rounded-lg border border-border-subtle bg-card px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-900/30"
        >
          <option value="">{loadingDist ? 'Đang tải...' : 'Tất cả quận/huyện'}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Phường / Xã */}
      <div>
        <label className="block text-xs text-ink-muted mb-1 font-medium">Phường / Xã</label>
        <select
          value={selectedWardId}
          onChange={(e) => {
            const val = e.target.value;
            const name = wards.find(w => w.id === val)?.name || '';
            onWardChange(val, name);
          }}
          disabled={!selectedDistrictId || loadingWard}
          className="w-full h-10 rounded-lg border border-border-subtle bg-card px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-900/30"
        >
          <option value="">{loadingWard ? 'Đang tải...' : 'Tất cả phường/xã'}</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Sort options ─────────────────────────────────────────────────────────────
type SortOption = 'all' | 'price_asc' | 'price_desc' | 'newest' | 'size_desc' | 'size_asc';
const SORT_LABELS: Record<SortOption, string> = {
  all: 'Tất cả các phòng',
  price_asc: 'Giá từ thấp tới cao',
  price_desc: 'Giá từ cao tới thấp',
  newest: 'Tin đăng mới nhất',
  size_desc: 'Diện tích từ lớn tới nhỏ',
  size_asc: 'Diện tích từ nhỏ tới lớn',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('q') || '';
  const { company, companies, loading: companyLoading } = useCustomerCompany();
  const { role } = useAuth();
  const isSale = role === 'sales_agent';
  const canComposeDeposit = !!role && DEPOSIT_COMPOSER_ROLES.includes(role as any);
  const contractsBasePath = role === 'landlord' ? '/landlord' : '/admin';
  const { listings, loading: listingsLoading, error } = usePublicListings(
    useMemo(() => companies.map((c) => c.id), [companies]),
    isSale
  );

  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [priceSlider, setPriceSlider] = useState<number[]>([500000, 100000000]);
  const [priceRange, setPriceRange] = useState<number[]>([500000, 100000000]);
  const [sizeSlider, setSizeSlider] = useState<number[]>([0, 500]);
  const [sizeRange, setSizeRange] = useState<number[]>([0, 500]);
  const [sortBy, setSortBy] = useState<SortOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const pageSize = 9;

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<BuildingGroup | null>(null);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedProvinceId, selectedDistrictId, selectedWardId, selectedAreas, priceRange, sizeRange, selectedRoomTypes, sortBy]);

  const roomTypeOptions = useMemo(
    () => Array.from(new Set(listings.map((p) => p.roomType).filter(Boolean))).sort(),
    [listings]
  );

  const areaOptions = useMemo(
    () => Array.from(new Set(listings.map((p) => p.area).filter(Boolean))).sort(),
    [listings]
  );

  // Gom listings theo buildingId
  const buildingGroups = useMemo<BuildingGroup[]>(() => {
    const map = new Map<string, CustomerListing[]>();
    for (const listing of listings) {
      const key = listing.buildingId || listing.buildingName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(listing);
    }

    return Array.from(map.entries()).map(([buildingId, rooms]) => {
      const rep = rooms[0];
      const available = rooms.filter((r) => r.status === 'available' || r.status === 'soon_available');
      const prices = rooms.map((r) => r.price).filter((p) => p > 0);
      const allImages = Array.from(
        new Set(rooms.flatMap((r) => r.thumbnailUrls ?? [r.thumbnailUrl]).filter(Boolean))
      );

      return {
        buildingId,
        buildingName: rep.buildingName,
        area: rep.area,
        address: rep.address,
        companyId: rep.companyId,
        availableRoomCodes: available.map((r) => r.title.split('—')[1]?.trim() || r.id.slice(0, 6)),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        allImages: allImages.length ? allImages : ['/placeholder.jpg'],
        rooms,
        representativeRoom: rep,
      } satisfies BuildingGroup;
    });
  }, [listings]);

  // Lọc
  const filteredGroups = useMemo(() => {
    return buildingGroups.filter((g) => {
      const matchSearch = !searchQuery ||
        g.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.address.toLowerCase().includes(searchQuery.toLowerCase());
      // Lọc theo quận/huyện (districtId) hoặc phường/xã (wardId) nếu đã chọn
      // Fallback: nếu dữ liệu import từ file csv ko có districtId/wardId, ta parse tên quận/phường và so khớp với g.area hoặc g.address
      const distNameClean = selectedDistrictName.replace(/^(Quận|Huyện|Thị xã)\s+/i, '').trim().toLowerCase();
      const matchDistrict = !selectedDistrictId || (
        g.representativeRoom.districtId === selectedDistrictId ||
        (!g.representativeRoom.districtId && g.area.toLowerCase().includes(distNameClean)) ||
        (!g.representativeRoom.districtId && g.address.toLowerCase().includes(distNameClean))
      );
      
      const wardNameClean = selectedWardName.replace(/^(Phường|Xã|Thị trấn)\s+/i, '').trim().toLowerCase();
      const matchWard = !selectedWardId || (
        g.representativeRoom.wardId === selectedWardId ||
        (!g.representativeRoom.wardId && g.address.toLowerCase().includes(wardNameClean))
      );

      const matchArea = selectedAreas.length === 0 || selectedAreas.includes(g.area);
      const isPriceActive = priceRange[0] !== 500000 || priceRange[1] !== 100000000;
      const matchPrice = !isPriceActive || (g.minPrice <= priceRange[1] && g.maxPrice >= priceRange[0]);
      const isSizeActive = sizeRange[0] !== 0 || sizeRange[1] !== 500;
      const matchSize = !isSizeActive || g.rooms.some((r) => r.size >= sizeRange[0] && r.size <= sizeRange[1]);
      const matchRoomType = selectedRoomTypes.length === 0 || g.rooms.some((r) => selectedRoomTypes.includes(r.roomType));
      return matchSearch && matchDistrict && matchWard && matchArea && matchPrice && matchSize && matchRoomType;
    });
  }, [buildingGroups, searchQuery, selectedDistrictId, selectedWardId, selectedAreas, priceRange, sizeRange, selectedRoomTypes]);

  // Sắp xếp
  const sortedGroups = useMemo(() => {
    const arr = [...filteredGroups];
    if (sortBy === 'price_asc') {
      arr.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortBy === 'price_desc') {
      arr.sort((a, b) => b.maxPrice - a.maxPrice);
    } else if (sortBy === 'size_desc') {
      arr.sort((a, b) => {
        const aMax = a.rooms.length ? Math.max(...a.rooms.map((r) => r.size)) : 0;
        const bMax = b.rooms.length ? Math.max(...b.rooms.map((r) => r.size)) : 0;
        return bMax - aMax;
      });
    } else if (sortBy === 'size_asc') {
      arr.sort((a, b) => {
        const aMin = a.rooms.length ? Math.min(...a.rooms.map((r) => r.size)) : 0;
        const bMin = b.rooms.length ? Math.min(...b.rooms.map((r) => r.size)) : 0;
        return aMin - bMin;
      });
    } else { // newest
      arr.sort((a, b) => {
        const aDates = a.rooms.map((r) => r.createdAt).filter(Boolean) as string[];
        const bDates = b.rooms.map((r) => r.createdAt).filter(Boolean) as string[];
        const aLatest = aDates.length ? Math.max(...aDates.map((d) => new Date(d).getTime())) : 0;
        const bLatest = bDates.length ? Math.max(...bDates.map((d) => new Date(d).getTime())) : 0;
        if (aLatest === bLatest) {
          return b.rooms[0].buildingId.localeCompare(a.rooms[0].buildingId);
        }
        return bLatest - aLatest;
      });
    }
    return arr;
  }, [filteredGroups, sortBy]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedGroups.slice(start, start + pageSize);
  }, [sortedGroups, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedGroups.length / pageSize);

  const clearFilters = () => {
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardId('');
    setSelectedAreas([]);
    setSelectedRoomTypes([]);
    setPriceSlider([500000, 100000000]);
    setPriceRange([500000, 100000000]);
    setSizeSlider([0, 500]);
    setSizeRange([0, 500]);
    setSortBy('newest');
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('q');
    const qs = params.toString();
    router.replace(`/customer/properties${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const hasActiveFilters =
    !!searchQuery || !!selectedProvinceId || !!selectedDistrictId || !!selectedWardId ||
    selectedAreas.length > 0 ||
    selectedRoomTypes.length > 0 ||
    priceRange[0] > 500000 || priceRange[1] < 100000000 ||
    sizeRange[0] > 0 || sizeRange[1] < 500;

  const loading = companyLoading || listingsLoading;
  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  const renderFilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold font-heading text-ink mb-3">Khoảng giá</h3>
        <div className="px-2">
          <Slider
            value={priceSlider}
            onValueChange={setPriceSlider}
            onValueCommit={(v) => setPriceRange(v)}
            min={500000}
            max={100000000}
            step={100000}
            className="w-full"
          />
          <div className="flex justify-between mt-3 text-sm font-medium text-ink-muted">
            <span>{priceSlider[0].toLocaleString('vi-VN')} đ</span>
            <span>{priceSlider[1].toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold font-heading text-ink mb-3">Diện tích (m²)</h3>
        <div className="px-2">
          <Slider
            value={sizeSlider}
            onValueChange={setSizeSlider}
            onValueCommit={(v) => setSizeRange(v)}
            max={500}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between mt-3 text-sm font-medium text-ink-muted">
            <span>{sizeSlider[0]}m²</span>
            <span>{sizeSlider[1]}m²</span>
          </div>
        </div>
      </div>


      <div>
        <h3 className="font-semibold font-heading text-ink mb-3">Loại phòng</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedRoomTypes([])}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedRoomTypes.length === 0 ? 'bg-accent-soft border-accent text-accent' : 'bg-card border-border-subtle text-ink-muted hover:border-accent hover:text-ink'
              }`}
          >
            Tất cả
          </button>
          {roomTypeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                setSelectedRoomTypes((prev) =>
                  prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedRoomTypes.includes(type) ? 'bg-accent-soft border-accent text-accent' : 'bg-card border-border-subtle text-ink-muted hover:border-accent hover:text-ink'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {areaOptions.length > 0 && (
        <div>
          <h3 className="font-semibold font-heading text-ink mb-3">Khu vực nhanh</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedAreas([])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedAreas.length === 0 ? 'bg-accent-soft border-accent text-accent' : 'bg-card border-border-subtle text-ink-muted hover:border-accent hover:text-ink'
                }`}
            >
              Tất cả
            </button>
            {areaOptions.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() =>
                  setSelectedAreas((prev) =>
                     prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
                  )
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedAreas.includes(area) ? 'bg-accent-soft border-accent text-accent' : 'bg-card border-border-subtle text-ink-muted hover:border-accent hover:text-ink'
                  }`}
              >
                {formatArea(area)}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 bg-bg-base">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4 relative">
        <div>
          <h1 className="text-3xl font-bold font-heading text-ink">Bất Động Sản</h1>
          {company && <p className="text-sm text-ink-muted mt-0.5">{company.name}</p>}
        </div>

        {/* Mobile filter */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden flex-shrink-0">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Lọc
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto py-6">
              {renderFilterContent()}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 3-cấp vị trí */}
      <LocationFilter
        selectedProvinceId={selectedProvinceId}
        selectedDistrictId={selectedDistrictId}
        selectedWardId={selectedWardId}
        onProvinceChange={setSelectedProvinceId}
        onDistrictChange={(id, name) => {
          setSelectedDistrictId(id);
          setSelectedDistrictName(name || '');
        }}
        onWardChange={(id, name) => {
          setSelectedWardId(id);
          setSelectedWardName(name || '');
        }}
      />

      {/* Thanh kết quả + sort */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <span className="text-sm text-ink-muted font-medium">
          {sortedGroups.length} bất động sản được tìm thấy
        </span>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-border-subtle mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-card shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              Danh sách
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-card shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              Bản đồ
            </button>
          </div>
          
          <ArrowUpDown className="h-4 w-4 text-ink-muted flex-shrink-0 hidden sm:block" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 rounded-lg border border-border-subtle bg-card px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>

        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar filter (desktop) */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20 flex flex-col max-h-[calc(100vh-5.5rem)]">
            <div className="flex-1 overflow-y-auto pr-1">
              {renderFilterContent()}
            </div>
          </div>
        </aside>

        {/* Grid tòa nhà */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border-subtle rounded-lg p-8">
              <Filter className="h-12 w-12 text-ink-muted/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold font-heading text-ink">Không tìm thấy bất động sản phù hợp</h3>
              <p className="text-ink-muted mt-2 text-sm max-w-md mx-auto leading-relaxed">
                Chúng tôi không tìm thấy bất động sản nào khớp với bộ lọc hiện tại của bạn. Bạn hãy thử nới rộng khoảng giá, tăng diện tích tìm kiếm hoặc xóa bớt các tiêu chí lọc để tìm được nhiều lựa chọn hơn.
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Xóa bộ lọc</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {viewMode === 'map' ? (
                <PropertiesMapViewDynamic 
                  groups={filteredGroups} 
                  onBook={setViewingGroup}
                  onContact={() => setIsContactOpen(true)}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginatedGroups.map((group) => (
                      <BuildingCard
                        key={group.buildingId}
                        group={group}
                        onBook={setViewingGroup}
                        onContact={() => setIsContactOpen(true)}
                        canComposeDeposit={canComposeDeposit}
                        onComposeDeposit={(buildingId) =>
                          router.push(`${contractsBasePath}/contracts/create?building_id=${buildingId}`)
                        }
                      />
                    ))}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialog liên hệ */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center font-heading">
              <Phone className="h-5 w-5" />
              Liên Hệ Môi Giới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2 pb-2 text-center">
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center">
                <Phone className="h-6 w-6 text-accent" />
              </div>
              <span className="text-2xl font-semibold text-ink font-mono">{hotline}</span>
            </div>
            <Button className="w-full bg-accent hover:bg-accent-500 text-white font-semibold" size="lg" asChild>
              <a href={hotlineHref}><Phone className="h-4 w-4 mr-2" />Gọi ngay</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog đặt lịch xem */}
      {viewingGroup && (
        <ViewingRequestDialog
          open={viewingGroup !== null}
          onOpenChange={(open) => { if (!open) setViewingGroup(null); }}
          companyId={viewingGroup.companyId}
          property={{
            id: viewingGroup.representativeRoom.id,
            title: viewingGroup.buildingName,
            address: viewingGroup.address,
            area: viewingGroup.area,
          }}
        />
      )}
    </div>
  );
}
