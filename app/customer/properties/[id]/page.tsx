'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicListing } from '@/lib/hooks/usePublicListings';
import { LISTING_STATUS_LABELS } from '@/lib/customer/constants';
import { formatDateDisplay } from '@/lib/room-status';
import { MapPin, Bed, Bath, Square, Calendar, Phone, Map, ExternalLink, Loader2, ChevronLeft, ChevronRight, Check, X, Zap, PawPrint, Globe, Award, Layers } from 'lucide-react';

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { company } = useCustomerCompany();
  const { listing: property, loading, error } = usePublicListing(id);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isViewingOpen, setIsViewingOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % imagesList.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      {/* Image Slider / Carousel */}
      <div className="relative h-[400px] md:h-[500px] rounded-xl overflow-hidden mb-8 group bg-slate-950">
        <Image
          src={imagesList[activeImageIndex]}
          alt={`${property.title} - Ảnh ${activeImageIndex + 1}`}
          fill
          className="object-cover transition-all duration-500 ease-in-out"
          priority
        />
        
        {/* Navigation Arrows */}
        {imagesList.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
              aria-label="Ảnh sau"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Indicators Dots */}
        {imagesList.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {imagesList.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activeImageIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Chuyển đến ảnh ${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
          <Badge variant={property.status === 'available' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
            {LISTING_STATUS_LABELS[property.status]}
          </Badge>
          {property.status === 'soon_available' && property.expectedAvailableDate && (
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-black/60 text-white backdrop-blur-sm shadow-sm select-none">
              Trống từ: {formatDateDisplay(property.expectedAvailableDate)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{property.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-slate-600">
              <MapPin className="h-5 w-5" />
              {property.address}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 py-3 border-y font-medium">
            <span className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-slate-400" />
              <span>{property.bedrooms} Phòng ngủ</span>
            </span>
            <span className="text-slate-350">•</span>
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-slate-400" />
              <span>{property.bathrooms} Phòng tắm</span>
            </span>
            <span className="text-slate-355">•</span>
            <span className="flex items-center gap-1.5">
              <Square className="h-4 w-4 text-slate-400" />
              <span>{property.size}m² Diện tích</span>
            </span>
            <span className="text-slate-355">•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Tầng {property.floor}</span>
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Mô tả</h2>
            <p className="text-slate-600 leading-relaxed">{property.description}</p>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800">Nội thất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeFurniture.map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-2.5 border rounded-lg bg-white shadow-sm">
                        <span className="text-slate-700 text-xs font-medium">{item.label}</span>
                        <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 border flex items-center gap-0.5 text-[10px] py-0.5 font-bold">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Tiện ích</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700 text-xs font-medium">Thang máy</span>
                  </div>
                  {property.hasElevator !== false ? (
                    <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold">
                      <Check className="h-3 w-3" /> Có thang máy
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 flex items-center gap-1 text-[10px] py-0.5 font-medium border-slate-200 border">
                      <X className="h-3 w-3" /> Không có
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700 text-xs font-medium">Hệ thống PCCC</span>
                  </div>
                  {property.pcccCertified !== false ? (
                    <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold">
                      <Check className="h-3 w-3" /> Đạt chuẩn PCCC
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-50 text-red-750 hover:bg-red-50 border-red-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold">
                      <X className="h-3 w-3" /> Chưa hoàn thiện
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white shadow-sm sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700 text-xs font-medium">Xe điện VinFast</span>
                  </div>
                  {property.allowVinfastElectric !== false ? (
                    <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold">
                      <Check className="h-3 w-3" /> Nhận & sạc điện
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 flex items-center gap-1 text-[10px] py-0.5 font-medium border-slate-200 border">
                      <X className="h-3 w-3" /> Không nhận xe điện
                    </Badge>
                  )}
                </div>
              </div>
              
              {property.commonDryingArea && (
                <div className="p-3 bg-slate-50 border rounded-lg text-slate-600 text-xs">
                  <span className="font-semibold text-slate-500 uppercase block mb-1">Chỗ phơi đồ chung</span>
                  <span className="font-medium text-slate-700">{property.commonDryingArea}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quy định */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Quy định</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Square className="h-4.5 w-4.5 text-indigo-655 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Ban công riêng</div>
                  <div className="font-semibold text-slate-700 text-xs">{property.hasPrivateBalcony ? 'Có ban công riêng' : 'Không có'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Calendar className="h-4.5 w-4.5 text-indigo-655 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Hợp đồng tối thiểu</div>
                  <div className="font-semibold text-slate-700 text-xs">{property.minContractMonths ?? 12} tháng</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Bed className="h-4.5 w-4.5 text-indigo-655 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Số người tối đa</div>
                  <div className="font-semibold text-slate-700 text-xs">{property.maxOccupants ?? 2} người/phòng</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Bath className="h-4.5 w-4.5 text-indigo-655 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Số xe tối đa</div>
                  <div className="font-semibold text-slate-700 text-xs">{property.maxVehiclesPerRoom ?? 2} xe/phòng</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <PawPrint className="h-4.5 w-4.5 text-indigo-655 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Nuôi thú cưng</div>
                  <div className="font-semibold text-slate-700 text-xs">{property.allowPet ? 'Cho phép nuôi' : 'Không cho nuôi'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Globe className="h-4.5 w-4.5 text-indigo-655 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Người nước ngoài</div>
                  <div className="font-semibold text-slate-700 text-xs">{property.allowForeigners ? 'Nhận nước ngoài' : 'Chỉ khách Việt'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-slate-800 mb-4">
                {property.price.toLocaleString('vi-VN')}đ/tháng
              </div>
              {property.depositTerms && (
                <div className="text-xs text-slate-500 font-semibold mb-4 flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-slate-500 font-medium">Phương thức thanh toán:</span>
                  <span className="text-indigo-600 font-bold text-sm bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{property.depositTerms}</span>
                </div>
              )}
              <div className="space-y-3">
                <Button className="w-full" size="lg" disabled={!company} onClick={() => setIsViewingOpen(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Đặt Lịch Hẹn
                </Button>
                <Button variant="outline" className="w-full" size="lg" onClick={() => setIsContactOpen(true)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Liên Hệ Môi Giới
                </Button>

                <div
                  className="mt-1 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group relative"
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
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <Map className="h-4 w-4" />
                        Xem bản đồ
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-white flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-5 pb-3">
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Vị trí bất động sản
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">{property.address}</p>
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
              <div className="px-6 py-4 flex justify-between items-center border-t bg-slate-50">
                <span className="text-sm text-slate-600">{property.address}</span>
                <Button size="sm" asChild>
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

      {/* Sticky Bottom Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 p-4 flex items-center justify-between z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
        <div>
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Giá thuê</div>
          <div className="text-base font-bold text-slate-800">
            {property.price.toLocaleString('vi-VN')}đ/tháng
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 px-3" disabled={!company} onClick={() => setIsViewingOpen(true)}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Hẹn xem
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => setIsContactOpen(true)}>
            <Phone className="h-4 w-4 mr-1.5" />
            Liên hệ
          </Button>
        </div>
      </div>

      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liên Hệ Môi Giới</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <Phone className="h-5 w-5 text-slate-600" />
              <span className="text-lg font-medium">{hotline}</span>
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
