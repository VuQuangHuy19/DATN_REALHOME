'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListing } from '@/lib/hooks/usePublicListings';
import { SimilarRoomsWidget } from '@/src/features/properties/components/SimilarRoomsWidget';
import { SameLandlordRoomsWidget } from '@/src/features/properties/components/SameLandlordRoomsWidget';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { LISTING_STATUS_LABELS, DEPOSIT_COMPOSER_ROLES } from '@/lib/customer/constants';
import { formatDateDisplay } from '@/lib/room-status';
import { MapPin, Bed, Bath, Square, Calendar, Phone, Map, ExternalLink, Loader2, Check, X, Zap, PawPrint, Globe, Award, Layers, FileText } from 'lucide-react';

import ImageGallery from '@/src/features/properties/components/ImageGallery';



export default function RoomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { company } = useCustomerCompany();
  const { listing: property, loading, error } = usePublicListing(id);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isViewingOpen, setIsViewingOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const router = useRouter();
  const { role } = useAuth();
  const canComposeDeposit = !!role && DEPOSIT_COMPOSER_ROLES.includes(role as any);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const contractsBasePath = role === 'landlord' ? '/landlord' : role === 'sales_agent' || pathname.startsWith('/broker') ? '/broker' : '/admin';

  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!property || error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Không tìm thấy bất động sản</h1>
      </div>
    );
  }

  const imagesList = property.imageUrls && property.imageUrls.length > 0
    ? property.imageUrls
    : [property.imageUrl];



  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 bg-bg-base">
      {/* Image Gallery */}
      <div className="relative mb-8">
        <ImageGallery items={imagesList} alt={property.title} aspectRatio="detail" priority />

        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
          <Badge variant={property.status === 'available' ? 'default' : 'secondary'} className="text-sm px-3 py-1 shadow-none">
            {LISTING_STATUS_LABELS[property.status]}
          </Badge>
          {property.status === 'soon_available' && property.expectedAvailableDate && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-accent-900/80 text-white backdrop-blur-sm shadow-sm select-none">
              Trống từ: {formatDateDisplay(property.expectedAvailableDate)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-heading text-ink">{property.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-ink-muted">
                <MapPin className="h-5 w-5 text-accent" />
                {property.address}
              </div>
            </div>
            <FavoriteButton roomId={property.id} className="h-10 w-10 [&>svg]:w-5 [&>svg]:h-5 flex-shrink-0" />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted py-3 border-y border-border-subtle font-medium">
            <span className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-accent" />
              <span>{property.bedrooms} Phòng ngủ</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-accent" />
              <span>{property.bathrooms} Phòng tắm</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <Square className="h-4 w-4 text-accent" />
              <span>{property.size}m² Diện tích</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-accent" />
              <span>Tầng {property.floor}</span>
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold font-heading text-ink mb-3">Mô tả</h2>
            <p className="text-ink-muted leading-relaxed whitespace-pre-line">{property.description}</p>
          </div>

          {/* Nội thất */}
          {(() => {
            const activeFurniture = [
              { key: 'hasAirConditioner', label: 'Điều hòa' },
              { key: 'hasWaterHeater', label: 'Nóng lạnh' },
              { key: 'hasBed', label: 'Giường ngủ' },
              { key: 'hasWardrobe', label: 'Tủ quần áo' },
              { key: 'hasKitchenCabinet', label: 'Tủ bếp' },
              { key: 'hasRefrigerator', label: 'Tủ lạnh' },
              { key: 'hasHood', label: 'Máy hút mùi' },
              { key: 'hasDressingTable', label: 'Bàn trang điểm' }
            ].filter((item) => property[item.key as keyof typeof property] === true);

            if (activeFurniture.length === 0) return null;

            return (
              <Card className="border border-border-subtle rounded-lg bg-card shadow-none">
                <CardHeader className="pb-3 border-b border-border-subtle">
                  <CardTitle className="text-base font-bold font-heading text-ink">Nội thất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeFurniture.map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 border border-border-subtle rounded-lg bg-bg-base">
                        <span className="text-ink text-xs font-semibold">{item.label}</span>
                        <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 border flex items-center gap-0.5 text-[10px] py-0.5 font-bold shadow-none">
                          <Check className="h-3 w-3" /> Có
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Tiện ích */}
          <Card className="border border-border-subtle rounded-lg bg-card shadow-none">
            <CardHeader className="pb-3 border-b border-border-subtle">
              <CardTitle className="text-base font-bold font-heading text-ink">Tiện ích</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 border border-border-subtle rounded-lg bg-bg-base">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent" />
                    <span className="text-ink text-xs font-semibold">Thang máy</span>
                  </div>
                  {property.hasElevator !== false ? (
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold shadow-none">
                      <Check className="h-3 w-3" /> Có thang máy
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-bg-subtle text-ink-muted flex items-center gap-1 text-[10px] py-0.5 font-medium border-border-subtle border shadow-none">
                      <X className="h-3 w-3" /> Không có
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 border border-border-subtle rounded-lg bg-bg-base">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-accent" />
                    <span className="text-ink text-xs font-semibold">Hệ thống PCCC</span>
                  </div>
                  {property.pcccCertified !== false ? (
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold shadow-none">
                      <Check className="h-3 w-3" /> Đạt chuẩn PCCC
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-50 text-red-755 hover:bg-red-50 border-red-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold shadow-none">
                      <X className="h-3 w-3" /> Chưa hoàn thiện
                    </Badge>
                  )}
                </div>
              </div>
              
              {property.commonDryingArea && (
                <div className="p-3 bg-bg-subtle border border-border-subtle rounded-lg text-ink-muted text-xs">
                  <span className="font-bold text-ink-muted uppercase block mb-1">Chỗ phơi đồ chung</span>
                  <span className="font-medium text-ink">{property.commonDryingArea}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quy định */}
          <Card className="border border-border-subtle rounded-lg bg-card shadow-none">
            <CardHeader className="pb-3 border-b border-border-subtle">
              <CardTitle className="text-base font-bold font-heading text-ink">Quy định thuê</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm pt-4">
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Square className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Ban công riêng</div>
                  <div className="font-semibold text-ink text-xs">{property.hasPrivateBalcony ? 'Có ban công riêng' : 'Không có'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Calendar className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Hợp đồng tối thiểu</div>
                  <div className="font-semibold text-ink text-xs"><span className="font-mono">{property.minContractMonths ?? 12}</span> tháng</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Bed className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Số người tối đa</div>
                  <div className="font-semibold text-ink text-xs"><span className="font-mono">{property.maxOccupants ?? 2}</span> người/phòng</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Bath className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Số xe tối đa</div>
                  <div className="font-semibold text-ink text-xs"><span className="font-mono">{property.maxVehiclesPerRoom ?? 2}</span> xe/phòng</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <PawPrint className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Nuôi thú cưng</div>
                  <div className="font-semibold text-ink text-xs">{property.allowPet ? 'Cho phép nuôi' : 'Không cho nuôi'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Globe className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Người nước ngoài</div>
                  <div className="font-semibold text-ink text-xs">{property.allowForeigners ? 'Nhận nước ngoài' : 'Chỉ khách Việt'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Zap className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Xe điện VinFast</div>
                  <div className="font-semibold text-ink text-xs">{property.allowVinfastElectric !== false ? 'Nhận & sạc điện' : 'Không nhận xe điện'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="border border-border-subtle bg-card shadow-none rounded-lg">
            <CardContent className="p-6 space-y-5">
              <div>
                <span className="text-xs text-ink-muted uppercase font-semibold block mb-1">Giá thuê phòng</span>
                <div className="text-3xl font-bold text-ink font-mono tracking-tight">
                  {property.price.toLocaleString('vi-VN')}đ<span className="text-sm font-normal text-ink-muted">/tháng</span>
                </div>
              </div>

              {/* Table of costs */}
              <div className="border border-border-subtle rounded-lg overflow-hidden text-sm">
                <div className="flex justify-between p-3 border-b border-border-subtle bg-bg-subtle">
                  <span className="text-ink-muted font-medium">Đặt cọc:</span>
                  <span className="font-semibold text-ink text-right">{property.depositTerms || 'Liên hệ thương lượng'}</span>
                </div>
                <div className="flex justify-between p-3 border-b border-border-subtle">
                  <span className="text-ink-muted font-medium">Hợp đồng tối thiểu:</span>
                  <span className="font-semibold text-ink text-right"><span className="font-mono">{property.minContractMonths ?? 12}</span> tháng</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-ink-muted font-medium">Số người ở tối đa:</span>
                  <span className="font-semibold text-ink text-right"><span className="font-mono">{property.maxOccupants ?? 2}</span> người/phòng</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {canComposeDeposit && (
                  <Button
                    className="w-full bg-accent hover:bg-accent-500 text-white font-semibold rounded-lg shadow-none"
                    size="lg"
                    onClick={() => router.push(`${contractsBasePath}/contracts/create?room_id=${property.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Soạn cọc
                  </Button>
                )}
                <Button className="w-full bg-accent hover:bg-accent-500 text-white font-semibold shadow-none" size="lg" disabled={!company} onClick={() => setIsViewingOpen(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Đặt Lịch Hẹn
                </Button>
                <Button variant="outline" className="w-full text-ink border-border-subtle shadow-none" size="lg" onClick={() => setIsContactOpen(true)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Liên Hệ Môi Giới
                </Button>

                <div
                  className="mt-1 rounded-lg overflow-hidden border border-border-subtle cursor-pointer group relative"
                  onClick={() => setIsMapOpen(true)}
                >
                  <div className="relative h-40">
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(property.address)}&output=embed&z=16`}
                      className="w-full h-full pointer-events-none"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Vị trí trên bản đồ"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="bg-card border border-border-subtle rounded-full px-3 py-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                        <Map className="h-4 w-4 text-accent" />
                        Xem bản đồ
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-card flex items-center gap-1.5 text-xs text-ink-muted border-t border-border-subtle">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
                    <span className="truncate">{property.address}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-5 pb-3">
                <DialogTitle className="flex items-center gap-2 font-heading">
                  <MapPin className="h-5 w-5 text-accent" />
                  Vị trí bất động sản
                </DialogTitle>
                <p className="text-sm text-ink-muted mt-0.5">{property.address}</p>
              </DialogHeader>
              <div className="h-[420px] relative">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(property.address)}&output=embed&z=16`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Bản đồ vị trí"
                />
              </div>
              <div className="px-6 py-4 flex justify-between items-center border-t border-border-subtle bg-bg-subtle">
                <span className="text-sm text-ink-muted">{property.address}</span>
                <Button size="sm" className="bg-accent hover:bg-accent-500 text-white font-semibold shadow-none" asChild>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Mở Google Maps
                  </a>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SameLandlordRoomsWidget currentRoom={property} />
      <SimilarRoomsWidget currentRoom={property} />

      {/* Sticky Bottom Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-bg-base/95 backdrop-blur border-t border-border-subtle p-4 flex items-center justify-between z-30 shadow-none pb-safe">
        <div>
          <div className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Giá thuê</div>
          <div className="text-base font-bold text-ink font-mono">
            {property.price.toLocaleString('vi-VN')}đ/tháng
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {canComposeDeposit && (
            <Button
              size="sm"
              className="h-9 px-3 bg-accent hover:bg-accent-500 text-white font-semibold w-full"
              onClick={() => router.push(`${contractsBasePath}/contracts/create?room_id=${property.id}`)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Soạn cọc
            </Button>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="h-9 px-3 bg-accent hover:bg-accent-500 text-white font-semibold" disabled={!company} onClick={() => setIsViewingOpen(true)}>
              <Calendar className="h-4 w-4 mr-1.5" />
              Hẹn xem
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 text-ink border-border-subtle" onClick={() => setIsContactOpen(true)}>
              <Phone className="h-4 w-4 mr-1.5" />
              Liên hệ
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Liên Hệ Môi Giới</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <Phone className="h-5 w-5 text-accent" />
              <span className="text-lg font-bold text-ink font-mono">{hotline}</span>
            </div>
            <Button className="w-full bg-accent hover:bg-accent-500 text-white font-semibold" size="lg" asChild>
              <a href={hotlineHref}>
                <Phone className="h-4 w-4 mr-2" />
                Gọi ngay
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {property && (
        <ViewingRequestDialog
          open={isViewingOpen}
          onOpenChange={setIsViewingOpen}
          companyId={property.companyId}
          property={{
            id: property.id,
            title: property.title,
            address: property.address,
            area: property.area,
          }}
        />
      )}
    </div>
  );
}
