'use client';

import { useMemo, useState } from 'react';
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
import { ArrowRight, MapPin, Bed, Bath, Square, Phone, Building2, Loader2, Search } from 'lucide-react';

export default function CustomerHomePage() {
  const router = useRouter();
  const { company, companies, loading: companyLoading } = useCustomerCompany();
  const { listings, loading: listingsLoading } = usePublicListings(
    useMemo(() => companies.map((c) => c.id), [companies])
  );
  const featuredProperties = listings.slice(0, 3);
  const loading = companyLoading || listingsLoading;

  const [quickSearch, setQuickSearch] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      router.push(`/customer/properties?q=${encodeURIComponent(quickSearch)}`);
    } else {
      router.push(`/customer/properties`);
    }
  };

  return (
    <div className="flex flex-col bg-bg-base min-h-screen">
      {/* Hero Banner */}
      <section className="relative h-[480px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Bất động sản RealHome"
            fill
            className="object-cover brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading tracking-tight mb-6 drop-shadow-sm text-white">
            Tìm Bất Động Sản Mơ Ước
          </h1>
          <p className="text-base md:text-lg mb-8 max-w-xl mx-auto text-white/90 leading-relaxed">
            {company
              ? `${company.name} — khám phá căn hộ và không gian phù hợp mọi phong cách sống.`
              : 'Khám phá ngôi nhà, căn hộ hoặc không gian thương mại hoàn hảo cùng RealHome.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent-500 text-white font-semibold shadow-md">
              <Link href="/customer/properties">
                Xem Bất Động Sản
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Search Container */}
      <div className="relative z-10 container mx-auto px-4 max-w-3xl -mt-10 mb-12">
        <form onSubmit={handleSearchSubmit} className="bg-white p-4 md:p-5 rounded-lg border border-border-subtle shadow-md grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Nhập khu vực, tên tòa nhà, địa chỉ để tìm nhanh..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="pl-9 h-10 w-full rounded-lg border border-border-subtle bg-bg-subtle text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent focus:bg-white transition-colors"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent-500 text-white font-semibold">
            Tìm kiếm
          </Button>
        </form>
      </div>

      {/* Featured Properties */}
      <section className="py-12 bg-white border-t border-border-subtle">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink font-heading">Bất Động Sản Nổi Bật</h2>
              <p className="text-ink-muted mt-1 text-sm">Những bất động sản được chọn lọc dành riêng cho bạn</p>
            </div>
            <Button variant="outline" asChild className="self-start sm:self-auto">
              <Link href="/customer/properties" className="flex items-center">
                Xem Tất Cả
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : featuredProperties.length === 0 ? (
            <p className="text-center text-ink-muted py-12">Chưa có bất động sản nào được đăng ký hiển thị.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <Link key={property.id} href={`/customer/properties/${property.id}`} className="group">
                  <Card className="overflow-hidden border border-border-subtle rounded-lg bg-white shadow-none hover:border-accent hover:shadow-sm transition-all h-full flex flex-col">
                    <div className="relative h-52 overflow-hidden flex-shrink-0">
                      <Image
                        src={property.imageUrl}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
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
                      <h3 className="text-base font-bold text-ink leading-snug hover:text-accent transition-colors line-clamp-1">
                        {property.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        <span className="line-clamp-1">{property.area}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 mt-auto">
                      <div className="flex items-center gap-4 text-xs text-ink-muted mb-4 border-b border-border-subtle pb-3">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4 text-accent/80" />
                          {property.bedrooms} phòng ngủ
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4 text-accent/80" />
                          {property.bathrooms} WC
                        </span>
                        <span className="flex items-center gap-1">
                          <Square className="h-4 w-4 text-accent/80" />
                          {property.size}m²
                        </span>
                      </div>
                      <p className="text-lg font-bold text-ink font-mono">
                        {property.price.toLocaleString('vi-VN')}đ<span className="text-xs font-normal text-ink-muted">/tháng</span>
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-12 bg-bg-subtle border-y border-border-subtle">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-ink font-heading">{listings.length || '—'}</div>
              <div className="text-ink-muted text-sm mt-1">Bất động sản</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-ink font-heading">1.200+</div>
              <div className="text-ink-muted text-sm mt-1">Khách hàng tin dùng</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-ink font-heading">50+</div>
              <div className="text-ink-muted text-sm mt-1">Chuyên viên hỗ trợ</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-ink font-heading">15+</div>
              <div className="text-ink-muted text-sm mt-1">Năm kinh nghiệm</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-ink font-heading mb-12">
            Tại Sao Chọn RealHome
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border border-border-subtle rounded-lg bg-white shadow-none p-6 flex flex-col items-center">
              <CardHeader className="p-0 mb-4 flex flex-col items-center">
                <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink font-heading">Đa Dạng Lựa Chọn</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Tiếp cận hàng trăm căn phòng trọ và căn hộ dịch vụ chất lượng, đáp ứng đa dạng khoảng giá từ bình dân đến trung cao cấp.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border border-border-subtle rounded-lg bg-white shadow-none p-6 flex flex-col items-center">
              <CardHeader className="p-0 mb-4 flex flex-col items-center">
                <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center mb-3">
                  <MapPin className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink font-heading">Vị Trí Tiện Lợi</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Bất động sản tập trung ở các quận trung tâm, gần trường đại học, khu văn phòng và các trục đường lớn vô cùng tiện lợi di chuyển.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border border-border-subtle rounded-lg bg-white shadow-none p-6 flex flex-col items-center">
              <CardHeader className="p-0 mb-4 flex flex-col items-center">
                <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center mb-3">
                  <Phone className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-ink font-heading">Hỗ Trợ Nhanh Chóng</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-ink-muted text-sm leading-relaxed">
                  Đội ngũ CSKH chuyên nghiệp luôn sẵn sàng tiếp nhận yêu cầu đặt lịch xem phòng trực tiếp và hỗ trợ làm hợp đồng nhanh gọn.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
