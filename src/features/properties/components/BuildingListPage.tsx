'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const LocationPickerDynamic = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full rounded-2xl border border-slate-200 bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-500 font-semibold">
      Đang tải bản đồ định vị...
    </div>
  ),
});

const BuildingsMultiMapDynamic = dynamic(() => import('./BuildingsMultiMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-500 font-semibold">
      Đang tải bản đồ phân bố tòa nhà...
    </div>
  ),
});

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Pencil, Trash2, Plus, Search, Building2, Loader2, AlertCircle, RefreshCw,
  FileSpreadsheet, Link as LinkIcon, MapPin, Eye, Zap, Layers, Map as LucideMap,
  CheckCircle2, ShieldCheck, Flame, Cat, Car, Zap as ElectricIcon, ArrowUpRight
} from 'lucide-react';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePropertiesFeature } from '../hooks/usePropertiesFeature';
import { useRooms } from '@/features/rooms/hooks/useRooms';
import { useRentalContracts } from '@/features/finance/hooks/useContracts';
import { getRoomDisplayStatus } from '@/lib/room-status';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { DBBuilding } from '@/lib/supabase/types';
import { useLandlords } from '@/features/properties/hooks/useLandlords';
import { useManagers } from '@/features/managers/hooks/useManagers';
import { supabase } from '@/lib/supabase/client';
import { getAreaColorClass } from '@/lib/utils/colors';
import { ExcelImportModal } from './ExcelImportModal';
import { GoogleSheetImportModal } from '@/features/import/components/GoogleSheetImportModal';
import { QuickCreateManagerModal } from './QuickCreateManagerModal';
import { toast } from 'sonner';
import { getProvinces, getDistricts, getWards, type VnProvince, type VnDistrict, type VnWard } from '@/src/lib/supabase/repositories/vn_locations';

function BuildingThumbnail({ src, alt, size = 48 }: { src?: string | null; alt: string; size?: number }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const dimensionClass = size === 64 ? 'w-16 h-16' : 'w-12 h-12';

  if (!src || hasError) {
    return (
      <div className={`${dimensionClass} bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs`}>
        <Building2 className="h-6 w-6" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setHasError(true)}
      className={`${dimensionClass} object-cover rounded-2xl border border-slate-200 shrink-0 shadow-2xs`}
    />
  );
}

