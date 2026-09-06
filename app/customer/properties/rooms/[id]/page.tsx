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
import { MapPin, Bed, Bath, Square, Calendar, Phone, Map, ExternalLink, Loader2, Check, X, Zap, PawPrint, Globe, Award, Layers, FileText, Link as LinkIcon, CheckCheck, Wind, Flame, Shirt, Utensils, Sparkles, Box, RotateCw, ShieldCheck, Droplets, Wifi, Sun, Lock } from 'lucide-react';

import ImageGallery from '@/src/features/properties/components/ImageGallery';
import { detectDryerFeature } from '@/lib/utils/dryer-parser';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { MonthlyCostEstimator } from '@/components/customer/MonthlyCostEstimator';

function DressingTableIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="5.5" rx="4" ry="4.5" />
      <line x1="12" y1="10" x2="12" y2="12" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="4" y1="12" x2="4" y2="21" />
      <line x1="20" y1="12" x2="20" y2="21" />
      <line x1="13" y1="12" x2="13" y2="17" />
      <line x1="13" y1="17" x2="20" y2="17" />
      <line x1="13" y1="14.5" x2="20" y2="14.5" />
      <path d="M7 16h4M7.5 16l-1 5M10.5 16l1 5" />
    </svg>
  );
}

function RangeHoodIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 3h6v4H9z" />
      <path d="M9 7L4 12h16L15 7" />
      <rect x="2" y="12" width="20" height="3" rx="0.5" />
      <path d="M6 18c.5.8.5 1.7 0 2.5" />
      <path d="M10 18c.5.8.5 1.7 0 2.5" />
      <path d="M14 18c.5.8.5 1.7 0 2.5" />
      <path d="M18 18c.5.8.5 1.7 0 2.5" />
    </svg>
  );
}



function FurnitureBlueprintIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 3a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 4 21" />
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M12 7.5L8.5 11h7L12 7.5z" />
      <rect x="9" y="11" width="6" height="5" />
      <line x1="7" y1="16" x2="17" y2="16" />
      <path d="M14.5 4.5l4 4-5.5 5.5-3.5.5.5-3.5 4.5-4.5z" />
      <path d="M14 20l6-6v6h-6z" />
    </svg>
  );
}

