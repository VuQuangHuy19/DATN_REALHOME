'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { PriceRangeFilter, type MultiPriceValue } from '@/components/customer/PriceRangeFilter';
import { SizeRangeFilter, type MultiSizeValue } from '@/components/customer/SizeRangeFilter';
import { computeSmartPriceBrackets } from '@/src/hooks/useSmartPriceBrackets';
import { computeSmartSizeBrackets } from '@/src/hooks/useSmartSizeBrackets';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListings } from '@/src/hooks/usePublicListings';
import type { CustomerListing } from '@/src/lib/customer/types';
import {
  MapPin, Phone, Calendar, Loader2, AlertCircle,
  SlidersHorizontal, Filter, ArrowUpDown, FileText, Search, X, Copy, CheckCheck, Link as LinkIcon
} from 'lucide-react';
import { getAreaColorClass } from '@/src/lib/utils/colors';
import { maskHouseNumberInBuildingName, cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/auth/AuthContext';
import { DEPOSIT_COMPOSER_ROLES } from '@/src/lib/customer/constants';
import Pagination from '@/components/Pagination';
import { supabase } from '@/src/lib/supabase/client';
import dynamic from 'next/dynamic';
import ImageGallery from '@/src/features/properties/components/ImageGallery';
import { FavoriteButton } from '@/components/customer/FavoriteButton';

const PropertiesMapViewDynamic = dynamic(() => import('@/src/features/properties/components/PropertiesMapView'), { ssr: false, loading: () => <div className="h-[600px] w-full rounded-md border bg-slate-100 animate-pulse flex items-center justify-center text-sm text-slate-500">Đang tải bản đồ...</div> });

import { BuildingCard, type BuildingGroup, formatArea } from '@/components/customer/BuildingCard';

import { getProvinces, getDistricts, getWards, type VnProvince, type VnDistrict, type VnWard } from '@/src/lib/supabase/repositories/vn_locations';

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
    getProvinces().then((data) => {
      setProvinces(data);
      setLoadingProv(false);
    });
  }, []);

  // Load quận/huyện khi chọn tỉnh
  useEffect(() => {
    setDistricts([]);
    setWards([]);
    if (!selectedProvinceId) return;
    setLoadingDist(true);
    getDistricts(selectedProvinceId).then((data) => {
      setDistricts(data);
      setLoadingDist(false);
    });
  }, [selectedProvinceId]);

  // Load phường/xã khi chọn quận
  useEffect(() => {
    setWards([]);
    if (!selectedDistrictId) return;
    setLoadingWard(true);
    getWards(selectedDistrictId).then((data) => {
      setWards(data);
      setLoadingWard(false);
    });
  }, [selectedDistrictId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
  const pathname = usePathname() || '';
  const isBrokerRoute = pathname.startsWith('/broker') || pathname.startsWith('/admin') || pathname.startsWith('/landlord');
  const { company, companies, loading: companyLoading } = useCustomerCompany();
  const { role, user, profile } = useAuth();
  const isStaffOrBroker = isBrokerRoute || (!!role && ['company_admin', 'manager', 'sales_agent', 'super_admin', 'landlord'].includes(role));
  const isSale = isStaffOrBroker;
  const canComposeDeposit = !!role && DEPOSIT_COMPOSER_ROLES.includes(role as any);
  const contractsBasePath = role === 'landlord' ? '/landlord' : role === 'sales_agent' || pathname.startsWith('/broker') ? '/broker' : '/admin';
  const { listings, loading: listingsLoading, error } = usePublicListings(
    useMemo(() => companies.map((c) => c.id), [companies]),
    isSale
  );

  const [searchValue, setSearchValue] = useState(searchQuery);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);

  // Bộ lọc giá thông minh: null = không lọc ("Tất cả")
  const [priceFilter, setPriceFilter] = useState<MultiPriceValue | null>(null);
  const priceParamKey = searchParams?.get('price') || '';

  // Bộ lọc diện tích thông minh: null = không lọc ("Tất cả")
  const [sizeFilter, setSizeFilter] = useState<MultiSizeValue | null>(null);

  const smartPriceBrackets = useMemo(() => computeSmartPriceBrackets(listings), [listings]);
  const smartSizeBrackets = useMemo(() => computeSmartSizeBrackets(listings), [listings]);

  const [hasInitDbRanges, setHasInitDbRanges] = useState(false);

  useEffect(() => {
    if (listings.length > 0 && !hasInitDbRanges) {
      if (priceParamKey) {
        setPriceFilter({ selectedKeys: [priceParamKey], manual: null });
      }
      setHasInitDbRanges(true);
    }
  }, [listings, hasInitDbRanges, priceParamKey]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProvinceId || selectedDistrictId || selectedWardId) count++;
    if (selectedAreas.length > 0) count++;
    if (selectedRoomTypes.length > 0) count++;
    if (priceFilter !== null) count++;
    if (sizeFilter !== null) count++;
    return count;
  }, [
    selectedProvinceId,
    selectedDistrictId,
    selectedWardId,
    selectedAreas,
    selectedRoomTypes,
    priceFilter,
    sizeFilter,
  ]);
  const [sortBy, setSortBy] = useState<SortOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const pageSize = 9;

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<BuildingGroup | null>(null);

  // ━━━ Sale Referral Link Tracking ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const refSaleId = searchParams?.get('ref') || null;
  const [copyLinkDone, setCopyLinkDone] = useState(false);

  useEffect(() => {
    if (refSaleId && typeof window !== 'undefined') {
      sessionStorage.setItem('sale_ref_id', refSaleId);
    }
  }, [refSaleId]);

  const handleCopyReferralLink = useCallback(() => {
    const saleId = user?.id || profile?.id;
    if (!saleId || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('ref', saleId);
    url.searchParams.delete('q');
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopyLinkDone(true);
      setTimeout(() => setCopyLinkDone(false), 2500);
    });
  }, [user?.id, profile?.id]);

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (val) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.replace(`/customer/properties${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedProvinceId, selectedDistrictId, selectedWardId, selectedAreas, priceFilter, sizeFilter, selectedRoomTypes, sortBy]);

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

    const groups = Array.from(map.entries()).map(([buildingId, rooms]) => {
      const rep = rooms[0];
      const extractNum = (t: string) => {
        const code = t.split('—')[1]?.trim() || t;
        const match = code.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 99999;
      };
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
          const targetDateStr = r.expectedAvailableDate || (r as any).availableDate;
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
            const highResImgs = (r.imageUrls && r.imageUrls.length > 0)
              ? r.imageUrls
              : (r.imageUrl ? [r.imageUrl] : (r.thumbnailUrls && r.thumbnailUrls.length > 0 ? r.thumbnailUrls : [r.thumbnailUrl]));
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
          expectedAvailableDate: r.expectedAvailableDate || (r as any).availableDate,
        })),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        allImages: allImages.length ? allImages : ['/placeholder.jpg'],
        rooms,
        representativeRoom: rep,
        isVerifiedProperty: rooms.some((r) => r.isVerifiedProperty),
        landlordSystemName: rep.landlordSystemName ?? rooms.find((r) => r.landlordSystemName)?.landlordSystemName,
        landlordName: rep.landlordName ?? rooms.find((r) => r.landlordName)?.landlordName,
      } satisfies BuildingGroup;
    });

    return groups.filter(
      (g) => isStaffOrBroker ? g.rooms.length > 0 : (g.availableRoomCodes.length > 0 || (g.soonAvailableRooms && g.soonAvailableRooms.length > 0))
    );
  }, [listings]);

  // Lọc
  const filteredGroups = useMemo(() => {
    return buildingGroups.filter((g) => {
      const matchSearch = !searchQuery ||
        g.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.rooms.some((r) => r.address?.toLowerCase().includes(searchQuery.toLowerCase()));

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
      const matchPrice = !priceFilter || (
        priceFilter.selectedKeys.length === 0 && !priceFilter.manual
      ) || g.rooms.some((r) => {
        const p = r.price;
        if (!p) return false;
        const matchKey = priceFilter.selectedKeys.some((k) => {
          const b = smartPriceBrackets.find((sb) => sb.key === k);
          if (!b) return false;
          return p >= b.min && (b.max === Infinity ? true : p < b.max);
        });
        if (matchKey) return true;
        if (priceFilter.manual) {
          const { min, max } = priceFilter.manual;
          return p >= min && (max === Infinity ? true : p <= max);
        }
        return false;
      });

      const matchSize = !sizeFilter || (
        sizeFilter.selectedKeys.length === 0 && !sizeFilter.manual
      ) || g.rooms.some((r) => {
        const s = r.size;
        if (!s) return false;
        const matchKey = sizeFilter.selectedKeys.some((k) => {
          const b = smartSizeBrackets.find((sb) => sb.key === k);
          if (!b) return false;
          return s >= b.min && (b.max === Infinity ? true : s < b.max);
        });
        if (matchKey) return true;
        if (sizeFilter.manual) {
          const { min, max } = sizeFilter.manual;
          return s >= min && (max === Infinity ? true : s <= max);
        }
        return false;
      });

      const matchRoomType = selectedRoomTypes.length === 0 || g.rooms.some((r) => selectedRoomTypes.includes(r.roomType));
      return matchSearch && matchDistrict && matchWard && matchArea && matchPrice && matchSize && matchRoomType;
    });
  }, [buildingGroups, searchQuery, selectedDistrictId, selectedWardId, selectedAreas, priceFilter, sizeFilter, selectedRoomTypes, smartPriceBrackets, smartSizeBrackets]);

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
    setSearchValue('');
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardId('');
    setSelectedAreas([]);
    setSelectedRoomTypes([]);
    setPriceFilter(null);
    setSizeFilter(null);
    setSortBy('newest');
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('q');
    const qs = params.toString();
    router.replace(`/customer/properties${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const hasActiveFilters =
    !!searchValue || !!searchQuery || !!selectedProvinceId || !!selectedDistrictId || !!selectedWardId ||
    selectedAreas.length > 0 ||
    selectedRoomTypes.length > 0 ||
    priceFilter !== null ||
    sizeFilter !== null;

  const loading = companyLoading || listingsLoading;
  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  const renderFilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold font-heading text-ink mb-3">Khoảng giá (triệu đ)</h3>
        <PriceRangeFilter
          listings={listings}
          value={priceFilter}
          onChange={setPriceFilter}
          showManualInput={true}
        />
      </div>

      <div>
        <h3 className="font-semibold font-heading text-ink mb-3">Diện tích (m²)</h3>
        <SizeRangeFilter
          listings={listings}
          value={sizeFilter}
          onChange={setSizeFilter}
          showManualInput={true}
        />
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

        <div className="flex items-center gap-2">
          {/* Nút Copy Link Môi giới — chỉ hiện khi role = sales_agent */}
          {isSale && (
            <Button
              variant="outline"
              size="sm"
              className={`flex-shrink-0 gap-1.5 font-bold transition-all ${
                copyLinkDone
                  ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                  : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
              onClick={handleCopyReferralLink}
              title="Copy link giới thiệu phòng cho khách — lịch hẹn sẽ tự động gắn cho bạn"
            >
              {copyLinkDone
                ? <><CheckCheck className="h-3.5 w-3.5" /> Đã copy!</>
                : <><LinkIcon className="h-3.5 w-3.5" /> Copy Link</>}
            </Button>
          )}
        </div>
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

      <div className="flex gap-8">
        {/* Sidebar filter (desktop) */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20 flex flex-col max-h-[calc(100vh-5.5rem)]">
            <div className="flex-1 overflow-y-auto pr-1">
              {renderFilterContent()}
            </div>
          </div>
        </aside>

        {/* Cột phải: Cụm Control dính cố định + Grid tòa nhà */}
        <div className="flex-1 min-w-0">
          <div className="sticky top-16 z-30 bg-bg-base/75 dark:bg-bg-base/75 backdrop-blur-md pt-1 pb-3 mb-4 transition-all">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-border-subtle/90 shadow-md p-2.5 sm:p-3 rounded-xl mb-2.5 flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-accent pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm bất động sản, tên tòa nhà, địa chỉ, khu vực..."
                  className="w-full h-10 pl-10 pr-9 rounded-lg border border-border-subtle bg-white/90 dark:bg-slate-800/90 text-sm text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition placeholder:text-ink-muted/70 shadow-xs"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Xóa tìm kiếm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-3 flex-shrink-0 border-border-subtle bg-white/90 dark:bg-slate-800/90 hover:bg-bg-subtle text-ink font-bold gap-1.5 shadow-xs"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-accent" />
                      <span>Lọc</span>
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-accent text-white font-extrabold rounded-full">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[360px] flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto py-6">
                      {renderFilterContent()}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-0.5 sm:px-1 flex-nowrap w-full min-w-0">
              <span className="text-[11px] sm:text-xs text-ink-muted font-bold whitespace-nowrap bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs px-2 sm:px-2.5 py-1 rounded-lg border border-border-subtle/50 shrink-0">
                <span className="sm:hidden">{sortedGroups.length} BĐS</span>
                <span className="hidden sm:inline">{sortedGroups.length} bất động sản được tìm thấy</span>
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
                <div className="flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-0.5 sm:p-1 rounded-lg border border-border-subtle shadow-xs shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors whitespace-nowrap ${viewMode === 'grid' ? 'bg-accent text-white shadow-xs' : 'text-ink-muted hover:text-ink'}`}
                  >
                    Danh sách
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors ${viewMode === 'map' ? 'bg-accent text-white shadow-xs' : 'text-ink-muted hover:text-ink'}`}
                  >
                    Bản đồ
                  </button>
                </div>
                
                <ArrowUpDown className="h-3.5 w-3.5 text-ink-muted flex-shrink-0 hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-7 sm:h-8.5 rounded-lg border border-border-subtle bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-1.5 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition shadow-xs max-w-[115px] sm:max-w-none truncate"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

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