export function BuildingListPage() {
  const { company, role, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const { items: buildingList, loading, error, add, update, remove, refetch } = usePropertiesFeature(company?.id);
  const { items: roomList } = useRooms(company?.id);
  const { items: contracts } = useRentalContracts(company?.id);
  const { items: landlordList } = useLandlords(company?.id);
  const { items: managerList } = useManagers(company?.id);

  const currentLandlord = landlordList.find((l) => l.id === profile?.landlord_id);
  const currentLandlordCode = currentLandlord?.code || null;

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterLandlord, setFilterLandlord] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'map' | 'action_needed'>('matrix');

  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [deletingBatch, setDeletingBatch] = useState(false);

  const [editItem, setEditItem] = useState<DBBuilding | null>(null);
  const [formLandlordCode, setFormLandlordCode] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [electricityPrice, setElectricityPrice] = useState('');
  const [waterPrice, setWaterPrice] = useState('');
  const [internetPrice, setInternetPrice] = useState('100.000');
  const [commonServicePrice, setCommonServicePrice] = useState('200.000');
  const [commonServiceUnit, setCommonServiceUnit] = useState('người');
  const [extraOccupantFee, setExtraOccupantFee] = useState('0');
  const [electricVehicleFee, setElectricVehicleFee] = useState('');
  const [isPetAllowed, setIsPetAllowed] = useState(false);
  const [allowPetText, setAllowPetText] = useState('');

  // Location cascade state
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [districts, setDistricts] = useState<VnDistrict[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedWardId, setSelectedWardId] = useState<string>('');

  // Load provinces (static data — không query DB)
  useEffect(() => {
    getProvinces().then(setProvinces);
  }, []);

  // Load districts
  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      setSelectedDistrictId('');
      setWards([]);
      setSelectedWardId('');
      return;
    }
    getDistricts(selectedProvinceId).then(setDistricts);
  }, [selectedProvinceId]);

  // Load wards
  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([]);
      setSelectedWardId('');
      return;
    }
    getWards(selectedDistrictId).then(setWards);
  }, [selectedDistrictId]);

  const composedArea = useMemo(() => {
    const province = provinces.find((p) => p.id === selectedProvinceId);
    const district = districts.find((d) => d.id === selectedDistrictId);
    const ward = wards.find((w) => w.id === selectedWardId);
    return [ward?.name, district?.name, province?.name].filter(Boolean).join(', ');
  }, [selectedProvinceId, selectedDistrictId, selectedWardId, provinces, districts, wards]);

  const formatNumber = (val: number | string) => {
    if (!val && val !== 0) return '';
    const num = String(val).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseNumber = (val: string) => {
    return Number(val.replace(/\./g, '')) || 0;
  };

  const handlePriceChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatNumber(e.target.value));
  };

  // Distinct areas for filter dropdown
  const areas = useMemo(() => Array.from(new Set(buildingList.map((b) => b.area).filter(Boolean))), [buildingList]);

  // Calculate building stats (total rooms, vacant, soon available, occupancy)
  const buildingStatsMap = useMemo(() => {
    const map = new Map<string, { totalRooms: number; rentedRooms: number; vacantRooms: number; soonAvailableRooms: number; occupancyRate: number }>();

    buildingList.forEach((b) => {
      const bRooms = roomList.filter((r) => {
        if (!r.building_id) return false;
        const rB = String(r.building_id).trim().toLowerCase();
        const bCode = (b.code || '').trim().toLowerCase();
        const bId = (b.id || '').trim().toLowerCase();
        const rBldCode = ((r as any).buildings?.code || '').trim().toLowerCase();
        const rBldId = ((r as any).buildings?.id || '').trim().toLowerCase();
        return (
          (bCode && (rB === bCode || rBldCode === bCode)) ||
          (bId && (rB === bId || rBldId === bId))
        );
      });

      const totalRooms = Math.max(b.total_rooms || 0, bRooms.length);

      let vacantCount = 0;
      let soonCount = 0;
      let rentedCount = 0;

      bRooms.forEach((r) => {
        const ds = getRoomDisplayStatus(r, contracts);
        if (ds.isSoonAvailable) {
          soonCount++;
        } else if (r.status === 'rented' || ds.status === 'rented') {
          rentedCount++;
        } else {
          vacantCount++;
        }
      });

      // Break down unlisted rooms as vacant if total_rooms > bRooms.length
      if (bRooms.length < (b.total_rooms || 0)) {
        const missingRooms = (b.total_rooms || 0) - bRooms.length;
        vacantCount += missingRooms;
      }

      const effectiveRented = rentedCount + soonCount;
      const pct = totalRooms > 0 ? Math.min(100, Math.round((effectiveRented / totalRooms) * 100)) : 0;

      map.set(b.id, {
        totalRooms,
        rentedRooms: rentedCount,
        vacantRooms: vacantCount,
        soonAvailableRooms: soonCount,
        occupancyRate: pct,
      });
    });

    return map;
  }, [buildingList, roomList, contracts]);

  // Filtered Building List
  const filteredBuildings = useMemo(() => {
    return buildingList.filter((b) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q) ||
        (b.area || '').toLowerCase().includes(q);

      const matchesArea = !filterArea || b.area === filterArea;
      const matchesLandlord = !filterLandlord || b.landlord_id === filterLandlord;

      return matchesSearch && matchesArea && matchesLandlord;
    });
  }, [buildingList, searchQuery, filterArea, filterLandlord]);

  const toggleSelectBuilding = (id: string) => {
    setSelectedBuildingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllBuildingsSelected =
    filteredBuildings.length > 0 &&
    filteredBuildings.every((b) => selectedBuildingIds.includes(b.id));

  const handleSelectAllBuildings = () => {
    if (isAllBuildingsSelected) {
      const filteredSet = new Set(filteredBuildings.map((b) => b.id));
      setSelectedBuildingIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const allFilteredIds = filteredBuildings.map((b) => b.id);
      setSelectedBuildingIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleBatchDeleteBuildings = async () => {
    if (selectedBuildingIds.length === 0) return;
    const count = selectedBuildingIds.length;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${count} tòa nhà đã chọn? Tất cả các phòng và hợp đồng liên quan đến tòa nhà này cũng sẽ bị xóa vĩnh viễn!`
      )
    ) {
      return;
    }

    setDeletingBatch(true);
    toast.loading(`Đang xóa ${count} tòa nhà...`, { id: 'batch-delete-bld' });
    try {
      const res = await fetch('/api/buildings/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBuildingIds }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Lỗi khi xóa các tòa nhà');
      }

      setSelectedBuildingIds([]);
      toast.success(`Đã xóa thành công ${resData.count || count} tòa nhà!`, { id: 'batch-delete-bld' });
      await refetch();
    } catch (err: any) {
      toast.error('Lỗi khi xóa các tòa nhà: ' + (err.message || 'Không xác định'), {
        id: 'batch-delete-bld',
      });
    } finally {
      setDeletingBatch(false);
    }
  };

  // Filter buildings belonging to current logged in landlord
  const landlordBuildings = useMemo(() => {
    if (role === 'landlord' && currentLandlordCode) {
      return buildingList.filter((b) => b.landlord_id === currentLandlordCode);
    }
    if (filterLandlord) {
      return buildingList.filter((b) => b.landlord_id === filterLandlord);
    }
    return filteredBuildings;
  }, [buildingList, role, currentLandlordCode, filterLandlord, filteredBuildings]);

  // Action needed buildings (occupancy < 100% or vacant/soon_available rooms)
  const actionNeededBuildings = useMemo(() => {
    return filteredBuildings.filter((b) => {
      const st = buildingStatsMap.get(b.id);
      return st ? st.vacantRooms > 0 || st.soonAvailableRooms > 0 || st.occupancyRate < 100 : true;
    });
  }, [filteredBuildings, buildingStatsMap]);

  // Group Buildings by Area for Matrix View
  const groupedBuildingsByArea = useMemo<[string, DBBuilding[]][]>(() => {
    const map = new Map<string, DBBuilding[]>();

    filteredBuildings.forEach((b) => {
      const area = b.area || 'Khác';
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(b);
    });

    return Array.from(map.entries());
  }, [filteredBuildings]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    const payload = {
      company_id: company?.id ?? '',
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      area: composedArea || (formData.get('area') as string) || '',
      address: formData.get('address') as string,
      year_built: Number(formData.get('year_built')) || null,
      total_floors: Number(formData.get('total_floors')) || 0,
      total_rooms: Number(formData.get('total_rooms')) || 0,
      description: (formData.get('description') as string) || null,
      image_url: imageUrl || '',
      thumbnail_url: thumbnailUrl || '',
      landlord_id: role === 'landlord' ? currentLandlordCode : ((formData.get('landlord_id') as string) || null),
      manager_ids: selectedManagers,
      has_elevator: formData.get('has_elevator') === 'true',
      pccc_certified: formData.get('pccc_certified') === 'true',
      common_drying_area: (formData.get('common_drying_area') as string) || null,
      allow_pet: isPetAllowed ? (allowPetText || 'Có') : 'Không',
      allow_foreigners: formData.get('allow_foreigners') === 'true',
      allow_vinfast_electric: formData.get('allow_vinfast_electric') === 'true',
      has_air_conditioner: formData.get('has_air_conditioner') === 'true',
      has_water_heater: formData.get('has_water_heater') === 'true',
      has_bed: formData.get('has_bed') === 'true',
      has_wardrobe: formData.get('has_wardrobe') === 'true',
      has_kitchen_cabinet: formData.get('has_kitchen_cabinet') === 'true',
      has_refrigerator: formData.get('has_refrigerator') === 'true',
      has_hood: formData.get('has_hood') === 'true',
      has_dressing_table: formData.get('has_dressing_table') === 'true',
      electricity_price: parseNumber(electricityPrice),
      water_price: parseNumber(waterPrice),
      internet_price: parseNumber(internetPrice),
      common_service_price: parseNumber(commonServicePrice),
      common_service_unit: commonServiceUnit,
      common_service_description: (formData.get('common_service_description') as string) || null,
      fingerprint_lock_desc: (formData.get('fingerprint_lock_desc') as string) || null,
      extra_occupant_fee: parseNumber(extraOccupantFee),
      has_car_parking: formData.get('has_car_parking') === 'true',
      washing_machine_type: (formData.get('washing_machine_type') as string) || 'chung',
      dryer_type: (formData.get('dryer_type') as string) || 'chung',
      electric_vehicle_fee: parseNumber(electricVehicleFee),
      latitude,
      longitude,
    };

    if (editItem) {
      await update(editItem.id, payload);
    } else {
      await add(payload);
    }
    setSaving(false);
    setIsDialogOpen(false);
    setEditItem(null);
    setImageUrl(null);
    setThumbnailUrl(null);
  };

  const openAdd = () => {
    setEditItem(null);
    setFormLandlordCode('');
    setSelectedManagers([]);
    setImageUrl(null);
    setThumbnailUrl(null);
    setElectricityPrice('4.000');
    setWaterPrice('35.000');
    setInternetPrice('100.000');
    setCommonServicePrice('200.000');
    setCommonServiceUnit('người');
    setExtraOccupantFee('0');
    setElectricVehicleFee('0');
    setIsPetAllowed(false);
    setAllowPetText('');
    setLatitude(null);
    setLongitude(null);
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardId('');
    setDistricts([]);
    setWards([]);
    setIsDialogOpen(true);
  };

  const openEdit = (item: DBBuilding) => {
    setEditItem(item);
    setFormLandlordCode(item.landlord_id || '');
    setSelectedManagers(item.manager_ids || []);
    setImageUrl(item.image_url || null);
    setThumbnailUrl(item.thumbnail_url || null);
    setElectricityPrice(formatNumber(item.electricity_price ?? 4000));
    setWaterPrice(formatNumber(item.water_price ?? 35000));
    setInternetPrice(formatNumber(item.internet_price ?? 100000));
    setCommonServicePrice(formatNumber(item.common_service_price ?? 200000));
    setCommonServiceUnit((item as any).common_service_unit || 'người');
    setExtraOccupantFee(formatNumber(item.extra_occupant_fee ?? 0));
    setElectricVehicleFee(formatNumber(item.electric_vehicle_fee ?? 0));
    const petVal = item.allow_pet as any;
    const isPet = petVal === true || petVal === 'true' || (typeof petVal === 'string' && petVal !== 'Không' && petVal !== 'false');
    setIsPetAllowed(isPet);
    setAllowPetText(typeof petVal === 'string' && petVal !== 'Có' && petVal !== 'true' && petVal !== 'Không' && petVal !== 'false' ? petVal : '');
    setLatitude(item.latitude ?? null);
    setLongitude(item.longitude ?? null);
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardId('');
    setDistricts([]);
    setWards([]);
    setIsDialogOpen(true);
  };

  // Render individual building matrix card
  const renderBuildingCard = (b: DBBuilding) => {
    const st = buildingStatsMap.get(b.id) || {
      totalRooms: b.total_rooms || 0,
      rentedRooms: 0,
      vacantRooms: 0,
      soonAvailableRooms: 0,
      occupancyRate: 0,
    };

    const bRooms = roomList.filter((r) => {
      if (!r.building_id) return false;
      const rB = String(r.building_id).trim().toLowerCase();
      const bCode = (b.code || '').trim().toLowerCase();
      const bId = (b.id || '').trim().toLowerCase();
      return (bCode && rB === bCode) || (bId && rB === bId);
    });
    const maxFloorInRooms = bRooms.length > 0 ? Math.max(...bRooms.map((r) => r.floor || 1)) : 1;
    const displayFloors = Math.max(b.total_floors || 0, maxFloorInRooms);

    const firstRoomImg = bRooms.find((r: any) => r.thumbnail_url || r.image_url) as any;
    const buildingImg = b.thumbnail_url || b.image_url || firstRoomImg?.thumbnail_url || firstRoomImg?.image_url;

    const targetPrefix = pathname.startsWith('/landlord') ? '/landlord/buildings' : '/admin/realhome/buildings';
    const barColor = st.occupancyRate >= 80 ? 'bg-emerald-500' : st.occupancyRate >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    const isSelected = selectedBuildingIds.includes(b.id);

    return (
      <div
        key={b.id}
        onClick={() => router.push(`${targetPrefix}/${b.id}`)}
        className={`group relative border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
          isSelected
            ? 'bg-rose-50/30 border-rose-400 ring-2 ring-rose-400/40'
            : 'bg-white border-slate-200 hover:border-emerald-400'
        }`}
      >
        {/* Card Header: Checkbox + Thumbnail + Name + Code */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <PermissionGate roles={['company_admin']}>
              <div
                className="shrink-0 cursor-pointer p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectBuilding(b.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
              </div>
            </PermissionGate>
            <BuildingThumbnail src={buildingImg} alt={b.name} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                  {b.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{b.address || b.area || 'Chưa cập nhật địa chỉ'}</span>
              </p>
            </div>
          </div>

          <Badge variant="outline" className="font-mono text-xs font-bold text-slate-600 bg-slate-50 border-slate-200 shrink-0">
            {b.code}
          </Badge>
        </div>

        {/* Occupancy Progress Bar */}
        <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Tỷ lệ lấp đầy:</span>
            <span className="text-emerald-700 font-mono">{st.occupancyRate}% ({st.rentedRooms + st.soonAvailableRooms}/{st.totalRooms} phòng)</span>
          </div>

          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${st.occupancyRate}%` }} />
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px] font-semibold pt-1">
            {st.vacantRooms > 0 ? (
              <span className="text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                Trống {st.vacantRooms} phòng
              </span>
            ) : (
              <span className="text-slate-500">Full 100%</span>
            )}

            {st.soonAvailableRooms > 0 && (
              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 font-bold">
                Sắp trống {st.soonAvailableRooms} phòng
              </span>
            )}
          </div>
        </div>

        {/* Facilities & Specs Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
            {displayFloors} tầng • {st.totalRooms} phòng
          </span>

          {b.has_elevator && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              Thang máy
            </span>
          )}

          {b.pccc_certified && (
            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
              PCCC chuẩn
            </span>
          )}

          {b.allow_pet && b.allow_pet !== 'Không' && b.allow_pet !== 'false' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
              Cho nuôi pet
            </span>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 h-8 rounded-lg"
            onClick={() => router.push(`${targetPrefix}/${b.id}`)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Xem các phòng ({st.totalRooms})
          </Button>

          <div className="flex items-center gap-1">
            <PermissionGate roles={['company_admin', 'manager']}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                onClick={() => openEdit(b)}
                title="Chỉnh sửa tòa nhà"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </PermissionGate>

            <PermissionGate roles={['company_admin']}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa tòa nhà này? Thao tác này không thể hoàn tác.')) {
                    remove(b.id);
                  }
                }}
                title="Xóa tòa nhà"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            Quản Lý Bất Động Sản RealHome
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Quản Lý Danh Sách Tòa Nhà
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Sơ đồ ma trận tòa nhà trực quan &amp; bản đồ phân bố vị trí BĐS
          </p>
        </div>

        <PermissionGate roles={['company_admin']}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={async () => {
                setSyncing(true);
                toast.loading('Đang đồng bộ số phòng...', { id: 'sync-rooms' });
                try {
                  const [countRes, sheetRes] = await Promise.all([
                    fetch('/api/buildings/sync-counts', { method: 'POST' }),
                    fetch('/api/sync/sheet-rooms', { method: 'POST' }),
                  ]);
                  const countData = await countRes.json();
                  const sheetData = await sheetRes.json();

                  if (sheetData.syncedSheets > 0) {
                    toast.success(`Đồng bộ xong ${sheetData.syncedSheets} sheet`, { id: 'sync-rooms' });
                  } else {
                    toast.success('Đã đồng bộ lại số phòng thực tế', { id: 'sync-rooms' });
                  }
                  setTimeout(() => window.location.reload(), 1200);
                } catch {
                  toast.error('Lỗi kết nối đồng bộ', { id: 'sync-rooms' });
                }
              }}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-slate-50 text-slate-800 border-slate-200 rounded-xl h-9 px-3 text-xs font-bold shadow-xs"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Đồng bộ số phòng
            </Button>

            <Button
              onClick={() => setIsExcelModalOpen(true)}
              variant="outline"
              size="sm"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 rounded-xl h-9 px-3 text-xs font-bold shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
              Nhập Excel
            </Button>

            <Button
              onClick={() => setIsSheetModalOpen(true)}
              variant="outline"
              size="sm"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 rounded-xl h-9 px-3 text-xs font-bold shadow-xs"
            >
              <LinkIcon className="h-4 w-4 mr-1.5 text-emerald-700" />
              Nhập Link Sheet (AI)
            </Button>

            <Button
              onClick={openAdd}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-9 px-4 text-xs font-bold shadow-md shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm tòa nhà mới
            </Button>
          </div>
        </PermissionGate>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Interactive Building Container */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        {/* Header Toolbar */}
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'matrix' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Matrix Tòa Nhà ({filteredBuildings.length})
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'map' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LucideMap className="w-3.5 h-3.5 text-emerald-600" />
                Bản Đồ BĐS
              </button>

              <button
                onClick={() => setActiveTab('action_needed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'action_needed' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Tòa Cần Đẩy Lấp Đầy ({actionNeededBuildings.length})
              </button>
            </div>

            {/* Filter Controls (Search + Area + Landlord) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Tìm theo tên tòa, địa chỉ, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 rounded-xl border-slate-200 focus:border-emerald-400"
                />
              </div>

              {areas.length > 0 && (
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 shadow-xs cursor-pointer max-w-[150px] truncate"
                >
                  <option value="">Tất cả khu vực ({areas.length})</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}

              {role !== 'landlord' && landlordList.length > 0 && (
                <select
                  value={filterLandlord}
                  onChange={(e) => setFilterLandlord(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 shadow-xs cursor-pointer max-w-[170px] truncate"
                >
                  <option value="">Tất cả chủ nhà ({landlordList.length})</option>
                  {landlordList.map((l) => (
                    <option key={l.id} value={l.code || ''}>{l.code ? `${l.code} - ` : ''}{l.name}</option>
                  ))}
                </select>
              )}

              {(searchQuery || filterArea || filterLandlord) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterArea('');
                    setFilterLandlord('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer shrink-0"
                >
                  🔄 Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Batch Actions & Select All Toolbar */}
          <PermissionGate roles={['company_admin']}>
            {activeTab !== 'map' && filteredBuildings.length > 0 && (
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-all select-none shadow-2xs">
                    <input
                      type="checkbox"
                      checked={isAllBuildingsSelected}
                      onChange={handleSelectAllBuildings}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                    />
                    <span>Chọn tất cả ({filteredBuildings.length})</span>
                  </label>

                  {selectedBuildingIds.length > 0 && (
                    <span className="text-xs font-semibold text-slate-600 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">
                      Đã chọn <strong className="font-bold font-mono text-rose-800">{selectedBuildingIds.length}</strong> / {filteredBuildings.length} tòa nhà
                    </span>
                  )}
                </div>

                {selectedBuildingIds.length > 0 && (
                  <Button
                    onClick={handleBatchDeleteBuildings}
                    disabled={deletingBatch}
                    variant="destructive"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 px-3.5 text-xs rounded-xl gap-1.5 shadow-sm shadow-rose-600/20 animate-in fade-in zoom-in-95 duration-150 cursor-pointer"
                  >
                    {deletingBatch ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Xóa {selectedBuildingIds.length} tòa nhà
                  </Button>
                )}
              </div>
            )}
          </PermissionGate>
        </CardHeader>

        {/* Content Area */}
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold">Đang tải danh sách tòa nhà...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: MATRIX TÒA NHÀ FLAT GRID */}
              {activeTab === 'matrix' && (
                filteredBuildings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBuildings.map((b) => renderBuildingCard(b))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <Building2 className="h-10 w-10 mx-auto opacity-35" />
                    <p className="text-sm font-semibold">Không tìm thấy tòa nhà nào phù hợp với bộ lọc</p>
                  </div>
                )
              )}

              {/* TAB 2: BẢN ĐỒ TÒA NHÀ (MAP VIEW) */}
              {activeTab === 'map' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <LucideMap className="w-4 h-4 text-emerald-600" />
                        Bản Đồ Phân Bố Vị Trí {landlordBuildings.length} Tòa Nhà
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold">
                        Định vị GPS ({landlordBuildings.filter((b) => b.latitude && b.longitude).length} tòa có tọa độ thực từ DB)
                      </span>
                    </div>

                    <BuildingsMultiMapDynamic
                      buildings={landlordBuildings}
                      onSelectBuilding={(id) => {
                        const targetPrefix = pathname.startsWith('/landlord') ? '/landlord/buildings' : '/admin/realhome/buildings';
                        router.push(`${targetPrefix}/${id}`);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {landlordBuildings.map((b) => renderBuildingCard(b))}
                  </div>
                </div>
              )}

              {/* TAB 3: TÒA CẦN ĐẨY LẤP ĐẦY */}
              {activeTab === 'action_needed' && (
                actionNeededBuildings.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Danh sách các tòa nhà đang có <strong>phòng trống</strong> hoặc <strong>sắp trống</strong> chưa đạt 100% lấp đầy cần thúc đẩy đăng tin tìm khách.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {actionNeededBuildings.map((b) => renderBuildingCard(b))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
                    <p className="text-sm font-semibold text-slate-700">Tuyệt vời! Tất cả các tòa nhà đều đã lấp đầy 100%.</p>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        landlords={landlordList}
        onSuccess={() => window.location.reload()}
      />
      <GoogleSheetImportModal
        open={isSheetModalOpen}
        onOpenChange={setIsSheetModalOpen}
        onSuccess={() => window.location.reload()}
      />
      <QuickCreateManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        landlordId={role === 'landlord' ? (currentLandlord?.id || '') : (landlordList.find((l) => l.code === formLandlordCode)?.id || '')}
        onCreated={(newManager) => {
          setSelectedManagers((prev) => [...prev, newManager.id]);
          window.location.reload();
        }}
      />

      {/* Add / Edit Building Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="font-heading text-lg font-extrabold text-slate-900">
              {editItem ? 'Cập nhật tòa nhà' : 'Thêm tòa nhà mới'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <form id="building-form" onSubmit={handleSave} className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Mã tòa nhà <span className="text-rose-500">*</span></Label>
                  <Input name="code" defaultValue={editItem?.code} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Tên tòa nhà <span className="text-rose-500">*</span></Label>
                  <Input name="name" defaultValue={editItem?.name} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
              </div>

              {/* Location Cascade */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Tỉnh / Thành phố <span className="text-rose-500">*</span></Label>
                  <select
                    value={selectedProvinceId}
                    onChange={(e) => setSelectedProvinceId(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400"
                  >
                    <option value="">-- Chọn tỉnh/thành --</option>
                    {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Quận / Huyện <span className="text-rose-500">*</span></Label>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    disabled={!selectedProvinceId}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400 disabled:opacity-50"
                  >
                    <option value="">-- Chọn quận/huyện --</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Phường / Xã <span className="text-rose-500">*</span></Label>
                  <select
                    value={selectedWardId}
                    onChange={(e) => setSelectedWardId(e.target.value)}
                    disabled={!selectedDistrictId}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400 disabled:opacity-50"
                  >
                    <option value="">-- Chọn phường/xã --</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              {editItem?.area && !composedArea && (
                <div className="text-xs text-slate-500 font-medium">
                  Khu vực hiện tại: <span className="font-bold text-slate-900">{editItem.area}</span>
                </div>
              )}
              {composedArea && (
                <div className="text-xs text-emerald-600 font-semibold">
                  ✓ Khu vực: {composedArea}
                </div>
              )}
              <input name="area" value={composedArea || editItem?.area || ''} readOnly className="hidden" />

              {role !== 'landlord' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="landlord_id" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Chủ nhà phụ trách</Label>
                  <select
                    id="landlord_id"
                    name="landlord_id"
                    value={formLandlordCode}
                    onChange={(e) => setFormLandlordCode(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400"
                  >
                    <option value="" className="bg-white text-slate-400">-- Chọn chủ nhà --</option>
                    {landlordList.map((l) => (
                      <option key={l.id} value={l.code || ''} className="bg-white text-slate-800">{l.code ? `${l.code} - ` : ''}{l.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-500">
                  Chủ nhà: <span className="font-bold text-emerald-600">{currentLandlord?.name} ({currentLandlordCode})</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Địa chỉ chi tiết <span className="text-rose-500">*</span></Label>
                <Input name="address" defaultValue={editItem?.address ?? ''} placeholder="Ví dụ: 96 Đê La Thành" className="rounded-xl border-slate-200 focus:border-emerald-400" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Tọa độ trên bản đồ</Label>
                <LocationPickerDynamic latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Năm XD</Label>
                  <Input name="year_built" type="number" defaultValue={editItem?.year_built ?? ''} className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Số tầng <span className="text-rose-500">*</span></Label>
                  <Input name="total_floors" type="number" defaultValue={editItem?.total_floors ?? 0} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Số phòng <span className="text-rose-500">*</span></Label>
                  <Input name="total_rooms" type="number" defaultValue={editItem?.total_rooms ?? 0} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
              </div>

              {/* Tiện ích & Quy định */}
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-4 text-xs">
                <span className="font-bold text-slate-900 block uppercase tracking-wider">Tiện ích &amp; Quy định chung</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="has_elevator" className="font-semibold text-slate-700 uppercase">Thang máy</Label>
                    <select id="has_elevator" name="has_elevator" defaultValue={editItem ? String(editItem.has_elevator) : 'true'} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800">
                      <option value="true">Có thang máy</option>
                      <option value="false">Không thang máy</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pccc_certified" className="font-semibold text-slate-700 uppercase">Hệ thống PCCC</Label>
                    <select id="pccc_certified" name="pccc_certified" defaultValue={editItem ? String(editItem.pccc_certified) : 'true'} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800">
                      <option value="true">Đảm bảo an toàn</option>
                      <option value="false">Chưa hoàn thiện</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="has_car_parking" className="font-semibold text-slate-700 uppercase">Chỗ đỗ ô tô</Label>
                    <select id="has_car_parking" name="has_car_parking" defaultValue={editItem ? String(editItem.has_car_parking) : 'false'} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800">
                      <option value="false">Không có chỗ đỗ ô tô</option>
                      <option value="true">Có chỗ đỗ ô tô</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="font-semibold text-slate-700 uppercase">Nuôi thú cưng</Label>
                    <select value={isPetAllowed ? 'true' : 'false'} onChange={(e) => setIsPetAllowed(e.target.value === 'true')} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800">
                      <option value="false">Không cho phép</option>
                      <option value="true">Cho phép</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="allow_foreigners" className="font-semibold text-slate-700 uppercase">Người nước ngoài</Label>
                    <select id="allow_foreigners" name="allow_foreigners" defaultValue={editItem ? String(editItem.allow_foreigners) : 'false'} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800">
                      <option value="false">Chỉ khách Việt</option>
                      <option value="true">Cho phép</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="allow_vinfast_electric" className="font-semibold text-slate-700 uppercase">Xe điện VinFast</Label>
                    <select id="allow_vinfast_electric" name="allow_vinfast_electric" defaultValue={editItem ? String(editItem.allow_vinfast_electric) : 'true'} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800">
                      <option value="true">Nhận &amp; sạc điện</option>
                      <option value="false">Không nhận</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="electric_vehicle_fee" className="font-semibold text-slate-700 uppercase">Phí sạc xe điện (VND)</Label>
                    <Input id="electric_vehicle_fee" name="electric_vehicle_fee" value={electricVehicleFee} onChange={handlePriceChange(setElectricVehicleFee)} className="h-9 text-xs rounded-xl border-slate-200" />
                  </div>
                </div>
              </div>

              {/* Upload Image */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Hình ảnh tòa nhà</Label>
                <ImageUpload
                  allowVideo={true}
                  value={imageUrl}
                  onChange={(url, thumbUrl) => { setImageUrl(url); setThumbnailUrl(thumbUrl); }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                <Button type="submit" form="building-form" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold px-6 shadow-md shadow-emerald-600/20" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu thông tin tòa nhà
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
