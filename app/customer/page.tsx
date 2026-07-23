'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { formatDateDisplay } from '@/lib/room-status';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import type { CustomerListing } from '@/lib/customer/types';
import {
  ArrowRight, MapPin, Bed, Bath, Square, Phone, Building2, Loader2, Search,
  Sparkles, CheckCircle2, ShieldCheck, Zap, Bot, Cat, Compass, SlidersHorizontal,
  ChevronRight, Calendar, Heart, Star, Users, Award, Eye
} from 'lucide-react';
import { getAreaColorClass } from '@/lib/utils/colors';

// ─── Kiểu dữ liệu nhóm theo tòa nhà ─────────────────────────────────────────
interface BuildingGroup {
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
  allowPet?: boolean;
}

// ─── Danh sách Ảnh minh họa Nổi bật cho các Quận Hà Nội ────────────────────
const DISTRICT_IMAGES: Record<string, string> = {
  'Cầu Giấy': 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Đống Đa': 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Ba Đình': 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Thanh Xuân': 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Nam Từ Liêm': 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Hai Bà Trưng': 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Bắc Từ Liêm': 'https://images.pexels.com/photos/276514/pexels-photo-276514.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Tây Hồ': 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800',
};

// Ảnh mặc định chất lượng cao cho các quận khác
const DEFAULT_DISTRICT_IMAGE = 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800';

// Helper rút gọn khu vực
function formatArea(area: string): string {
  if (!area) return '';
  const parts = area.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    let ward = parts[0].replace(/^(phường|phường|xã|xã|thị trấn|thị trấn)\s+/i, '').trim();
    let district = parts[1].replace(/^(quận|quận|huyện|huyện|thị xã|thị xã|thành phố|thành phố)\s+/i, '').trim();
    if (ward && district) return `${ward} - ${district}`;
  }
  return area;
}

