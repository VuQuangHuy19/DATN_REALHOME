'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, Eye, DoorOpen, Loader2, AlertCircle, Image as LucideImage, FileSpreadsheet, Link as LinkIcon } from 'lucide-react';
import { ExcelImportModal } from '@/src/features/properties/components/ExcelImportModal';
import { GoogleSheetImportModal } from '@/src/features/import/components/GoogleSheetImportModal';
import { useRooms } from '@/src/features/rooms/hooks/useRooms';
import { useBuildings } from '@/src/features/properties/hooks/useBuildings';
import { useRoomImages } from '@/src/features/properties/hooks/useRoomImages';
import { useRentalContracts, useDepositContracts } from '@/src/features/finance/hooks/useContracts';
import { useRoomTypesCatalog } from '@/src/features/categories/hooks/useCategories';
import { useLandlords } from '@/src/features/properties/hooks/useLandlords';;
import { DepositCountdown } from '@/components/ui/DepositCountdown';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { addRoomImage } from '@/lib/supabase/repositories/room_images';
import type { RoomWithBuilding } from '@/src/features/rooms/services/rooms';
import type { DBRoom } from '@/lib/supabase/types';
import { parseSoonAvailableDate, updateSoonAvailableDescription, getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';
import Link from 'next/link';
import Image from 'next/image';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import { usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FacebookPostingAssistant } from './FacebookPostingAssistant';

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã cho thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đang giữ',
};

