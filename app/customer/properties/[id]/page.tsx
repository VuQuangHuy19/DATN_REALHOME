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
  ChevronLeft, Check, X, Zap, PawPrint, Globe, Award, Layers, DollarSign, FileText
} from 'lucide-react';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { detectDryerFeature } from '@/lib/utils/dryer-parser';

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

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.id as string;
  const { company } = useCustomerCompany();
  const { role } = useAuth();
  const { rooms: compareRooms, addRoom, removeRoom } = useCompare();
  
  // Logged-in users or sales agents can see all rooms (including rented/maintenance)
  const showAll = !!role;
  const canComposeDeposit = !!role && DEPOSIT_COMPOSER_ROLES.includes(role as any);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const contractsBasePath = role === 'landlord' ? '/landlord' : role === 'sales_agent' || pathname.startsWith('/broker') ? '/broker' : '/admin';

  const { building, loading: buildingLoading, error: buildingError } = usePublicBuilding(buildingId);
  const { listings: rooms, loading: roomsLoading, error: roomsError } = usePublicListingsByBuilding(buildingId, showAll);

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

  // Client-side filtering of rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
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
      {/* Back button */}
      <div className="mb-4">
        <Link href="/customer/properties" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors">
          <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>
      </div>

      {/* Image Gallery */}
      <div className="mb-8">
        <ImageGallery items={imagesList} alt={building.name} aspectRatio="detail" priority />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Header & Title */}
          <div>
            <h1 className="text-3xl font-bold font-heading text-ink">{maskHouseNumberInBuildingName(building.name)}</h1>
            <div className="flex items-center gap-2 mt-2 text-ink-muted">
              <MapPin className="h-5 w-5 text-accent" />
              {maskHouseNumberInBuildingName(building.address)}
            </div>
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
              <Card className="border border-border-subtle rounded-lg bg-card shadow-none">
                <CardHeader className="pb-3 border-b border-border-subtle">
                  <CardTitle className="text-base font-bold font-heading text-ink">Trang bị sẵn có của tòa nhà</CardTitle>
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
              <CardTitle className="text-base font-bold font-heading text-ink">Tiện ích tòa nhà</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 border border-border-subtle rounded-lg bg-bg-base">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent" />
                    <span className="text-ink text-xs font-semibold">Thang máy</span>
                  </div>
                  {building.has_elevator !== false ? (
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
                  {building.pccc_certified !== false ? (
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold shadow-none">
                      <Check className="h-3 w-3" /> Đạt chuẩn PCCC
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-50 text-red-750 hover:bg-red-50 border-red-200 border flex items-center gap-1 text-[10px] py-0.5 font-bold shadow-none">
                      <X className="h-3 w-3" /> Chưa hoàn thiện
                    </Badge>
                  )}
                </div>
              </div>
              
              {building.common_drying_area && (
                <div className="p-3 bg-bg-subtle border border-border-subtle rounded-lg text-ink-muted text-xs">
                  <span className="font-bold text-ink-muted uppercase block mb-1">Chỗ phơi đồ chung</span>
                  <span className="font-medium text-ink">{building.common_drying_area}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quy định */}
          <Card className="border border-border-subtle rounded-lg bg-card shadow-none">
            <CardHeader className="pb-3 border-b border-border-subtle">
              <CardTitle className="text-base font-bold font-heading text-ink">Quy định thuê</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-4">
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <PawPrint className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Nuôi thú cưng</div>
                  <div className="font-semibold text-ink text-xs">
                    {(() => {
                      const petVal = building.allow_pet as any;
                      const isPetAllowed = petVal === true || petVal === 'true' || (typeof petVal === 'string' && petVal !== 'Không' && petVal !== 'false');
                      return (typeof petVal === 'string' && petVal !== 'Có' && petVal !== 'true' && petVal !== 'Không' && petVal !== 'false') ? petVal : (isPetAllowed ? 'Cho phép nuôi' : 'Không cho nuôi');
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Globe className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Người nước ngoài</div>
                  <div className="font-semibold text-ink text-xs">{building.allow_foreigners ? 'Nhận nước ngoài' : 'Chỉ khách Việt'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-bg-subtle rounded-lg border border-border-subtle">
                <Zap className="h-4.5 w-4.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-ink-muted uppercase font-medium">Xe điện VinFast</div>
                  <div className="font-semibold text-ink text-xs">{building.allow_vinfast_electric !== false ? 'Nhận & sạc điện' : 'Không nhận xe điện'}</div>
                </div>
              </div>
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
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Chi phí & dịch vụ</span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-card text-xs">
                  <div className="flex justify-between p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-slate-500 font-medium">Giá điện:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Number(building.electricity_price ?? 4000).toLocaleString('vi-VN')}đ/kWh</span>
                  </div>
                  <div className="flex justify-between p-2.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">Giá nước:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Number(building.water_price ?? 35000).toLocaleString('vi-VN')}đ/m³</span>
                  </div>
                  <div className="flex justify-between p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-slate-500 font-medium">Internet:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Number(building.internet_price ?? 100000).toLocaleString('vi-VN')}đ/phòng</span>
                  </div>
                  <div className="flex justify-between p-2.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">Dịch vụ chung:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Number(building.common_service_price ?? 200000).toLocaleString('vi-VN')}đ/người</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span className="text-slate-500 font-medium">Phí sạc xe điện:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{Number(building.electric_vehicle_fee ?? 0).toLocaleString('vi-VN')}đ/xe</span>
                  </div>
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
                    <span className="truncate">{building.address}</span>
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
                  Vị trí bất động sản
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