export default function CustomerHomePage() {
  const router = useRouter();
  const { company, companies, loading: companyLoading } = useCustomerCompany();
  const { listings, loading: listingsLoading } = usePublicListings(
    useMemo(() => companies.map((c) => c.id), [companies])
  );

  // States
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('');
  const [viewingGroup, setViewingGroup] = useState<BuildingGroup | null>(null);

  const loading = companyLoading || listingsLoading;

  // Gom nhóm listings theo Tòa nhà từ DB thực tế
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
        new Set(
          rooms.flatMap((r) =>
            (r.imageUrls ?? [])
              .concat(r.thumbnailUrls ?? [])
              .concat([r.imageUrl, r.thumbnailUrl])
              .filter(Boolean)
          )
        )
      );

      const hasPet = rooms.some((r) => r.allowPet);

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
        allowPet: hasPet,
      } satisfies BuildingGroup;
    });
  }, [listings]);

  // Gom thống kê theo Quận/Khu vực từ DB thực tế
  const districtStats = useMemo(() => {
    const map = new Map<string, { count: number; minPrice: number; sampleImage: string }>();

    for (const group of buildingGroups) {
      // Bóc tách tên Quận từ chuỗi area (ví dụ: "Phường Láng Hạ, Quận Đống Đa" -> "Đống Đa")
      const parts = group.area.split(',').map((p) => p.trim());
      let districtName = parts.length >= 2 ? parts[1].replace(/^(quận|quận|huyện|huyện)\s+/i, '').trim() : group.area;
      if (!districtName) districtName = group.area;

      const current = map.get(districtName) || { count: 0, minPrice: Infinity, sampleImage: '' };
      map.set(districtName, {
        count: current.count + group.rooms.length,
        minPrice: Math.min(current.minPrice, group.minPrice || Infinity),
        sampleImage: DISTRICT_IMAGES[districtName] || group.allImages[0] || DEFAULT_DISTRICT_IMAGE,
      });
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        minPrice: data.minPrice === Infinity ? 0 : data.minPrice,
        image: DISTRICT_IMAGES[name] || data.sampleImage || DEFAULT_DISTRICT_IMAGE,
      }))
      .sort((a, b) => b.count - a.count);
  }, [buildingGroups]);

  // Danh sách Tòa nhà nổi bật (tối đa 6 tòa)
  const featuredBuildingGroups = useMemo(() => buildingGroups.slice(0, 6), [buildingGroups]);

  // Thống kê động thực tế từ DB
  const stats = useMemo(() => {
    const totalAvailableRooms = listings.filter((r) => r.status === 'available' || r.status === 'soon_available').length;
    const petFriendlyCount = buildingGroups.filter((g) => g.allowPet).length;
    return {
      totalRooms: listings.length,
      availableRooms: totalAvailableRooms,
      totalBuildings: buildingGroups.length,
      totalDistricts: districtStats.length,
      petFriendlyBuildings: petFriendlyCount,
    };
  }, [listings, buildingGroups, districtStats]);

  // Submit form tìm kiếm
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (quickSearch.trim()) params.set('q', quickSearch.trim());
    if (selectedDistrictFilter) params.set('district', selectedDistrictFilter);
    if (selectedPriceFilter) params.set('price', selectedPriceFilter);

    const queryString = params.toString();
    router.push(`/customer/properties${queryString ? `?${queryString}` : ''}`);
  };

  // Kích hoạt tìm kiếm theo Tag gợi ý
  const handleTagClick = (tagQuery: string) => {
    router.push(`/customer/properties?q=${encodeURIComponent(tagQuery)}`);
  };

  return (
    <div className="flex flex-col bg-bg-base min-h-screen">
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO BANNER SANG TRỌNG & ĐA TIÊU CHÍ                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[540px] lg:min-h-[580px] flex items-center justify-center overflow-hidden bg-slate-950 py-16">
        {/* Background Image với Gradient Overlay nhiều lớp */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="RealHome Luxury Property"
            fill
            className="object-cover object-center brightness-[0.45] scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-black/40 to-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center text-white flex flex-col items-center">
          {/* Badge AI Spotlight */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-medium mb-6 shadow-lg shadow-amber-500/10 animate-fade-in">
            <Sparkles className="h-4 w-4 text-amber-400 animate-spin-slow" />
            <span>RealHome AI Copilot — Tìm phòng thông minh 24/7</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-heading tracking-tight mb-4 text-white leading-tight max-w-4xl drop-shadow-md">
            Khám Phá Căn Hộ & Phòng Trọ <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">Ước Mơ</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg mb-8 max-w-2xl text-white/85 leading-relaxed font-normal">
            {company
              ? `${company.name} — Nền tảng kết nối căn hộ dịch vụ chất lượng hàng đầu với thông tin minh bạch & chính xác 100%.`
              : 'Trải nghiệm tìm kiếm bất động sản cho thuê thông minh, xem phòng 24/7 & hỗ trợ đặt cọc trực tuyến an toàn.'}
          </p>

          {/* Form Lọc Tìm Kiếm Đa Tiêu Chí Trôi (Floating Search Bar) */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-4xl bg-white/95 dark:bg-card/95 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-full border border-white/40 dark:border-border-subtle shadow-2xl shadow-black/30 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2.5 items-center text-ink"
          >
            {/* Input Từ khóa */}
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Nhập tên tòa nhà, địa chỉ, ngõ, đường..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="pl-11 pr-4 h-12 w-full rounded-full border-none bg-slate-100/80 dark:bg-slate-900/60 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-accent transition-all font-medium"
              />
            </div>

            {/* Selector Chọn Quận */}
            <div className="relative">
              <select
                value={selectedDistrictFilter}
                onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                className="h-12 px-4 rounded-full bg-slate-100/80 dark:bg-slate-900/60 text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent border-none transition cursor-pointer w-full sm:w-auto"
              >
                <option value="">Tất cả Quận/Huyện</option>
                {districtStats.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.count} phòng)
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Khoảng giá */}
            <div className="relative">
              <select
                value={selectedPriceFilter}
                onChange={(e) => setSelectedPriceFilter(e.target.value)}
                className="h-12 px-4 rounded-full bg-slate-100/80 dark:bg-slate-900/60 text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent border-none transition cursor-pointer w-full sm:w-auto"
              >
                <option value="">Mọi khoảng giá</option>
                <option value="under_3m">Dưới 3 triệu</option>
                <option value="3m_5m">3 - 5 triệu</option>
                <option value="5m_8m">5 - 8 triệu</option>
                <option value="over_8m">Trên 8 triệu</option>
              </select>
            </div>

            {/* Nút Tìm kiếm */}
            <Button
              type="submit"
              size="lg"
              className="h-12 px-7 rounded-full bg-accent hover:bg-accent-500 text-white font-bold shadow-lg shadow-accent/30 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Tìm Kiếm</span>
            </Button>
          </form>

          {/* Quick Search Chips (Từ khóa HOT) */}
          <div className="mt-5 flex flex-wrap justify-center items-center gap-2 text-xs font-medium text-white/90">
            <span className="text-white/60 flex items-center gap-1 font-semibold">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Tìm nhanh:
            </span>
            <button
              onClick={() => handleTagClick('Cầu Giấy')}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition-all"
            >
              🔥 Cầu Giấy
            </button>
            <button
              onClick={() => handleTagClick('Đống Đa')}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition-all"
            >
              📍 Đống Đa
            </button>
            <button
              onClick={() => handleTagClick('nuôi thú cưng')}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition-all"
            >
              🐾 Cho nuôi mèo
            </button>
            <button
              onClick={() => handleTagClick('Đại học Ngoại Thương')}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition-all"
            >
              🎓 Quanh ĐH Ngoại Thương
            </button>
            <button
              onClick={() => handleTagClick('thang máy')}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition-all hidden sm:inline-block"
            >
              ⚡ Có Thang máy
            </button>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. DYNAMIC LIVE SYSTEM STATS (THỐNG KÊ THỰC TỪ SUPABASE DB)          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-20 -mt-8 container mx-auto px-4">
        <div className="bg-card border border-border-subtle rounded-2xl shadow-xl p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-border-subtle">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-ink font-mono">{stats.totalRooms || '—'}</div>
            <div className="text-xs md:text-sm text-ink-muted mt-0.5 font-medium">Phòng cho thuê trong DB</div>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 font-mono">{stats.availableRooms || '—'}</div>
            <div className="text-xs md:text-sm text-ink-muted mt-0.5 font-medium">Phòng sẵn sàng ở ngay</div>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-ink font-mono">{stats.totalBuildings || '—'}</div>
            <div className="text-xs md:text-sm text-ink-muted mt-0.5 font-medium">Tòa nhà thuộc hệ thống</div>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
              <Bot className="h-5 w-5" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-ink font-mono">24/7</div>
            <div className="text-xs md:text-sm text-ink-muted mt-0.5 font-medium">Trợ lý AI Tìm phòng</div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. HOT DISTRICTS GRID (KHU VỰC NỔI BẬT TỪ DATABASE)                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-bg-base">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider mb-2">
                <Compass className="h-4 w-4" /> Vị Trí Đắc Địa
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink font-heading">Khu Vực Nổi Bật Tại Hà Nội</h2>
              <p className="text-ink-muted text-sm mt-1">Khám phá các căn hộ tập trung ở những quận trung tâm sầm uất nhất</p>
            </div>
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/customer/properties" className="flex items-center gap-1.5">
                <span>Xem tất cả khu vực</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : districtStats.length === 0 ? (
            <p className="text-center text-ink-muted py-8">Chưa có dữ liệu khu vực.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {districtStats.slice(0, 4).map((district) => (
                <Link
                  key={district.name}
                  href={`/customer/properties?q=${encodeURIComponent(district.name)}`}
                  className="group relative h-64 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <Image
                    src={district.image}
                    alt={district.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  <div className="absolute bottom-0 inset-x-0 p-5 text-white flex flex-col gap-1">
                    <Badge variant="secondary" className="w-fit bg-accent text-white font-bold border-none text-xs">
                      {district.count} phòng trống
                    </Badge>
                    <h3 className="text-xl font-bold font-heading text-white group-hover:text-amber-300 transition-colors">
                      Quận {district.name}
                    </h3>
                    <p className="text-xs text-white/80">
                      Giá từ <span className="font-bold text-amber-300 font-mono">{district.minPrice.toLocaleString('vi-VN')}đ</span>/tháng
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. FEATURED BUILDINGS GRID (BẤT ĐỘNG SẢN TÒA NHÀ NỔI BẬT TỪ DB)     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-bg-subtle/60 border-y border-border-subtle">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Bất Động Sản Chọn Lọc
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink font-heading">Tòa Nhà & Căn Hộ Nổi Bật</h2>
              <p className="text-ink-muted text-sm mt-1">Danh sách tòa nhà chính chủ với mã phòng trống cập nhật theo thời gian thực</p>
            </div>
            <Button size="lg" asChild className="rounded-full bg-accent hover:bg-accent-500 text-white font-semibold shadow-md">
              <Link href="/customer/properties" className="flex items-center gap-2">
                <span>Xem toàn bộ {stats.totalRooms} phòng</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : featuredBuildingGroups.length === 0 ? (
            <p className="text-center text-ink-muted py-12">Chưa có dữ liệu bất động sản khả dụng.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {featuredBuildingGroups.map((group) => {
                const priceLabel =
                  group.minPrice === group.maxPrice
                    ? `${group.minPrice.toLocaleString('vi-VN')}đ`
                    : `${group.minPrice.toLocaleString('vi-VN')} – ${group.maxPrice.toLocaleString('vi-VN')}đ`;

                return (
                  <Card
                    key={group.buildingId}
                    className="overflow-hidden border border-border-subtle rounded-2xl bg-card shadow-sm hover:border-accent hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    {/* Ảnh đại diện tòa nhà */}
                    <div className="relative h-56 overflow-hidden flex-shrink-0">
                      <Image
                        src={group.allImages[0] || '/placeholder.jpg'}
                        alt={group.buildingName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                      {/* Area Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge variant="outline" className={`bg-white/90 dark:bg-card/90 backdrop-blur-md font-semibold text-xs ${getAreaColorClass(group.area)}`}>
                          {formatArea(group.area)}
                        </Badge>
                      </div>

                      {/* Pet-friendly Badge */}
                      {group.allowPet && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-emerald-600 text-white font-medium text-[11px] gap-1 shadow-md">
                            <Cat className="h-3 w-3" /> Cho nuôi pet
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Nội dung thông tin tòa nhà */}
                    <CardHeader className="pb-2 pt-4 px-5">
                      <h3 className="text-base font-bold text-ink leading-snug group-hover:text-accent font-heading transition-colors line-clamp-1">
                        {group.buildingName}
                      </h3>
                      <p className="text-xs text-ink-muted flex items-center gap-1 line-clamp-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                        {group.address}
                      </p>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 mt-auto flex flex-col gap-3">
                      {/* Mã phòng trống thực tế */}
                      <div className="text-xs py-2 px-3 rounded-lg bg-bg-subtle border border-border-subtle">
                        {group.availableRoomCodes.length > 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            🟢 Phòng trống:{' '}
                            <span className="text-ink font-semibold">
                              {group.availableRoomCodes.slice(0, 5).join(', ')}
                              {group.availableRoomCodes.length > 5 && ` +${group.availableRoomCodes.length - 5} phòng`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">Hiện hết phòng trống</span>
                        )}
                      </div>

                      {/* Giá */}
                      <div className="flex items-baseline justify-between pt-1">
                        <p className="text-lg font-extrabold text-ink font-mono">
                          {priceLabel}
                          <span className="text-xs font-normal text-ink-muted"> / tháng</span>
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs rounded-xl"
                          onClick={() => setViewingGroup(group)}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Hẹn xem
                        </Button>
                        <Button
                          size="sm"
                          asChild
                          className="h-9 text-xs rounded-xl bg-accent hover:bg-accent-500 text-white font-semibold"
                        >
                          <Link href={`/customer/properties/${group.buildingId}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Chi tiết
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 5. LIFESTYLE & NEED-BASED FILTERS (TÌM PHÒNG THEO NHU CẦU)            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-bg-base">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ink font-heading">Tìm Phòng Theo Nhu Cầu Bản Thân</h2>
            <p className="text-ink-muted text-sm mt-2">Dù bạn là sinh viên, dân văn phòng hay hộ gia đình nhỏ, RealHome đều có lựa chọn phù hợp</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/customer/properties?q=sinh+viên"
              className="p-6 rounded-2xl bg-card border border-border-subtle hover:border-accent hover:shadow-lg transition-all duration-300 flex flex-col items-start group"
            >
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-ink font-heading mb-1 group-hover:text-accent transition-colors">Gần Trường Đại Học</h3>
              <p className="text-xs text-ink-muted leading-relaxed">Giá hợp lý, gần ĐH Ngoại Thương, Bách Khoa, Quốc Gia... đi lại thuận tiện.</p>
            </Link>

            <Link
              href="/customer/properties?q=studio"
              className="p-6 rounded-2xl bg-card border border-border-subtle hover:border-accent hover:shadow-lg transition-all duration-300 flex flex-col items-start group"
            >
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-ink font-heading mb-1 group-hover:text-accent transition-colors">Studio Hiện Đại</h3>
              <p className="text-xs text-ink-muted leading-relaxed">Full nội thất, giờ giấc tự do, khép kín dành cho dân văn phòng bận rộn.</p>
            </Link>

            <Link
              href="/customer/properties?q=nuôi+thú+cưng"
              className="p-6 rounded-2xl bg-card border border-border-subtle hover:border-accent hover:shadow-lg transition-all duration-300 flex flex-col items-start group"
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cat className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-ink font-heading mb-1 group-hover:text-accent transition-colors">Cho Nuôi Thú Cưng</h3>
              <p className="text-xs text-ink-muted leading-relaxed">Tòa nhà thoải mái cho nuôi chó mèo nhỏ, không sợ vi phạm quy định.</p>
            </Link>

            <Link
              href="/customer/properties?q=thang+máy"
              className="p-6 rounded-2xl bg-card border border-border-subtle hover:border-accent hover:shadow-lg transition-all duration-300 flex flex-col items-start group"
            >
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-ink font-heading mb-1 group-hover:text-accent transition-colors">Tòa Nhà Thang Máy</h3>
              <p className="text-xs text-ink-muted leading-relaxed">Trang bị thang máy tốc độ cao, khóa vân tay an ninh 24/7.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 6. AI ASSISTANT SHOWCASE BANNER (BANNER TƯƠNG TÁC AI COPILOT)         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 container mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-8 md:p-12 border border-amber-500/30 shadow-2xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-4 border border-amber-500/40">
              <Bot className="h-4 w-4 text-amber-400" /> Trợ Lý AI RealHome 24/7
            </div>

            <h2 className="text-2xl md:text-4xl font-extrabold font-heading text-white leading-tight mb-4">
              Không Tìm Thấy Phòng Vừa Ý? <br />
              <span className="text-amber-400">Hãy Để AI Tìm Giúp Bạn!</span>
            </h2>

            <p className="text-sm md:text-base text-white/80 leading-relaxed mb-6">
              Bạn chỉ cần hỏi bằng giọng văn bình thường, ví dụ: <br />
              <span className="italic font-medium text-amber-200">
                &quot;Tìm phòng gần ĐH Ngoại Thương bán kính 3km giá dưới 5 triệu&quot;
              </span>
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => {
                  // Mở AI Chat Widget
                  const aiBtn = document.querySelector('button[aria-label="Mở Trợ lý AI"]') as HTMLButtonElement;
                  if (aiBtn) aiBtn.click();
                }}
                className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25"
              >
                <Bot className="h-5 w-5 mr-2" /> Chat Ngay Với AI
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 7. WHY CHOOSE REALHOME (GIÁ TRỊ NỔI BẬT)                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-bg-subtle/50 border-t border-border-subtle">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-ink font-heading mb-12">
            Tại Sao Khách Hàng Tin Chọn RealHome
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border border-border-subtle rounded-2xl bg-card shadow-sm p-6 flex flex-col items-center hover:border-accent transition-colors">
              <CardHeader className="p-0 mb-4 flex flex-col items-center">
                <div className="w-14 h-14 bg-accent-soft rounded-2xl flex items-center justify-center mb-3">
                  <ShieldCheck className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink font-heading">Thông Tin Xác Thực 100%</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Hình ảnh thực tế, thông tin giá cả và diện tích được đội ngũ nhân sự kiểm duyệt kỹ lưỡng trước khi hiển thị.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border border-border-subtle rounded-2xl bg-card shadow-sm p-6 flex flex-col items-center hover:border-accent transition-colors">
              <CardHeader className="p-0 mb-4 flex flex-col items-center">
                <div className="w-14 h-14 bg-accent-soft rounded-2xl flex items-center justify-center mb-3">
                  <Calendar className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink font-heading">Hẹn Xem Phòng Trực Tuyến</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Chủ động đặt lịch hẹn xem phòng chỉ trong 30 giây, đội ngũ chuyên viên liên hệ xác nhận tức thì.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border border-border-subtle rounded-2xl bg-card shadow-sm p-6 flex flex-col items-center hover:border-accent transition-colors">
              <CardHeader className="p-0 mb-4 flex flex-col items-center">
                <div className="w-14 h-14 bg-accent-soft rounded-2xl flex items-center justify-center mb-3">
                  <Phone className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink font-heading">Hỗ Trợ Tận Tâm 24/7</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Hệ thống Trợ lý AI kết hợp nhân viên tư vấn hỗ trợ làm hợp đồng đặt cọc & bàn giao phòng an toàn.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dialog đặt lịch hẹn xem phòng */}
      {viewingGroup && (
        <ViewingRequestDialog
          open={viewingGroup !== null}
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
    </div>
  );
}