export default function RoomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { company } = useCustomerCompany();
  const { listing: property, loading, error } = usePublicListing(id);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isViewingOpen, setIsViewingOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const router = useRouter();
  const { role, user, profile } = useAuth();

  const handleCopyRoomLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const baseUrl = `${window.location.origin}/customer/properties/rooms/${id}`;
    const saleId = user?.id || profile?.id;
    const finalUrl = saleId ? `${baseUrl}?ref=${saleId}` : baseUrl;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

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
              <h1 className="text-3xl font-bold font-heading text-ink">{maskHouseNumberInBuildingName(property.title)}</h1>
              <div className="flex items-center gap-2 mt-2 text-ink-muted">
                <MapPin className="h-5 w-5 text-accent" />
                {maskHouseNumberInBuildingName(property.address)}
              </div>


            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className={`gap-1.5 font-bold transition-all ${
                  copyDone
                    ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                    : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                }`}
                onClick={handleCopyRoomLink}
                title="Copy link phòng này gửi cho khách"
              >
                {copyDone ? <CheckCheck className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                <span>{copyDone ? 'Đã copy Link Phòng!' : 'Copy Link Phòng'}</span>
              </Button>
              <FavoriteButton roomId={property.id} className="h-10 w-10 [&>svg]:w-5 [&>svg]:h-5" />
            </div>
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
            const furnitureIconMap: Record<string, any> = {
              hasAirConditioner: Wind,
              hasWaterHeater: Flame,
              hasBed: Bed,
              hasWardrobe: Shirt,
              hasKitchenCabinet: Utensils,
              hasRefrigerator: Box,
              hasHood: RangeHoodIcon,
              hasDressingTable: DressingTableIcon,
              hasDryerDynamic: RotateCw,
            };

            const baseFurniture = [
              { key: 'hasAirConditioner', label: 'Điều hòa' },
              { key: 'hasWaterHeater', label: 'Nóng lạnh' },
              { key: 'hasBed', label: 'Giường ngủ' },
              { key: 'hasWardrobe', label: 'Tủ quần áo' },
              { key: 'hasKitchenCabinet', label: 'Tủ bếp' },
              { key: 'hasRefrigerator', label: 'Tủ lạnh' },
              { key: 'hasHood', label: 'Máy hút mùi' },
              { key: 'hasDressingTable', label: 'Bàn trang điểm' }
            ].filter((item) => property[item.key as keyof typeof property] === true);

            // Dynamic scan for dryer / washing dryer from description & building title
            const dryerScan = detectDryerFeature(
              [property.description, property.buildingName, property.title].filter(Boolean).join(' | ')
            );

            if (dryerScan.hasDryer) {
              baseFurniture.push({
                key: 'hasDryerDynamic',
                label: dryerScan.label || 'Máy sấy',
              });
            }

            const activeFurniture = baseFurniture;

            if (activeFurniture.length === 0) return null;

            return (
              <Card className="border border-amber-200/80 dark:border-slate-800 rounded-xl bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-amber-100 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-950/20">
                  <CardTitle className="text-base font-bold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FurnitureBlueprintIcon className="h-4 w-4 text-amber-500" />
                    Nội thất
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm p-4 sm:p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeFurniture.map((item) => {
                      const IconComp = furnitureIconMap[item.key] || Sparkles;
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-center gap-2 p-3 border border-amber-300/70 dark:border-amber-800/60 rounded-xl bg-amber-500/15 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-extrabold shadow-xs hover:scale-[1.02] hover:bg-amber-500/25 hover:border-amber-400 transition-all duration-200 cursor-default"
                        >
                          <IconComp className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Tiện ích */}
          <Card className="border border-blue-200/80 dark:border-slate-800 rounded-xl bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-blue-100 dark:border-slate-800 bg-blue-500/5 dark:bg-blue-950/20">
              <CardTitle className="text-base font-bold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Tiện ích tòa nhà
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 border border-blue-200/70 dark:border-blue-900/50 rounded-xl bg-blue-500/10 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-slate-900 dark:text-slate-100 text-xs font-bold">Thang máy</span>
                  </div>
                  {property.hasElevator !== false ? (
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 flex items-center gap-1 text-[11px] py-0.5 font-bold shadow-none">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Có thang máy
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 flex items-center gap-1 text-[11px] py-0.5 font-medium border-slate-200 shadow-none">
                      <X className="h-3.5 w-3.5" /> Không có
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-900 dark:text-slate-100 text-xs font-bold">Hệ thống PCCC</span>
                  </div>
                  {property.pcccCertified !== false ? (
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 flex items-center gap-1 text-[11px] py-0.5 font-bold shadow-none">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Đạt chuẩn PCCC
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-500/20 text-red-800 dark:text-red-300 border-red-300 flex items-center gap-1 text-[11px] py-0.5 font-bold shadow-none">
                      <X className="h-3.5 w-3.5 text-red-600" /> Chưa hoàn thiện
                    </Badge>
                  )}
                </div>
              </div>

              {property.commonDryingArea && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Chỗ phơi đồ chung</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{property.commonDryingArea}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quy định */}
          <Card className="border border-indigo-200/80 dark:border-slate-800 rounded-xl bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-indigo-100 dark:border-slate-800 bg-indigo-500/5 dark:bg-indigo-950/20">
              <CardTitle className="text-base font-bold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Quy định thuê phòng
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm p-4 sm:p-5">
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 dark:bg-amber-950/30 rounded-xl border border-amber-300/70 dark:border-amber-800/60">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  <PawPrint className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider">Nuôi thú cưng</div>
                  <div className="font-extrabold text-amber-950 dark:text-amber-100 text-xs sm:text-sm">
                    {property.allowPet ? 'Cho phép nuôi' : 'Không cho nuôi'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-indigo-500/10 dark:bg-indigo-950/30 rounded-xl border border-indigo-300/70 dark:border-indigo-800/60">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-bold tracking-wider">Khách nước ngoài</div>
                  <div className="font-extrabold text-indigo-950 dark:text-indigo-100 text-xs sm:text-sm">
                    {property.allowForeigners ? 'Nhận nước ngoài' : 'Chỉ khách Việt'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-teal-500/10 dark:bg-teal-950/30 rounded-xl border border-teal-300/70 dark:border-teal-800/60">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-300 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] text-teal-700 dark:text-teal-400 uppercase font-bold tracking-wider">Xe điện VinFast</div>
                  <div className="font-extrabold text-teal-950 dark:text-teal-100 text-xs sm:text-sm">
                    {property.allowVinfastElectric !== false ? 'Nhận & sạc điện' : 'Không nhận xe điện'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-rose-500/10 dark:bg-rose-950/30 rounded-xl border border-rose-300/70 dark:border-rose-800/60">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0">
                  <Sun className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold tracking-wider">Ban công riêng</div>
                  <div className="font-extrabold text-rose-950 dark:text-rose-100 text-xs sm:text-sm">
                    {property.hasPrivateBalcony ? 'Có ban công riêng' : 'Không có ban công'}
                  </div>
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

              {/* Monthly Cost Estimator Calculator */}
              <div className="pt-2">
                <MonthlyCostEstimator
                  basePrice={property.price}
                  electricityPrice={property.electricityPrice ?? 4000}
                  waterPrice={property.waterPrice ?? 35000}
                  internetPrice={property.internetPrice ?? 100000}
                  commonServicePrice={property.commonServicePrice ?? 200000}
                  electricVehicleFee={property.electricVehicleFee ?? 100000}
                  title="Tính ước tính chi phí phòng này"
                />
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
                    <span className="truncate">{maskHouseNumberInBuildingName(property.address)}</span>
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
                  {maskHouseNumberInBuildingName(property.address)}
                </DialogTitle>
                <p className="text-sm text-ink-muted mt-0.5">{maskHouseNumberInBuildingName(property.address)}</p>
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
