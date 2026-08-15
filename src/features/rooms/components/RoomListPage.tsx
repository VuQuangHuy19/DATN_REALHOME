'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Pencil, Trash2, Plus, Search, Eye, DoorOpen, Loader2, AlertCircle,
  Image as LucideImage, FileSpreadsheet, Link as LinkIcon, Building2,
  MapPin, Calendar, Layers, Clock, ShieldAlert, Zap, Layers3
} from 'lucide-react';
import { ExcelImportModal } from '@/features/properties/components/ExcelImportModal';
import { GoogleSheetImportModal } from '@/features/import/components/GoogleSheetImportModal';
import { useRooms } from '@/features/rooms/hooks/useRooms';
import { useBuildings } from '@/features/properties/hooks/useBuildings';
import { useRoomImages } from '@/features/properties/hooks/useRoomImages';
import { useRentalContracts, useDepositContracts } from '@/features/finance/hooks/useContracts';
import { useRoomTypesCatalog } from '@/features/categories/hooks/useCategories';
import { useLandlords } from '@/features/properties/hooks/useLandlords';
import { DepositCountdown } from '@/components/ui/DepositCountdown';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { addRoomImage } from '@/lib/supabase/repositories/room_images';
import type { RoomWithBuilding } from '@/features/rooms/services/rooms';
import type { DBRoom } from '@/lib/supabase/types';
import { parseSoonAvailableDate, updateSoonAvailableDescription, getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';
import Image from 'next/image';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import { usePathname } from 'next/navigation';

export function RoomListPage() {
  const { company, role } = useAuth();
  const pathname = usePathname();
  const { items: roomList, loading, error, add, update, remove } = useRooms(company?.id);
  const { items: buildings } = useBuildings(company?.id);
  const { items: contracts } = useRentalContracts(company?.id);
  const { items: depositContracts } = useDepositContracts(company?.id);
  const { items: roomTypes } = useRoomTypesCatalog(company?.id);
  const { items: landlords } = useLandlords(company?.id);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'all', 'available', 'soon_available', 'rented', 'maintenance', 'reserved'
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterLandlordCode, setFilterLandlordCode] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'floor' | 'action_needed'>('matrix');

  const [editItem, setEditItem] = useState<RoomWithBuilding | null>(null);
  const [viewItem, setViewItem] = useState<RoomWithBuilding | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayPrice, setDisplayPrice] = useState('');
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [deletingBatch, setDeletingBatch] = useState(false);

  const { images: viewImages } = useRoomImages(viewItem?.id);
  const isCustomer = pathname.startsWith('/customer') || !role || (role as string) === 'customer';

  const [selectedStatus, setSelectedStatus] = useState<string>('available');
  const [soonDate, setSoonDate] = useState<string>('');

  const [tempImages, setTempImages] = useState<{ id: string; url: string; thumbnail_url: string; is_thumbnail: boolean; priority: number; media_type: string }[]>([]);

  const {
    images,
    add: addImg,
    remove: removeImg,
    makeThumbnail,
    updatePriority
  } = useRoomImages(editItem?.id);

  // Area options
  const areaOptions = useMemo(() => {
    const areas = buildings.map((b) => b.area).filter(Boolean);
    return Array.from(new Set(areas));
  }, [buildings]);

  // Handle uploaded images
  const handleImageUploaded = async (urls: string | string[] | null, thumbUrls?: string | string[] | null, mediaTypes?: string | string[] | null) => {
    if (!urls) return;
    const urlList = Array.isArray(urls) ? urls : [urls];
    const thumbList = Array.isArray(thumbUrls) ? thumbUrls : (thumbUrls ? [thumbUrls] : []);
    const mediaTypeList = Array.isArray(mediaTypes) ? mediaTypes : (mediaTypes ? [mediaTypes] : []);

    if (editItem) {
      try {
        let currentLength = images.length;
        for (let i = 0; i < urlList.length; i++) {
          const url = urlList[i];
          const thumbnail_url = thumbList[i] || url;
          const media_type = mediaTypeList[i] || 'image';
          const isFirst = currentLength === 0;
          await addImg({
            company_id: company?.id ?? null,
            room_id: editItem.id,
            url,
            thumbnail_url,
            is_thumbnail: isFirst,
            priority: currentLength,
            media_type,
          });
          currentLength++;
        }
        toast.success('Tải ảnh phòng lên thành công');
      } catch {
        toast.error('Không thể lưu ảnh phòng');
      }
    } else {
      setTempImages((prev) => {
        let currentLength = prev.length;
        const newItems = urlList.map((url, i) => {
          const thumbnail_url = thumbList[i] || url;
          const media_type = mediaTypeList[i] || 'image';
          const isFirst = currentLength === 0;
          const item = {
            id: Math.random().toString(),
            url,
            thumbnail_url,
            is_thumbnail: isFirst,
            priority: currentLength,
            media_type,
          };
          currentLength++;
          return item;
        });
        return [...prev, ...newItems];
      });
      toast.success('Đã thêm ảnh vào danh sách chờ');
    }
  };

  const handleRemoveImage = async (imgId: string, url: string) => {
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    try {
      const urlParts = url.split(`/storage/v1/object/public/room_images/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const fileExt = filePath.split('.').pop();
        const baseName = filePath.replace(/\.[^/.]+$/, '');
        const thumbPath = `${baseName}-thumb.${fileExt}`;
        await supabase.storage.from('room_images').remove([filePath, thumbPath]);
      }
      await removeImg(imgId);
      toast.success('Đã xóa hình ảnh phòng');
    } catch {
      toast.error('Không thể xóa hình ảnh');
    }
  };

  const handleRemoveTempImage = async (imgId: string, url: string) => {
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    try {
      const urlParts = url.split(`/storage/v1/object/public/room_images/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const fileExt = filePath.split('.').pop();
        const baseName = filePath.replace(/\.[^/.]+$/, '');
        const thumbPath = `${baseName}-thumb.${fileExt}`;
        await supabase.storage.from('room_images').remove([filePath, thumbPath]);
      }
      setTempImages((prev) => prev.filter((img) => img.id !== imgId));
      toast.success('Đã xóa hình ảnh phòng');
    } catch {
      toast.error('Không thể xóa hình ảnh');
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return roomList.filter((r) => {
      if (role === 'sales_agent' && r.status === 'rented') {
        return false;
      }
      const bld = buildings.find((b) => b.code === r.building_id || b.id === r.building_id);
      const buildingName = bld?.name || r.buildings?.name || '';
      const area = bld?.area || '';
      const landlordCode = r.landlord_code || '';

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query ||
        r.code.toLowerCase().includes(query) ||
        buildingName.toLowerCase().includes(query) ||
        landlordCode.toLowerCase().includes(query) ||
        area.toLowerCase().includes(query);

      const ds = getRoomDisplayStatus(r, contracts);
      let matchesStatus = true;
      if (filterStatus) {
        if (filterStatus === 'soon_available') {
          matchesStatus = ds.isSoonAvailable;
        } else {
          matchesStatus = r.status === filterStatus && !ds.isSoonAvailable;
        }
      }

      const matchesBuilding = !filterBuildingId || r.building_id === filterBuildingId || bld?.id === filterBuildingId || bld?.code === filterBuildingId;
      const matchesArea = !filterArea || area === filterArea;
      const matchesLandlord = !filterLandlordCode || (r.landlord_code ?? '') === filterLandlordCode || bld?.landlord_id === filterLandlordCode;

      return matchesSearch && matchesStatus && matchesBuilding && matchesArea && matchesLandlord;
    });
  }, [roomList, role, buildings, contracts, searchQuery, filterStatus, filterBuildingId, filterArea, filterLandlordCode]);

  const toggleSelectRoom = (id: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllRoomsSelected =
    filteredRooms.length > 0 && selectedRoomIds.length === filteredRooms.length;

  const handleSelectAllRooms = () => {
    if (isAllRoomsSelected) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id));
    }
  };

  const handleBatchDeleteRooms = async () => {
    if (selectedRoomIds.length === 0) return;
    const count = selectedRoomIds.length;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${count} phòng đã chọn? Thao tác này không thể hoàn tác!`
      )
    ) {
      return;
    }

    setDeletingBatch(true);
    toast.loading(`Đang xóa ${count} phòng...`, { id: 'batch-delete-room' });
    try {
      for (const id of selectedRoomIds) {
        await remove(id);
      }
      setSelectedRoomIds([]);
      toast.success(`Đã xóa thành công ${count} phòng!`, { id: 'batch-delete-room' });
    } catch (err: any) {
      toast.error('Lỗi khi xóa các phòng đã chọn: ' + (err.message || 'Không xác định'), {
        id: 'batch-delete-room',
      });
    } finally {
      setDeletingBatch(false);
    }
  };

  // Group rooms by building
  const groupedRoomsByBuilding = useMemo(() => {
    const map = new Map<string, { building: any; rooms: RoomWithBuilding[] }>();

    // First populate from buildings
    buildings.forEach((b) => {
      if (filterArea && b.area !== filterArea) return;
      if (filterBuildingId && b.id !== filterBuildingId && b.code !== filterBuildingId) return;
      if (filterLandlordCode && b.landlord_id !== filterLandlordCode) return;
      map.set(b.code || b.id, { building: b, rooms: [] });
    });

    filteredRooms.forEach((r) => {
      const bld = buildings.find((b) => b.code === r.building_id || b.id === r.building_id);
      const key = bld?.code || bld?.id || r.building_id || 'unknown';

      if (!map.has(key)) {
        map.set(key, {
          building: bld || { name: `Tòa nhà ${r.building_id}`, area: 'Khác', total_rooms: 0 },
          rooms: [],
        });
      }
      map.get(key)!.rooms.push(r);
    });

    return Array.from(map.values()).filter((item) => item.rooms.length > 0);
  }, [buildings, filteredRooms, filterArea, filterBuildingId, filterLandlordCode]);

  // Action needed rooms (Hot List)
  const actionNeededRooms = useMemo(() => {
    return filteredRooms.filter((r) => {
      const ds = getRoomDisplayStatus(r, contracts);
      const isReserved = r.status === 'reserved';
      const isAvailable = r.status === 'available';
      return ds.isSoonAvailable || isReserved || isAvailable;
    });
  }, [filteredRooms, contracts]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const bCode = formData.get('building_id') as string || null;
    const selectedBuilding = buildings.find((b) => b.code === bCode || b.id === bCode);
    const landlordCode = selectedBuilding?.landlord_id ?? null;

    const statusVal = formData.get('status') as string;
    const soonDateVal = formData.get('soon_date') as string || null;
    const descVal = formData.get('description') as string || null;

    const payload: Omit<DBRoom, 'id' | 'created_at' | 'updated_at'> = {
      company_id: company?.id ?? '',
      building_id: bCode,
      landlord_id: landlordCode,
      code: formData.get('code') as string,
      floor: Number(formData.get('floor')),
      room_type: formData.get('room_type') as string || null,
      size: Number(formData.get('size')) || null,
      price: Number(formData.get('price')),
      status: (statusVal === 'soon_available' ? 'rented' : statusVal) as DBRoom['status'],
      bedrooms: Number(formData.get('bedrooms')),
      bathrooms: Number(formData.get('bathrooms')),
      description: statusVal === 'soon_available'
        ? updateSoonAvailableDescription(descVal, soonDateVal)
        : updateSoonAvailableDescription(descVal, null),
      has_private_balcony: formData.get('has_private_balcony') === 'true',
      max_occupants: Number(formData.get('max_occupants')) || 2,
      max_vehicles_per_room: Number(formData.get('max_vehicles_per_room')) || 2,
      min_contract_months: Number(formData.get('min_contract_months')) || 12,
      rose: (formData.get('rose') as string) || null,
    };

    if (editItem) {
      await update(editItem.id, payload);
    } else {
      const newRoom = await add(payload);
      if (newRoom && tempImages.length > 0) {
        try {
          for (const img of tempImages) {
            await addRoomImage({
              company_id: company?.id ?? null,
              room_id: newRoom.id,
              url: img.url,
              thumbnail_url: img.thumbnail_url,
              is_thumbnail: img.is_thumbnail,
              priority: img.priority,
              media_type: img.media_type,
            });
          }
        } catch (err) {
          console.error('Lỗi lưu hình ảnh phòng:', err);
          toast.error('Có lỗi xảy ra khi lưu hình ảnh phòng');
        }
      }
    }
    setSaving(false);
    setIsDialogOpen(false);
    setEditItem(null);
    setTempImages([]);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) { setDisplayPrice(''); return; }
    setDisplayPrice(Number(rawValue).toLocaleString('vi-VN'));
  };

  const openAdd = () => {
    setEditItem(null);
    setTempImages([]);
    setDisplayPrice('');
    setSelectedStatus('available');
    setSoonDate('');
    setIsDialogOpen(true);
  };

  const openEdit = (item: RoomWithBuilding) => {
    setEditItem(item);
    setTempImages([]);
    setDisplayPrice(item.price ? item.price.toLocaleString('vi-VN') : '');
    const manualDate = parseSoonAvailableDate(item.description);
    setSelectedStatus(manualDate ? 'soon_available' : item.status);
    setSoonDate(manualDate || '');
    setIsDialogOpen(true);
  };

  const openView = (item: RoomWithBuilding) => { setViewItem(item); setIsViewOpen(true); };

  // Render individual room card for Matrix
  const renderRoomCard = (room: RoomWithBuilding) => {
    const ds = getRoomDisplayStatus(room, contracts);
    const activeDeposit = room.status === 'reserved'
      ? depositContracts.find((c) => c.room_id === room.id && c.status === 'active')
      : null;

    let cardBg = 'bg-white border-slate-200 hover:border-emerald-400';
    let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

    if (ds.isSoonAvailable) {
      cardBg = 'bg-amber-50/50 border-amber-200 hover:border-amber-400';
      statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    } else if (room.status === 'rented') {
      cardBg = 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300';
      statusBadgeClass = 'bg-rose-100 text-rose-700 border-rose-200 font-bold';
    } else if (room.status === 'available') {
      cardBg = 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400';
      statusBadgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200 font-bold';
    } else if (room.status === 'maintenance') {
      cardBg = 'bg-yellow-50/40 border-yellow-200 hover:border-yellow-300';
      statusBadgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200 font-bold';
    } else if (room.status === 'reserved') {
      cardBg = 'bg-sky-50/40 border-sky-200 hover:border-sky-300';
      statusBadgeClass = 'bg-sky-100 text-sky-700 border-sky-200 font-bold';
    }

    const isSelected = selectedRoomIds.includes(room.id);

    return (
      <div
        key={room.id}
        onClick={() => openView(room)}
        className={`p-3.5 rounded-2xl border ${cardBg} shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
          isSelected ? 'ring-2 ring-rose-400 border-rose-400 bg-rose-50/40' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {role !== 'sales_agent' && (
              <div
                className="shrink-0 cursor-pointer p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectRoom(room.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                P.{room.code}
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Tầng {room.floor || 1} {room.size ? `• ${room.size}m²` : ''}
              </p>
            </div>
          </div>

          <Badge className={`${statusBadgeClass} text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0`}>
            {ds.isSoonAvailable ? 'Sắp trống' : room.status === 'available' ? 'Còn trống' : room.status === 'rented' ? 'Đã thuê' : room.status === 'reserved' ? 'Đang giữ' : 'Bảo trì'}
          </Badge>
        </div>

        {/* Expected empty date notice if soon_available */}
        {ds.isSoonAvailable && ds.expectedEmptyDate && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-bold bg-amber-100/80 px-2 py-1 rounded-lg border border-amber-300/60">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Vào: {formatDateDisplay(ds.expectedEmptyDate)}</span>
          </div>
        )}

        {activeDeposit && (
          <div className="pt-1">
            <DepositCountdown createdAt={activeDeposit.created_at} />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 mt-auto">
          <span className="text-xs font-extrabold font-mono text-emerald-700">
            {room.price > 0 ? `${(room.price / 1000000).toFixed(1)}M VNĐ` : '0M VNĐ'}
          </span>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
              onClick={() => openView(room)}
              title="Xem chi tiết"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {role !== 'sales_agent' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  onClick={() => openEdit(room)}
                  title="Chỉnh sửa"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  onClick={() => remove(room.id)}
                  title="Xóa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
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
            Quản Lý Phòng BĐS RealHome
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Quản Lý Phòng Trống
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Theo dõi tình trạng trống, đã thuê &amp; sắp trống theo thời gian thực
          </p>
        </div>

        {role !== 'sales_agent' && (
          <div className="flex items-center gap-2 flex-wrap">
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
              Thêm phòng mới
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Interactive Matrix Card Container */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        {/* Header Toolbar: Views + Filters */}
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* View Switcher Tabs (Matrix vs Floor vs Action Needed) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'matrix' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                🟢 Matrix Phòng ({filteredRooms.length})
              </button>
              <button
                onClick={() => setActiveTab('floor')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'floor' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers3 className="w-3.5 h-3.5 text-emerald-600" />
                🏢 Sơ Đồ Tầng
              </button>
              <button
                onClick={() => setActiveTab('action_needed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'action_needed' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                ⚡ Xử Lý Nhanh ({actionNeededRooms.length})
              </button>
            </div>

            {/* Dropdown Filters (Area, Building, Landlord) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {areaOptions.length > 0 && (
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 shadow-xs cursor-pointer max-w-[150px] truncate"
                >
                  <option value="">📍 Khu vực ({areaOptions.length})</option>
                  {areaOptions.map((a) => (
                    <option key={a} value={a}>📍 {a}</option>
                  ))}
                </select>
              )}

              <select
                value={filterBuildingId}
                onChange={(e) => setFilterBuildingId(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 shadow-xs cursor-pointer max-w-[180px] truncate"
              >
                <option value="">🏢 Tòa nhà ({buildings.length})</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.code || b.id}>🏢 {b.name}</option>
                ))}
              </select>

              {role !== 'landlord' && landlords.length > 0 && (
                <select
                  value={filterLandlordCode}
                  onChange={(e) => setFilterLandlordCode(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 shadow-xs cursor-pointer max-w-[180px] truncate"
                >
                  <option value="">👤 Chủ nhà ({landlords.length})</option>
                  {landlords.map((l) => (
                    <option key={l.id} value={l.code || ''}>👤 {l.code ? `${l.code} - ` : ''}{l.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Search bar & Status Filter Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Tìm mã phòng, tên tòa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl border-slate-200 focus:border-emerald-400"
              />
            </div>

            {/* Quick Status Filter Pills including Orange Sắp Trống */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: '', label: 'Tất cả' },
                { id: 'rented', label: '🔴 Đã thuê', style: 'bg-rose-50 border-rose-200 text-rose-700' },
                { id: 'available', label: '🟢 Còn trống', style: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { id: 'soon_available', label: '🟠 Sắp trống', style: 'bg-amber-100 border-amber-300 text-amber-800 font-bold' },
                { id: 'maintenance', label: '🟡 Bảo trì', style: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
                { id: 'reserved', label: '🔵 Đang giữ', style: 'bg-sky-50 border-sky-200 text-sky-700' },
              ].map((pill) => {
                const isActive = filterStatus === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setFilterStatus(pill.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                      isActive
                        ? pill.id === 'soon_available'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-bold scale-105'
                          : 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-bold scale-105'
                        : pill.style || 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}

              {(filterStatus || filterBuildingId || filterArea || searchQuery || filterLandlordCode) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('');
                    setFilterBuildingId('');
                    setFilterArea('');
                    setFilterLandlordCode('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-1"
                >
                  🔄 Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Selection Toolbar: Select All & Bulk Delete */}
          {role !== 'sales_agent' && (
            <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-xl">
              <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllRoomsSelected}
                  onChange={handleSelectAllRooms}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
                <span>Chọn tất cả ({filteredRooms.length} phòng)</span>
              </label>

              {selectedRoomIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingBatch}
                  onClick={handleBatchDeleteRooms}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-8 px-3 text-xs shadow-md flex items-center gap-1.5"
                >
                  {deletingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Xóa ({selectedRoomIds.length}) phòng đã chọn
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        {/* Content Area */}
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold">Đang tải sơ đồ phòng...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: MATRIX PHÒNG GROUPED BY BUILDING */}
              {activeTab === 'matrix' && (
                groupedRoomsByBuilding.length > 0 ? (
                  <div className="space-y-6">
                    {groupedRoomsByBuilding.map(({ building, rooms }) => {
                      const totalCount = rooms.length;
                      const rentedCount = rooms.filter((r) => r.status === 'rented' && !getRoomDisplayStatus(r, contracts).isSoonAvailable).length;
                      const soonCount = rooms.filter((r) => getRoomDisplayStatus(r, contracts).isSoonAvailable).length;
                      const vacantCount = rooms.filter((r) => r.status === 'available').length;
                      const pct = totalCount > 0 ? Math.round(((rentedCount + soonCount) / totalCount) * 100) : 0;

                      return (
                        <div key={building.id || building.code} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xs space-y-4">
                          {/* Building Section Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <h3 className="font-extrabold text-slate-900 text-base">{building.name}</h3>
                                {building.area && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold">
                                    📍 {building.area}
                                  </Badge>
                                )}
                              </div>
                              {building.address && (
                                <p className="text-xs text-slate-500 font-medium pl-7">📍 {building.address}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-lg">
                                Lắp đầy: {pct}% ({rentedCount + soonCount}/{totalCount} phòng)
                              </Badge>
                              {vacantCount > 0 && (
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs px-2.5 py-1 rounded-lg">
                                  🟢 Trống {vacantCount} phòng
                                </Badge>
                              )}
                              {soonCount > 0 && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg">
                                  🟠 Sắp trống {soonCount} phòng
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Room Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {rooms.map((room) => renderRoomCard(room))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <DoorOpen className="h-10 w-10 mx-auto opacity-35" />
                    <p className="text-sm font-semibold">Không tìm thấy phòng nào phù hợp với bộ lọc</p>
                  </div>
                )
              )}

              {/* TAB 2: SƠ ĐỒ THEO TẦNG */}
              {activeTab === 'floor' && (
                groupedRoomsByBuilding.length > 0 ? (
                  <div className="space-y-8">
                    {groupedRoomsByBuilding.map(({ building, rooms }) => {
                      // Group rooms by floor number
                      const floorMap = new Map<number, RoomWithBuilding[]>();
                      rooms.forEach((r) => {
                        const fl = r.floor || 1;
                        if (!floorMap.has(fl)) floorMap.set(fl, []);
                        floorMap.get(fl)!.push(r);
                      });
                      const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => b - a);

                      return (
                        <div key={building.id || building.code} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-emerald-600" />
                              {building.name}
                            </h3>
                            <span className="text-xs font-semibold text-slate-500">{rooms.length} phòng tổng số</span>
                          </div>

                          <div className="space-y-4">
                            {sortedFloors.map((floorNum) => {
                              const floorRooms = floorMap.get(floorNum)!;
                              return (
                                <div key={floorNum} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                  <div className="w-24 shrink-0 font-extrabold text-xs text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 text-center shadow-2xs">
                                    🏢 TẦNG {floorNum}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 flex-1">
                                    {floorRooms.map((room) => renderRoomCard(room))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <DoorOpen className="h-10 w-10 mx-auto opacity-35" />
                    <p className="text-sm font-semibold">Không tìm thấy phòng nào phù hợp với bộ lọc</p>
                  </div>
                )
              )}

              {/* TAB 3: XỬ LÝ NHANH / CẢNH BÁO */}
              {activeTab === 'action_needed' && (
                actionNeededRooms.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Danh sách các phòng đang <strong>Sắp trống</strong>, <strong>Còn trống</strong> hoặc <strong>Đang giữ cọc</strong> cần xử lý đăng tin hoặc ký hợp đồng.</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {actionNeededRooms.map((room) => renderRoomCard(room))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <ShieldAlert className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
                    <p className="text-sm font-semibold text-slate-700">Tuyệt vời! Không có phòng nào đang cần xử lý khẩn cấp.</p>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog View Chi Tiết */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className={`rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${isCustomer ? 'max-w-lg' : 'max-w-2xl max-h-[90vh] flex flex-col'}`}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-extrabold text-slate-900">
              <DoorOpen className="h-5 w-5 text-emerald-600" />Chi tiết phòng {viewItem?.code}
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div><strong>Mã phòng:</strong> <span className="font-mono text-slate-900 font-bold">P.{viewItem.code}</span></div>
                <div><strong>Tòa nhà:</strong> <span className="text-slate-900 font-bold">{viewItem.buildings?.name ?? '—'}</span></div>
                <div><strong>Tầng:</strong> <span className="text-slate-900 font-bold">Tầng {viewItem.floor}</span></div>
                <div><strong>Loại phòng:</strong> <span className="text-slate-900 font-bold">{viewItem.room_type ?? '—'}</span></div>
                <div><strong>Diện tích:</strong> <span className="font-mono text-slate-900 font-bold">{viewItem.size ? `${viewItem.size}m²` : '—'}</span></div>
                <div><strong>Giá thuê:</strong> <span className="font-mono text-emerald-700 font-extrabold">{viewItem.price.toLocaleString('vi-VN')}đ/tháng</span></div>
              </div>

              {viewItem.description && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-slate-700">
                  <strong className="text-emerald-800">Mô tả / Ghi chú:</strong>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{viewItem.description}</p>
                </div>
              )}

              {/* View Images */}
              {viewImages && viewImages.length > 0 && (
                <div className="space-y-2">
                  <strong className="text-slate-900">Hình ảnh phòng ({viewImages.length}):</strong>
                  <div className="grid grid-cols-3 gap-2">
                    {viewImages.map((img) => (
                      <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200">
                        <Image src={img.url} alt="Room image" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsViewOpen(false)} className="rounded-xl">Đóng</Button>
                {role !== 'sales_agent' && (
                  <Button onClick={() => { setIsViewOpen(false); openEdit(viewItem); }} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Chỉnh sửa phòng
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Thêm / Sửa Phòng */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="font-heading text-lg font-extrabold text-slate-900">{editItem ? 'Chỉnh sửa' : 'Thêm mới'} phòng BĐS</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <form onSubmit={handleSave} className="space-y-4 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Mã phòng <span className="text-rose-500">*</span></Label>
                  <Input id="code" name="code" defaultValue={editItem?.code} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="building_id" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Tòa nhà <span className="text-rose-500">*</span></Label>
                  <select id="building_id" name="building_id" defaultValue={editItem?.building_id ?? ''} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400">
                    <option value="">Chọn tòa nhà</option>
                    {buildings.map((b) => <option key={b.id} value={b.code || b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room_type" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Loại phòng <span className="text-rose-500">*</span></Label>
                  <select id="room_type" name="room_type" defaultValue={editItem?.room_type ?? ''} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400" required>
                    <option value="">Chọn loại</option>
                    {roomTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="floor" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Tầng <span className="text-rose-500">*</span></Label>
                  <Input id="floor" name="floor" type="number" defaultValue={editItem?.floor} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Trạng thái <span className="text-rose-500">*</span></Label>
                  <select
                    id="status"
                    name="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-400 font-bold"
                    required
                  >
                    <option value="available">🟢 Còn trống</option>
                    <option value="soon_available">🟠 Sắp trống</option>
                    <option value="rented">🔴 Đã cho thuê</option>
                    <option value="maintenance">🟡 Bảo trì</option>
                    <option value="reserved">🔵 Đặt trước / Đang giữ</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="size" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Diện tích (m²) <span className="text-rose-500">*</span></Label>
                  <Input id="size" name="size" type="number" defaultValue={editItem?.size ?? ''} className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Giá thuê (đ) <span className="text-rose-500">*</span></Label>
                  <Input
                    id="price"
                    type="text"
                    inputMode="numeric"
                    value={displayPrice}
                    onChange={handlePriceChange}
                    placeholder="0"
                    required
                    className="rounded-xl border-slate-200 focus:border-emerald-400 font-mono font-bold"
                  />
                  <input type="hidden" name="price" value={displayPrice.replace(/\./g, '')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_contract_months" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Hợp đồng tối thiểu (tháng)</Label>
                  <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={editItem?.min_contract_months ?? 12} required className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
              </div>

              {selectedStatus === 'soon_available' && (
                <div className="grid grid-cols-1 gap-4 bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="soon_date" className="text-amber-800 font-bold text-xs uppercase tracking-wider">Ngày trống dự kiến</Label>
                    <FormattedDateInput
                      id="soon_date"
                      name="soon_date"
                      value={soonDate}
                      onChange={setSoonDate}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Mô tả / Tiện ích phòng</Label>
                  <Input id="description" name="description" defaultValue={editItem?.description ?? ''} className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rose" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Hoa hồng môi giới</Label>
                  <Input id="rose" name="rose" defaultValue={editItem?.rose ?? ''} placeholder="Nhập hoa hồng..." className="rounded-xl border-slate-200 focus:border-emerald-400" />
                </div>
              </div>

              {/* Upload & Quản lý Ảnh */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <Label className="text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <LucideImage className="h-4 w-4 text-emerald-600" />
                  Hình ảnh / Video phòng ({(editItem ? images : tempImages).length})
                </Label>

                {(editItem ? images : tempImages).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                    {(editItem ? images : tempImages).map((img) => (
                      <div key={img.id} className="relative p-2 rounded-xl border bg-white shadow-2xs space-y-1.5">
                        <Image src={img.thumbnail_url || img.url} alt="Room" width={100} height={60} className="object-cover rounded-lg aspect-video w-full" />
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700">
                            <input
                              type="radio"
                              name="dialog_list_thumbnail_radio"
                              checked={img.is_thumbnail}
                              onChange={() => {
                                if (editItem) {
                                  makeThumbnail(img.id);
                                } else {
                                  setTempImages(prev => prev.map(item => ({ ...item, is_thumbnail: item.id === img.id })));
                                }
                              }}
                            />
                            Chính
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-rose-600 hover:bg-rose-50 rounded"
                            onClick={() => editItem ? handleRemoveImage(img.id, img.url) : handleRemoveTempImage(img.id, img.url)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <ImageUpload allowVideo={true} value={null} onChange={handleImageUploaded} bucket="room_images" multiple={true} className="w-full" />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold py-2.5 shadow-md shadow-emerald-600/20" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu thông tin phòng
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        landlords={landlords}
        onSuccess={() => window.location.reload()}
      />
      <GoogleSheetImportModal
        open={isSheetModalOpen}
        onOpenChange={setIsSheetModalOpen}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
