'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';
import { usePublicBuilding, usePublicListingsByBuilding } from '@/lib/hooks/usePublicListings';
import { PLACEHOLDER_LISTING_IMAGE, DEPOSIT_COMPOSER_ROLES } from '@/lib/customer/constants';
import { getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCompare } from '@/src/lib/customer/RoomCompareContext';
import {
  MapPin, Bed, Bath, Square, Calendar, Phone, Map, ExternalLink, Loader2,
  ChevronLeft, Check, X, Zap, PawPrint, Globe, Award, Layers, DollarSign, FileText,
  Link as LinkIcon, CheckCheck, Wind, Flame, Shirt, Utensils, Sparkles, Box, RotateCw,
  ShieldCheck, Droplets, Wifi, Sun, Lock
} from 'lucide-react';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { detectDryerFeature } from '@/lib/utils/dryer-parser';
import { MonthlyCostEstimator } from '@/components/customer/MonthlyCostEstimator';

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  soon_available: 'Sắp trống',
  rented: 'Đã cho thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đặt trước',
};

import ImageGallery from '@/src/features/properties/components/ImageGallery';
import { SameLandlordBuildingsWidget } from '@/src/features/properties/components/SameLandlordBuildingsWidget';
import { SimilarBuildingsWidget } from '@/src/features/properties/components/SimilarBuildingsWidget';

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

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.id as string;
  const { company } = useCustomerCompany();
  const { role, user, profile } = useAuth();
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [copyBuildingDone, setCopyBuildingDone] = useState(false);

  const handleCopyRoomLink = (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const baseUrl = `${window.location.origin}/customer/properties/rooms/${roomId}`;
    const saleId = user?.id || profile?.id;
    const finalUrl = saleId ? `${baseUrl}?ref=${saleId}` : baseUrl;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopiedRoomId(roomId);
      setTimeout(() => setCopiedRoomId(null), 2000);
    });
  };

  const handleCopyBuildingLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const baseUrl = `${window.location.origin}/customer/properties/${buildingId}`;
    const saleId = user?.id || profile?.id;
    const finalUrl = saleId ? `${baseUrl}?ref=${saleId}` : baseUrl;
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopyBuildingDone(true);
      setTimeout(() => setCopyBuildingDone(false), 2000);
    });
  };
  const { rooms: compareRooms, addRoom, removeRoom } = useCompare();
  
  // Logged-in users or sales agents can see all rooms (including rented/maintenance)
  const showAll = !!role;
  const canComposeDeposit = !!role && DEPOSIT_COMPOSER_ROLES.includes(role as any);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isBrokerOrAdminRoute = pathname.startsWith('/broker') || pathname.startsWith('/admin') || pathname.startsWith('/landlord');
  const contractsBasePath = role === 'landlord' ? '/landlord' : role === 'sales_agent' || pathname.startsWith('/broker') ? '/broker' : '/admin';

  const { building, loading: buildingLoading, error: buildingError } = usePublicBuilding(buildingId);
  const { listings: rooms, loading: roomsLoading, error: roomsError } = usePublicListingsByBuilding(buildingId, false);

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Dialog for viewing request targets a specific room
  const [isViewingOpen, setIsViewingOpen] = useState(false);
  const [selectedRoomForViewing, setSelectedRoomForViewing] = useState<any | null>(null);

  // Filters for rooms list
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const hotline = company?.phone || '(028) 1234-5678';
  const hotlineHref = company?.phone ? `tel:${company.phone.replace(/\D/g, '')}` : 'tel:02812345678';

  const loading = buildingLoading || roomsLoading;
  const error = buildingError || roomsError;

  // Unique floors array for dropdown filter
  const floorOptions = useMemo(() => {
    const list = rooms.map((r) => r.floor).filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [rooms]);

  // Client-side filtering of rooms: Only available or soon_available <= 30 days
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (room.status !== 'available' && room.status !== 'soon_available') {
        return false;
      }
      if (room.status === 'soon_available') {
        const targetDateStr = room.expectedAvailableDate || (room as any).availableDate;
        if (targetDateStr) {
          const end = new Date(targetDateStr);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 30) {
            return false;
          }
        }
      }

      const matchFloor = filterFloor === 'all' || String(room.floor) === filterFloor;
      const matchStatus = filterStatus === 'all' || room.status === filterStatus;
      return matchFloor && matchStatus;
    });
  }, [rooms, filterFloor, filterStatus]);

  // Dynanmic price and size range based on loaded rooms
  const priceRangeStr = useMemo(() => {
    if (rooms.length === 0) return 'Liên hệ';
    const prices = rooms.map(r => r.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `${minPrice.toLocaleString('vi-VN')}đ`;
    return `${minPrice.toLocaleString('vi-VN')}đ - ${maxPrice.toLocaleString('vi-VN')}đ`;
  }, [rooms]);

  const sizeRangeStr = useMemo(() => {
    if (rooms.length === 0) return '—';
    const sizes = rooms.map(r => r.size);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    if (minSize === maxSize) return `${minSize}m²`;
    return `${minSize}m² - ${maxSize}m²`;
  }, [rooms]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!building || error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Không tìm thấy tòa nhà hoặc bất động sản</h1>
      </div>
    );
  }

  // Combine building main image and room images
  const roomImages = rooms.flatMap((r) => r.imageUrls || []).filter(Boolean);
  const uniqueRoomImages = Array.from(new Set(roomImages));
  let imagesList = [building.image_url || PLACEHOLDER_LISTING_IMAGE];
  if (building.image_url) {
    imagesList = [building.image_url, ...uniqueRoomImages.filter(img => img !== building.image_url)];
  } else if (uniqueRoomImages.length > 0) {
    imagesList = uniqueRoomImages;
  }



  const handleOpenViewingRequest = (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    setSelectedRoomForViewing(room);
    setIsViewingOpen(true);
  };

  const handleOpenContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsContactOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 bg-bg-base">
      {/* Back button — chỉ hiển thị khi ở trang customer (vì broker/admin/landlord layout đã có sẵn nút Quay lại ở top header) */}
      {!isBrokerOrAdminRoute && (
        <div className="mb-4">
          <Link href="/customer/properties" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
        </div>
      )}

      {/* Image Gallery */}
      <div className="mb-8">
        <ImageGallery items={imagesList} alt={building.name} aspectRatio="detail" priority />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Header & Title */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-heading text-ink">{maskHouseNumberInBuildingName(building.name)}</h1>
              <div className="flex items-center gap-2 mt-2 text-ink-muted">
                <MapPin className="h-5 w-5 text-accent" />
                {maskHouseNumberInBuildingName(building.address)}
              </div>
              
              {/* Hero Key Highlights Banner */}
              <div className="flex flex-wrap items-center gap-2 pt-4">
                <Badge className="bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-emerald-500/25 transition-all">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{building.pccc_certified !== false ? 'Đạt Chuẩn PCCC' : 'Chưa Hoàn Thiện PCCC'}</span>
                </Badge>
                {building.has_elevator !== false && (
                  <Badge className="bg-blue-500/15 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-blue-500/25 transition-all">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Thang Máy Di Chuyển</span>
                  </Badge>
                )}
                {building.allow_pet !== false && building.allow_pet !== 'Không' && building.allow_pet !== 'false' && (
                  <Badge className="bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-amber-500/25 transition-all">
                    <PawPrint className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Cho Nuôi Thú Cưng</span>
                  </Badge>
                )}
                {building.allow_vinfast_electric !== false && (
                  <Badge className="bg-teal-500/15 text-teal-900 dark:text-teal-300 border-teal-300 dark:border-teal-800 font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-teal-500/25 transition-all">
                    <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Sạc Xe Điện</span>
                  </Badge>
                )}
                {building.allow_foreigners && (
                  <Badge className="bg-indigo-500/15 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-indigo-500/25 transition-all">
                    <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Nhận Khách Nước Ngoài</span>
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 font-bold transition-all shrink-0 self-start ${
                copyBuildingDone
                  ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                  : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
              onClick={handleCopyBuildingLink}
              title="Copy link xem tòa nhà gửi cho khách"
            >
              {copyBuildingDone ? <CheckCheck className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              <span>{copyBuildingDone ? 'Đã copy Link Tòa nhà!' : 'Copy Link Tòa nhà'}</span>
            </Button>
          </div>

          {/* Quick specs */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted py-3 border-y border-border-subtle font-medium">
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent" />
              <span>{building.total_floors || '—'} Tầng</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent" />
              <span>{building.total_rooms || '—'} Phòng</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <Square className="h-4 w-4 text-accent" />
              <span>Diện tích phòng: {sizeRangeStr}</span>
            </span>
            {building.year_built && (
              <>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-accent" />
                  <span>Xây dựng: {building.year_built}</span>
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold font-heading text-ink mb-3">Mô tả tòa nhà</h2>
            <p className="text-ink-muted leading-relaxed whitespace-pre-line">{building.description || 'Chưa có mô tả chi tiết cho tòa nhà này.'}</p>
          </div>

          {/* Nội thất */}
          {(() => {
            const furnitureIconMap: Record<string, any> = {
              has_air_conditioner: Wind,
              has_water_heater: Flame,
              has_bed: Bed,
              has_wardrobe: Shirt,
              has_kitchen_cabinet: Utensils,
              has_refrigerator: Box,
              has_hood: RangeHoodIcon,
              has_dressing_table: DressingTableIcon,
              has_dryer_dynamic: RotateCw,
            };

            const baseFurniture = [
              { key: 'has_air_conditioner', label: 'Điều hòa' },
              { key: 'has_water_heater', label: 'Nóng lạnh' },
              { key: 'has_bed', label: 'Giường ngủ' },
              { key: 'has_wardrobe', label: 'Tủ quần áo' },
              { key: 'has_kitchen_cabinet', label: 'Tủ bếp' },
              { key: 'has_refrigerator', label: 'Tủ lạnh' },
              { key: 'has_hood', label: 'Máy hút mùi' },
              { key: 'has_dressing_table', label: 'Bàn trang điểm' }
            ].filter((item) => building[item.key] === true);

            // Dynamic scan for dryer / washing dryer from description & dryer_type
            const dryerScan = detectDryerFeature(
              [building.dryer_type, building.description, ...rooms.map(r => r.description)].filter(Boolean).join(' | ')
            );

            if (dryerScan.hasDryer) {
              baseFurniture.push({
                key: 'has_dryer_dynamic',
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
                  {building.has_elevator !== false ? (
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
                  {building.pccc_certified !== false ? (
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
            </CardContent>
          </Card>

          {/* Quy định */}
          <Card className="border border-indigo-200/80 dark:border-slate-800 rounded-xl bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-indigo-100 dark:border-slate-800 bg-indigo-500/5 dark:bg-indigo-950/20">
              <CardTitle className="text-base font-bold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Quy định thuê
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
                    {(() => {
                      const petVal = building.allow_pet as any;
                      const isPetAllowed = petVal === true || petVal === 'true' || (typeof petVal === 'string' && petVal !== 'Không' && petVal !== 'false');
                      return (typeof petVal === 'string' && petVal !== 'Có' && petVal !== 'true' && petVal !== 'Không' && petVal !== 'false') ? petVal : (isPetAllowed ? 'Cho phép nuôi' : 'Không cho nuôi');
                    })()}
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
                    {building.allow_foreigners ? 'Nhận khách nước ngoài' : 'Chỉ khách Việt Nam'}
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
                    {building.allow_vinfast_electric !== false ? 'Nhận & sạc điện' : 'Không nhận xe điện'}
                  </div>
                </div>
              </div>

              {building.common_drying_area && (
                <div className="flex items-center gap-3 p-3 bg-rose-500/10 dark:bg-rose-950/30 rounded-xl border border-rose-300/70 dark:border-rose-800/60">
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold tracking-wider">Chỗ phơi đồ chung</div>
                    <div className="font-extrabold text-rose-950 dark:text-rose-100 text-xs sm:text-sm">{building.common_drying_area}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rooms List Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold font-heading text-ink">Danh sách phòng trong tòa</h2>
              
              {/* Filter controls */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs bg-card text-ink font-semibold"
                >
                  <option value="all">Tất cả các tầng</option>
                  {floorOptions.map((f) => (
                    <option key={f} value={String(f)}>Tầng {f}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs bg-card text-ink font-semibold"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="available">Còn trống</option>
                  <option value="soon_available">Sắp trống</option>
                  {showAll && (
                    <>
                      <option value="rented">Đã cho thuê</option>
                      <option value="maintenance">Bảo trì</option>
                      <option value="reserved">Đặt trước</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {filteredRooms.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border-subtle rounded-lg bg-card text-ink-muted text-sm">
                Không tìm thấy phòng nào phù hợp bộ lọc
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRooms.map((room) => {
                  const ds = getRoomDisplayStatus({
                    id: room.id,
                    status: room.status === 'soon_available' ? 'rented' : room.status,
                    description: room.description,
                  } as any);
                  const isComparing = compareRooms.some(r => r.id === room.id);

                  return (
                    <Link
                      href={`/customer/properties/rooms/${room.id}`}
                      key={room.id}
                      className="group border border-border-subtle rounded-lg overflow-hidden bg-card hover:border-accent transition-all flex flex-col"
                    >
                      {/* Room Card Thumbnail */}
                      <div className="relative w-full border-b border-border-subtle group-hover:opacity-95" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <ImageGallery
                          items={Array.from(
                            new Set(
                              (room.imageUrls ?? [])
                                .concat(room.thumbnailUrls ?? [])
                                .concat([room.imageUrl, room.thumbnailUrl])
                                .filter(Boolean)
                            )
                          )}
                          alt={room.title}
                          aspectRatio="card"
                        />
                        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1 pointer-events-none">
                          <Badge className={`${ds.colorClass} text-[10px] font-bold px-2 py-0.5 border rounded-full pointer-events-auto`}>
                            {statusLabels[room.status] || ds.label}
                          </Badge>
                          {room.status === 'soon_available' && room.expectedAvailableDate && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-accent text-white select-none pointer-events-auto">
                              Trống từ: {formatDateDisplay(room.expectedAvailableDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Room Card Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold font-mono text-ink line-clamp-1">Phòng {room.title.split('—')[1]?.trim() || room.id}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-ink-muted font-medium">Tầng {room.floor}</span>
                              <FavoriteButton roomId={room.id} className="h-6 w-6 [&>svg]:w-3.5 [&>svg]:h-3.5" />
                            </div>
                          </div>
                          <div className="text-xs text-ink-muted flex gap-2">
                            <span>{room.roomType}</span>
                            <span>•</span>
                            <span>{room.size}m²</span>
                          </div>
                          {room.description && (
                            <p className="text-xs text-ink-muted line-clamp-2 mt-1">{room.description}</p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                          <div className="font-mono font-bold text-accent text-base">
                            {room.price.toLocaleString('vi-VN')}đ<span className="text-[10px] font-normal text-ink-muted">/tháng</span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-[10px] font-bold rounded gap-1 transition-all ${
                                copiedRoomId === room.id
                                  ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                                  : 'text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100'
                              }`}
                              onClick={(e) => handleCopyRoomLink(e, room.id)}
                              title="Copy link phòng này gửi cho khách"
                            >
                              {copiedRoomId === room.id ? (
                                <><CheckCheck className="h-3 w-3" /> Đã copy</>
                              ) : (
                                <><LinkIcon className="h-3 w-3" /> Link phòng</>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-[10px] font-bold rounded ${isComparing ? 'border-accent text-accent bg-accent/10' : 'text-ink border-border-subtle hover:bg-bg-subtle'}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isComparing) {
                                  removeRoom(room.id);
                                } else {
                                  addRoom(room);
                                }
                              }}
                            >
                              {isComparing ? 'Đã so sánh' : '+ So sánh'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[10px] font-bold bg-accent hover:bg-accent-500 text-white rounded"
                              onClick={(e) => handleOpenViewingRequest(e, room)}
                            >
                              Hẹn xem
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info & Map */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="border border-border-subtle bg-card shadow-none rounded-lg">
            <CardContent className="p-6 space-y-5">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Khoảng giá tòa nhà</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 dark:text-amber-400 font-mono tracking-tight">
                  {priceRangeStr}
                </div>
              </div>

              {/* Cost specifications */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Chi phí & dịch vụ</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-300/70 text-amber-950 dark:text-amber-200">
                    <span className="font-bold flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Giá điện:</span>
                    <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400">{Number(building.electricity_price ?? 4000).toLocaleString('vi-VN')}đ/kWh</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-sky-500/10 border border-sky-300/70 text-sky-950 dark:text-sky-200">
                    <span className="font-bold flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-sky-500" /> Giá nước:</span>
                    <span className="font-extrabold font-mono text-sky-600 dark:text-sky-400">{Number(building.water_price ?? 35000).toLocaleString('vi-VN')}đ/m³</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-300/70 text-indigo-950 dark:text-indigo-200">
                    <span className="font-bold flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-indigo-500" /> Internet:</span>
                    <span className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{Number(building.internet_price ?? 100000).toLocaleString('vi-VN')}đ/phòng</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-300/70 text-emerald-950 dark:text-emerald-200">
                    <span className="font-bold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Dịch vụ chung:</span>
                    <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{Number(building.common_service_price ?? 200000).toLocaleString('vi-VN')}đ/người</span>
                  </div>
                  {Number(building.electric_vehicle_fee ?? 0) > 0 && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-teal-500/10 border border-teal-300/70 text-teal-950 dark:text-teal-200">
                      <span className="font-bold flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-teal-500" /> Phí sạc xe điện:</span>
                      <span className="font-extrabold font-mono text-teal-600 dark:text-teal-400">{Number(building.electric_vehicle_fee).toLocaleString('vi-VN')}đ/xe</span>
                    </div>
                  )}
                </div>
                {building.common_service_description && (
                  <p className="text-[10px] text-slate-400 leading-tight font-medium">
                    * Dịch vụ chung: {building.common_service_description}
                  </p>
                )}
                {building.fingerprint_lock_desc && (
                  <p className="text-[10px] text-slate-400 leading-tight font-medium">
                    * Khóa vân tay: {building.fingerprint_lock_desc}
                  </p>
                )}
                {building.deposit_terms && (
                  <p className="text-[10px] text-slate-400 leading-tight font-medium">
                    * Quy định cọc: {building.deposit_terms}
                  </p>
                )}
              </div>

              {/* Monthly Cost Estimator Calculator */}
              <div className="pt-2">
                <MonthlyCostEstimator
                  basePrice={rooms && rooms.length > 0 ? Math.min(...rooms.map(r => r.price)) : 5000000}
                  electricityPrice={Number(building.electricity_price ?? 4000)}
                  waterPrice={Number(building.water_price ?? 35000)}
                  internetPrice={Number(building.internet_price ?? 100000)}
                  commonServicePrice={Number(building.common_service_price ?? 200000)}
                  electricVehicleFee={Number(building.electric_vehicle_fee ?? 100000)}
                  title="Ước tính chi phí"
                  roomOptions={rooms ? rooms.map(r => ({
                    id: r.id,
                    code: r.title.includes('—') ? r.title.split('—')[1]?.trim() : r.title,
                    price: r.price,
                    floor: r.floor,
                    roomType: r.roomType,
                  })) : []}
                />
              </div>

              {/* Contact Button */}
              <div className="space-y-3 pt-2">
                {canComposeDeposit && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm"
                    size="lg"
                    onClick={() => router.push(`${contractsBasePath}/contracts/create?building_id=${buildingId}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Soạn cọc
                  </Button>
                )}
                <Button variant="outline" className="w-full text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 rounded-xl" size="lg" onClick={handleOpenContact}>
                  <Phone className="h-4 w-4 mr-2" />
                  Liên Hệ Môi Giới
                </Button>

                {/* Minimap preview card */}
                <div
                  className="mt-1 rounded-lg overflow-hidden border border-border-subtle cursor-pointer group relative"
                  onClick={() => setIsMapOpen(true)}
                >
                  <div className="relative h-40">
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(building.address)}&output=embed&z=16`}
                      className="w-full h-full pointer-events-none animate-fade-in"
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
                    <span className="truncate">{maskHouseNumberInBuildingName(building.address)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expanded Map Dialog */}
          <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-5 pb-3">
                <DialogTitle className="flex items-center gap-2 font-heading">
                  <MapPin className="h-5 w-5 text-accent" />
                  {maskHouseNumberInBuildingName(building.address)}
                </DialogTitle>
                <p className="text-sm text-ink-muted mt-0.5">{building.address}</p>
              </DialogHeader>
              <div className="h-[420px] relative">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(building.address)}&output=embed&z=16`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Bản đồ vị trí"
                />
              </div>
              <div className="px-6 py-4 flex justify-between items-center border-t border-border-subtle bg-bg-subtle">
                <span className="text-sm text-ink-muted">{building.address}</span>
                <Button size="sm" className="bg-accent hover:bg-accent-500 text-white font-semibold shadow-none" asChild>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.address)}`}
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

      {/* Gợi ý Tòa cùng nguồn chủ & Tòa nhà tương tự */}
      <SameLandlordBuildingsWidget
        currentBuilding={{
          id: building.id,
          landlord_id: building.landlord_id,
          company_id: building.company_id,
          area: building.area,
        }}
      />
      <SimilarBuildingsWidget
        currentBuilding={{
          id: building.id,
          landlord_id: building.landlord_id,
          company_id: building.company_id,
          area: building.area,
        }}
      />

      {/* Hotline contact dialog */}
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

      {/* Viewing request dialog */}
      {selectedRoomForViewing && (
        <ViewingRequestDialog
          open={isViewingOpen}
          onOpenChange={setIsViewingOpen}
          companyId={selectedRoomForViewing.companyId}
          property={{
            id: selectedRoomForViewing.id,
            title: selectedRoomForViewing.title,
            address: selectedRoomForViewing.address,
            area: selectedRoomForViewing.area,
          }}
        />
      )}
    </div>
  );
}