export function RoomListPage() {
  const { company, role } = useAuth();
  const pathname = usePathname();
  const { items: roomList, loading, error, add, update, remove } = useRooms(company?.id);
  const { items: buildings } = useBuildings(company?.id);
  const { items: contracts } = useRentalContracts(company?.id);
  const { items: depositContracts } = useDepositContracts(company?.id);
  const { items: roomTypes } = useRoomTypesCatalog(company?.id);
  const { items: landlords } = useLandlords(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterLandlordCode, setFilterLandlordCode] = useState('');
  const [editItem, setEditItem] = useState<RoomWithBuilding | null>(null);
  const [viewItem, setViewItem] = useState<RoomWithBuilding | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayPrice, setDisplayPrice] = useState('');
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  
  const { images: viewImages } = useRoomImages(viewItem?.id);
  const isCustomer = pathname.startsWith('/customer') || !role || (role as string) === 'customer';

  const [selectedStatus, setSelectedStatus] = useState<string>('available');
  const [soonDate, setSoonDate] = useState<string>('');

  const [tempImages, setTempImages] = useState<{ id: string; url: string; thumbnail_url: string; is_thumbnail: boolean; priority: number; media_type: string }[]>([]);

  const {
    images,
    loading: imgLoading,
    add: addImg,
    remove: removeImg,
    makeThumbnail,
    updatePriority
  } = useRoomImages(editItem?.id);

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

  const filtered = roomList.filter((r) => {
    if (role === 'sales_agent' && r.status === 'rented') {
      return false;
    }
    const buildingName = r.buildings?.name ?? '';
    const landlordCode = r.landlord_code ?? '';
    const matchesSearch = r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlordCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const matchesBuilding = !filterBuildingId || r.building_id === filterBuildingId;
    const matchesLandlord = !filterLandlordCode || (r.landlord_code ?? '') === filterLandlordCode;
    return matchesSearch && matchesStatus && matchesBuilding && matchesLandlord;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const bCode = formData.get('building_id') as string || null;
    const selectedBuilding = buildings.find((b) => b.code === bCode);
    // buildings.landlord_id đã lưu trực tiếp code của chủ nhà (TEXT) nên dùng thẳng
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Quản lý Căn hộ/Phòng</h1>
          <p className="text-ink-muted text-sm">Quản lý căn hộ và phòng riêng lẻ</p>
        </div>
        {role !== 'sales_agent' && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button onClick={() => setIsExcelModalOpen(true)} variant="outline" size="sm" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 rounded-lg h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium" title="Nhập Excel">
              <FileSpreadsheet className="h-4 w-4 sm:mr-1.5 text-emerald-600" />
              <span className="hidden sm:inline">Nhập Excel</span>
            </Button>
            <Button onClick={() => setIsSheetModalOpen(true)} variant="outline" size="sm" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 rounded-lg h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium" title="Nhập Link Sheet">
              <LinkIcon className="h-4 w-4 sm:mr-1.5 text-emerald-700" />
              <span className="hidden sm:inline">Nhập Link Sheet</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} size="sm" className="bg-accent hover:bg-accent-500 text-white rounded-lg h-9 px-3 text-xs sm:text-sm font-bold shadow-sm" title="Thêm phòng">
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Thêm phòng</span>
                  <span className="sm:hidden">Thêm</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col rounded-lg border border-border bg-white shadow-lg">
              <DialogHeader className="flex-shrink-0 px-6 pt-6">
                <DialogTitle className="font-heading text-lg font-bold text-ink">{editItem ? 'Chỉnh sửa' : 'Thêm'} phòng</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 px-6 pb-6">
                <form onSubmit={handleSave} className="space-y-4 py-1">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã phòng <span className="text-red-500">*</span></Label>
                      <Input id="code" name="code" defaultValue={editItem?.code} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="building_id" className="text-ink font-semibold text-xs uppercase tracking-wider">Tòa nhà <span className="text-red-500">*</span></Label>
                      <select id="building_id" name="building_id" defaultValue={editItem?.building_id ?? ''} className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent">
                        <option value="">Chọn tòa nhà</option>
                        {buildings.map((b) => <option key={b.id} value={b.code}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="room_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại phòng <span className="text-red-500">*</span></Label>
                      <select id="room_type" name="room_type" defaultValue={editItem?.room_type ?? ''} className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent" required>
                        <option value="">Chọn loại</option>
                        {roomTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="floor" className="text-ink font-semibold text-xs uppercase tracking-wider">Tầng <span className="text-red-500">*</span></Label>
                      <Input id="floor" name="floor" type="number" defaultValue={editItem?.floor} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="status" className="text-ink font-semibold text-xs uppercase tracking-wider">Trạng thái <span className="text-red-500">*</span></Label>
                      <select
                        id="status"
                        name="status"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent"
                        required
                      >
                        <option value="available">Còn trống</option>
                        <option value="soon_available">Sắp trống</option>
                        <option value="rented">Đã cho thuê</option>
                        <option value="maintenance">Bảo trì</option>
                        <option value="reserved">Đặt trước / Đang giữ</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="size" className="text-ink font-semibold text-xs uppercase tracking-wider">Diện tích (m²) <span className="text-red-500">*</span></Label>
                      <Input id="size" name="size" type="number" defaultValue={editItem?.size ?? ''} className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="price" className="text-ink font-semibold text-xs uppercase tracking-wider">Giá thuê (đ) <span className="text-red-500">*</span></Label>
                      <Input
                        id="price"
                        type="text"
                        inputMode="numeric"
                        value={displayPrice}
                        onChange={handlePriceChange}
                        placeholder="0"
                        required
                        className="rounded-lg border-border focus-visible:ring-accent"
                      />
                      <input type="hidden" name="price" value={displayPrice.replace(/\./g, '')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="min_contract_months" className="text-ink font-semibold text-xs uppercase tracking-wider">Hợp đồng tối thiểu (tháng) <span className="text-red-500">*</span></Label>
                      <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={editItem?.min_contract_months ?? 12} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                  </div>

                  {selectedStatus === 'soon_available' && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="soon_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày trống dự kiến</Label>
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

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="bedrooms" className="text-ink font-semibold text-xs uppercase tracking-wider">Phòng ngủ <span className="text-red-500">*</span></Label>
                      <Input id="bedrooms" name="bedrooms" type="number" defaultValue={editItem?.bedrooms} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bathrooms" className="text-ink font-semibold text-xs uppercase tracking-wider">Phòng tắm <span className="text-red-500">*</span></Label>
                      <Input id="bathrooms" name="bathrooms" type="number" defaultValue={editItem?.bathrooms} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="has_private_balcony" className="text-ink font-semibold text-xs uppercase tracking-wider">Ban công riêng</Label>
                      <select id="has_private_balcony" name="has_private_balcony" defaultValue={editItem ? String(editItem.has_private_balcony) : 'false'} className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent">
                        <option value="false">Không có</option>
                        <option value="true">Có ban công riêng</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max_occupants" className="text-ink font-semibold text-xs uppercase tracking-wider">Số người tối đa <span className="text-red-500">*</span></Label>
                      <Input id="max_occupants" name="max_occupants" type="number" defaultValue={editItem?.max_occupants ?? 2} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max_vehicles_per_room" className="text-ink font-semibold text-xs uppercase tracking-wider">Số xe tối đa <span className="text-red-500">*</span></Label>
                      <Input id="max_vehicles_per_room" name="max_vehicles_per_room" type="number" defaultValue={editItem?.max_vehicles_per_room ?? 2} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-ink font-semibold text-xs uppercase tracking-wider">Mô tả</Label>
                      <Input id="description" name="description" defaultValue={editItem?.description ?? ''} className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rose" className="text-ink font-semibold text-xs uppercase tracking-wider">Hoa hồng môi giới <span className="text-red-500">*</span></Label>
                      <Input id="rose" name="rose" defaultValue={editItem?.rose ?? ''} placeholder="Nhập hoa hồng..." className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                  </div>

                  {/* Quản lý ảnh phòng trực tiếp trong Dialog Sửa hoặc Thêm */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <Label className="text-ink font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
                      <LucideImage className="h-4 w-4 text-accent" />
                      Hình ảnh phòng ({(editItem ? images : tempImages).length})
                    </Label>

                    {(editItem ? images : tempImages).length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-border rounded-lg text-ink-muted bg-bg-base/30">
                        <LucideImage className="h-5 w-5 mx-auto mb-1 opacity-45" />
                        <p className="text-xs">Chưa có hình ảnh nào cho phòng này</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto p-1 border border-border rounded-lg bg-bg-subtle/20">
                        {(editItem ? images : tempImages).map((img) => (
                          <div
                            key={img.id}
                            className={`flex items-center gap-3 p-2 rounded-lg border bg-white shadow-sm transition-all ${img.is_thumbnail ? 'border-amber-400 bg-amber-50/10' : 'border-border'
                              }`}
                          >
                            <Image
                              src={img.thumbnail_url || img.url}
                              alt="Room preview"
                              width={56}
                              height={40}
                              className="object-cover rounded border border-border shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-ink select-none">
                                  <input
                                    type="radio"
                                    name="dialog_list_thumbnail_radio"
                                    checked={img.is_thumbnail}
                                    onChange={() => {
                                      if (editItem) {
                                        makeThumbnail(img.id);
                                      } else {
                                        setTempImages(prev => prev.map(item => ({
                                          ...item,
                                          is_thumbnail: item.id === img.id
                                        })));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-amber-500 border-border focus:ring-amber-450 focus:ring-offset-0 cursor-pointer"
                                  />
                                  Ảnh chính
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-danger hover:text-danger hover:bg-danger/10"
                                  onClick={() => {
                                    if (editItem) {
                                      handleRemoveImage(img.id, img.url);
                                    } else {
                                      handleRemoveTempImage(img.id, img.url);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                                <span className="font-semibold text-[10px] uppercase">Ưu tiên:</span>
                                <input
                                  type="number"
                                  value={img.priority}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (editItem) {
                                      updatePriority(img.id, val);
                                    } else {
                                      setTempImages(prev => prev.map(item =>
                                        item.id === img.id ? { ...item, priority: val } : item
                                      ).sort((a, b) => a.priority - b.priority));
                                    }
                                  }}
                                  className="w-10 h-5 border border-border rounded text-center font-mono text-[10px] text-ink bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1">
                      <ImageUpload allowVideo={true}
                        value={null}
                        onChange={handleImageUploaded}
                        bucket="room_images"
                        multiple={true}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg mt-2 font-semibold" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu phòng
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
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

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <Card className="border-border rounded-lg shadow-none bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <Input placeholder="Tìm theo mã phòng, tòa nhà hoặc mã chủ nhà..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-lg border-border focus-visible:ring-accent" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <option value="">Tất cả trạng thái</option>
                <option value="available">Còn trống</option>
                <option value="rented">Đã cho thuê</option>
                <option value="maintenance">Bảo trì</option>
                <option value="reserved">Đang giữ</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {role !== 'landlord' && (
                <select value={filterLandlordCode} onChange={(e) => {
                  setFilterLandlordCode(e.target.value);
                  setFilterBuildingId(''); // Reset building filter when landlord changes
                }} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <option value="">Tất cả chủ nhà</option>
                  {landlords.map((l) => (
                    <option key={l.id} value={l.code || ''}>
                      {l.code ? `${l.code} — ` : ''}{l.name}
                    </option>
                  ))}
                </select>
              )}
              <select value={filterBuildingId} onChange={(e) => setFilterBuildingId(e.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <option value="">Tất cả tòa nhà</option>
                {buildings
                  .filter((b) => !filterLandlordCode || b.landlord_id === filterLandlordCode)
                  .map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.code} — {b.name}
                    </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
          ) : (
            <div className="border-t border-border overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table border-collapse">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã Chủ Nhà</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Tòa nhà</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Diện tích</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Giá</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openView(item)}
                      className="hover:bg-bg-subtle/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-ink-muted text-xs">{item.code}</td>
                      <td className="px-6 py-4 font-mono text-ink-muted text-sm">{item.landlord_code ?? '—'}</td>
                      <td className="px-6 py-4 font-bold text-ink text-sm">{item.buildings?.name ?? '—'}</td>
                      <td className="px-6 py-4 text-ink-muted text-sm font-semibold">{item.room_type ?? '—'}</td>
                      <td className="px-6 py-4 font-mono text-ink-muted text-sm">{item.size ? `${item.size}m²` : '—'}</td>
                      <td className="px-6 py-4 font-mono font-bold text-accent text-sm">{item.price.toLocaleString('vi-VN')}đ</td>
                      <td className="px-6 py-4">
                        {(() => {
                          const ds = getRoomDisplayStatus(item, contracts);
                          const activeDeposit = item.status === 'reserved'
                            ? depositContracts.find((c) => c.room_id === item.id && c.status === 'active')
                            : null;
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <Badge className={`${ds.colorClass} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                                {ds.label}
                              </Badge>
                              {activeDeposit && <DepositCountdown createdAt={activeDeposit.created_at} />}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md" onClick={() => openView(item)} title="Xem chi tiết"><Eye className="h-4 w-4" /></Button>
                          {role !== 'sales_agent' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md" onClick={() => openEdit(item)} title="Chỉnh sửa"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md" onClick={() => remove(item.id)} title="Xóa"><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openView(item)}
                    className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-ink text-sm">Phòng {item.code}</span>
                      {(() => {
                        const ds = getRoomDisplayStatus(item, contracts);
                        const activeDeposit = item.status === 'reserved'
                          ? depositContracts.find((c) => c.room_id === item.id && c.status === 'active')
                          : null;
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`${ds.colorClass} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                              {ds.label}
                            </Badge>
                            {activeDeposit && <DepositCountdown createdAt={activeDeposit.created_at} />}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      <div>
                        <span className="font-medium text-ink-muted">Tòa nhà:</span>{' '}
                        <span className="text-ink font-bold">{item.buildings?.name ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Mã chủ nhà:</span>{' '}
                        <span className="text-ink font-semibold font-mono">{item.landlord_code ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Loại:</span>{' '}
                        <span className="text-ink font-semibold">{item.room_type ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Diện tích:</span>{' '}
                        <span className="text-ink font-semibold font-mono">{item.size ? `${item.size}m²` : '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-sm font-bold text-accent font-mono">
                        {item.price.toLocaleString('vi-VN')}đ/tháng
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md" onClick={() => openView(item)}><Eye className="h-4 w-4" /></Button>
                        {role !== 'sales_agent' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-12 text-ink-muted">
                  <DoorOpen className="h-10 w-10 mx-auto mb-2 opacity-35" />
                  <p className="text-sm">Chưa có phòng nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
 
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className={`rounded-lg border border-border bg-white shadow-lg transition-all duration-200 ${isCustomer ? 'max-w-lg' : 'max-w-2xl max-h-[90vh] flex flex-col'}`}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
              <DoorOpen className="h-5 w-5 text-accent" />Chi tiết phòng
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="overflow-y-auto flex-1 pr-1">
              {isCustomer ? (
                <div className="space-y-2.5 pt-4 text-sm text-ink-muted">
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Mã phòng:</strong> <span className="font-mono text-ink font-semibold">{viewItem.code}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Mã chủ nhà:</strong> <span className="font-mono text-ink font-semibold">{viewItem.landlord_code ?? '—'}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Tòa nhà:</strong> <span className="text-ink font-bold">{viewItem.buildings?.name ?? '—'}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Tầng:</strong> <span className="text-ink font-semibold">{viewItem.floor}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Loại:</strong> <span className="text-ink font-semibold">{viewItem.room_type ?? '—'}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50">
                    <strong>Trạng thái:</strong>{' '}
                    {(() => {
                      const ds = getRoomDisplayStatus(viewItem, contracts);
                      const activeDeposit = viewItem.status === 'reserved'
                        ? depositContracts.find((c) => c.room_id === viewItem.id && c.status === 'active')
                        : null;
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`${ds.colorClass} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                            {ds.label}
                          </Badge>
                          {activeDeposit && <DepositCountdown createdAt={activeDeposit.created_at} />}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Diện tích:</strong> <span className="font-mono text-ink font-semibold">{viewItem.size ? `${viewItem.size}m²` : '—'}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Giá thuê:</strong> <span className="font-mono text-accent font-bold">{viewItem.price.toLocaleString('vi-VN')}đ</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Cấu trúc:</strong> <span className="text-ink font-semibold">{viewItem.bedrooms} PN · {viewItem.bathrooms} WC</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Ban công riêng:</strong> <span className="text-ink font-semibold">{viewItem.has_private_balcony ? 'Có' : 'Không'}</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Số người tối đa:</strong> <span className="text-ink font-semibold">{viewItem.max_occupants} người</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Số xe tối đa:</strong> <span className="text-ink font-semibold">{viewItem.max_vehicles_per_room} xe</span></div>
                  <div className="flex justify-between border-b pb-2 border-border/50"><strong>Hợp đồng tối thiểu:</strong> <span className="text-ink font-semibold">{viewItem.min_contract_months} tháng</span></div>
                  {viewItem.rose && <div className="flex justify-between border-b pb-2 border-border/50"><strong>Hoa hồng:</strong> <span className="font-bold text-emerald-600">{viewItem.rose}</span></div>}
                  {(() => {
                    const ds = getRoomDisplayStatus(viewItem, contracts);
                    return ds.expectedEmptyDate && (
                      <div className="flex justify-between border-b pb-2 border-border/50">
                        <strong>Ngày trống dự kiến:</strong>{' '}
                        <span className="font-bold text-warn">{formatDateDisplay(ds.expectedEmptyDate)}</span>
                      </div>
                    );
                  })()}
                  {viewItem.description && <div className="pt-2 text-xs text-ink-muted bg-bg-subtle/50 p-2.5 rounded-lg border border-border"><strong>Mô tả:</strong> {viewItem.description}</div>}
                </div>
              ) : (
                <Tabs defaultValue="details" className="w-full mt-4">
                  <TabsList className="grid grid-cols-2 h-9 p-0.5 bg-slate-100 rounded-lg mb-4">
                    <TabsTrigger value="details" className="text-xs font-semibold py-1.5 rounded-md">
                      Chi tiết phòng
                    </TabsTrigger>
                    <TabsTrigger value="facebook" className="text-xs font-semibold py-1.5 rounded-md">
                      Đăng bài Facebook
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="outline-none space-y-2.5 text-sm text-ink-muted">
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Mã phòng:</strong> <span className="font-mono text-ink font-semibold">{viewItem.code}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Mã chủ nhà:</strong> <span className="font-mono text-ink font-semibold">{viewItem.landlord_code ?? '—'}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Tòa nhà:</strong> <span className="text-ink font-bold">{viewItem.buildings?.name ?? '—'}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Tầng:</strong> <span className="text-ink font-semibold">{viewItem.floor}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Loại:</strong> <span className="text-ink font-semibold">{viewItem.room_type ?? '—'}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50">
                      <strong>Trạng thái:</strong>{' '}
                      {(() => {
                        const ds = getRoomDisplayStatus(viewItem, contracts);
                        const activeDeposit = viewItem.status === 'reserved'
                          ? depositContracts.find((c) => c.room_id === viewItem.id && c.status === 'active')
                          : null;
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`${ds.colorClass} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                              {ds.label}
                            </Badge>
                            {activeDeposit && <DepositCountdown createdAt={activeDeposit.created_at} />}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Diện tích:</strong> <span className="font-mono text-ink font-semibold">{viewItem.size ? `${viewItem.size}m²` : '—'}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Giá thuê:</strong> <span className="font-mono text-accent font-bold">{viewItem.price.toLocaleString('vi-VN')}đ</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Cấu trúc:</strong> <span className="text-ink font-semibold">{viewItem.bedrooms} PN · {viewItem.bathrooms} WC</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Ban công riêng:</strong> <span className="text-ink font-semibold">{viewItem.has_private_balcony ? 'Có' : 'Không'}</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Số người tối đa:</strong> <span className="text-ink font-semibold">{viewItem.max_occupants} người</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Số xe tối đa:</strong> <span className="text-ink font-semibold">{viewItem.max_vehicles_per_room} xe</span></div>
                    <div className="flex justify-between border-b pb-2 border-border/50"><strong>Hợp đồng tối thiểu:</strong> <span className="text-ink font-semibold">{viewItem.min_contract_months} tháng</span></div>
                    {viewItem.rose && <div className="flex justify-between border-b pb-2 border-border/50"><strong>Hoa hồng:</strong> <span className="font-bold text-emerald-600">{viewItem.rose}</span></div>}
                    {(() => {
                      const ds = getRoomDisplayStatus(viewItem, contracts);
                      return ds.expectedEmptyDate && (
                        <div className="flex justify-between border-b pb-2 border-border/50">
                          <strong>Ngày trống dự kiến:</strong>{' '}
                          <span className="font-bold text-warn">{formatDateDisplay(ds.expectedEmptyDate)}</span>
                        </div>
                      );
                    })()}
                    {viewItem.description && <div className="pt-2 text-xs text-ink-muted bg-bg-subtle/50 p-2.5 rounded-lg border border-border"><strong>Mô tả:</strong> {viewItem.description}</div>}
                  </TabsContent>
                  
                  <TabsContent value="facebook" className="outline-none pt-2">
                    <FacebookPostingAssistant room={viewItem} images={viewImages} />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
