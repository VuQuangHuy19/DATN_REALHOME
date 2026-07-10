'use client';

import { useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { Pencil, Plus, Eye, ArrowLeft, Building2, MapPin, Calendar, Layers, Loader2, AlertCircle, Trash2, DollarSign, Image as LucideImage } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePropertiesFeature } from '../hooks/usePropertiesFeature';
import { useRoomsFeature } from '@/src/features/rooms/hooks/useRoomsFeature';
import { useRoomImages, useRentalContracts, useRoomTypesCatalog, useDepositContracts } from '@/lib/hooks/useEntities';
import { DepositCountdown } from '@/components/ui/DepositCountdown';
import { getRoomImages, addRoomImage } from '@/lib/supabase/repositories/room_images';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { DBRoom } from '@/lib/supabase/types';
import { parseSoonAvailableDate, updateSoonAvailableDescription, getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã cho thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đặt trước',
};

const statusColor = (status: string) => {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-700 border-green-200';
    case 'rented': return 'bg-red-100 text-red-700 border-red-200';
    case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'reserved': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.id as string;
  const { company, role } = useAuth();
  const pathname = usePathname();
  const { items: buildingList, loading: buildingLoading } = usePropertiesFeature(company?.id);
  const building = useMemo(() => buildingList.find((b) => b.id === buildingId), [buildingList, buildingId]);
  const { items: roomList, loading: roomLoading, error: roomError, add: addRoom, update: updateRoom, remove: removeRoom } = useRoomsFeature(building?.code, company?.id);
  const { items: contracts } = useRentalContracts(company?.id);
  const { items: depositContracts } = useDepositContracts(company?.id);
  const { items: roomTypes } = useRoomTypesCatalog(company?.id);
  const landlordCode = building?.landlord_id ?? null;

  const [editItem, setEditItem] = useState<DBRoom | null>(null);
  const [viewItem, setViewItem] = useState<DBRoom | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayPrice, setDisplayPrice] = useState('');

  const [selectedStatus, setSelectedStatus] = useState<string>('available');
  const [soonDate, setSoonDate] = useState<string>('');

  const [tempImages, setTempImages] = useState<{ id: string; url: string; is_thumbnail: boolean; priority: number }[]>([]);
  const [duplicateConfig, setDuplicateConfig] = useState<{
    type: 'floor' | 'room';
    sourceFloor?: number;
    sourceRoom?: DBRoom;
    targetFloor: string;
    newRoomCode?: string;
  } | null>(null);
  const [isDupOpen, setIsDupOpen] = useState(false);

  const {
    images,
    loading: imgLoading,
    add: addImg,
    remove: removeImg,
    makeThumbnail,
    updatePriority
  } = useRoomImages(editItem?.id);

  const handleImageUploaded = async (urls: string | string[] | null) => {
    if (!urls) return;
    const urlList = Array.isArray(urls) ? urls : [urls];

    if (editItem) {
      try {
        let currentLength = images.length;
        for (const url of urlList) {
          const isFirst = currentLength === 0;
          await addImg({
            company_id: company?.id ?? null,
            room_id: editItem.id,
            url,
            is_thumbnail: isFirst,
            priority: currentLength,
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
        const newItems = urlList.map((url) => {
          const isFirst = currentLength === 0;
          const item = {
            id: Math.random().toString(),
            url,
            is_thumbnail: isFirst,
            priority: currentLength,
          };
          currentLength++;
          return item;
        });
        return [...prev, ...newItems];
      });
      toast.success('Tải ảnh phòng lên thành công');
    }
  };

  const handleRemoveImage = async (imgId: string, url: string) => {
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    try {
      const urlParts = url.split(`/storage/v1/object/public/room_images/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabase.storage.from('room_images').remove([filePath]);
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
        await supabase.storage.from('room_images').remove([filePath]);
      }
      setTempImages((prev) => prev.filter((img) => img.id !== imgId));
      toast.success('Đã xóa hình ảnh phòng');
    } catch {
      toast.error('Không thể xóa hình ảnh');
    }
  };

  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, DBRoom[]> = {};
    roomList.forEach((room) => {
      if (role === 'sales_agent' && room.status === 'rented') {
        return;
      }
      if (!grouped[room.floor]) grouped[room.floor] = [];
      grouped[room.floor].push(room);
    });
    return Object.entries(grouped).sort((a, b) => Number(a[0]) - Number(b[0])).map(([floor, rooms]) => ({ floor: Number(floor), rooms }));
  }, [roomList, role]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa phòng này?')) return;
    await removeRoom(id);
  };

  const duplicateRoom = async (room: DBRoom, targetFloor?: number, customCode?: string) => {
    const newFloor = targetFloor !== undefined ? targetFloor : room.floor;
    let newCode = customCode;
    if (!newCode) {
      if (targetFloor !== undefined && targetFloor !== room.floor) {
        const oldFloorStr = String(room.floor);
        const newFloorStr = String(targetFloor);
        if (room.code.includes(oldFloorStr)) {
          newCode = room.code.replace(oldFloorStr, newFloorStr);
        } else {
          newCode = `${room.code}-${newFloorStr}`;
        }
      } else {
        newCode = `${room.code}-B`;
      }
    }

    const payload = {
      code: newCode,
      building_id: building?.code || '',
      landlord_id: landlordCode,
      company_id: company?.id ?? null,
      floor: newFloor,
      room_type: room.room_type,
      size: room.size,
      price: room.price,
      status: 'available' as any,
      bedrooms: room.bedrooms,
      bathrooms: room.bathrooms,
      description: room.description,
      has_private_balcony: room.has_private_balcony,
      max_occupants: room.max_occupants,
      max_vehicles_per_room: room.max_vehicles_per_room,
      min_contract_months: room.min_contract_months,
    };

    const createdRoom = await addRoom(payload);
    if (!createdRoom) return null;

    try {
      const srcImages = await getRoomImages(room.id);
      for (const img of srcImages) {
        await addRoomImage({
          company_id: img.company_id,
          room_id: createdRoom.id,
          url: img.url,
          is_thumbnail: img.is_thumbnail,
          priority: img.priority,
        });
      }
    } catch (err) {
      console.error('Lỗi sao chép hình ảnh phòng:', err);
    }
    return createdRoom;
  };

  const handleDuplicateRoomAction = (room: DBRoom) => {
    setDuplicateConfig({
      type: 'room',
      sourceRoom: room,
      targetFloor: String(room.floor),
      newRoomCode: `${room.code}-B`,
    });
    setIsDupOpen(true);
  };

  const handleDuplicateFloor = (sourceFloor: number) => {
    setDuplicateConfig({
      type: 'floor',
      sourceFloor,
      targetFloor: String(sourceFloor + 1),
    });
    setIsDupOpen(true);
  };

  const handleExecuteDuplicate = async () => {
    if (!duplicateConfig) return;
    const targetFloor = Number(duplicateConfig.targetFloor);
    if (isNaN(targetFloor) || targetFloor <= 0) {
      toast.error('Số tầng mới không hợp lệ!');
      return;
    }

    setSaving(true);
    try {
      if (duplicateConfig.type === 'floor') {
        const roomsToCopy = roomList.filter(r => r.floor === duplicateConfig.sourceFloor);
        for (const room of roomsToCopy) {
          await duplicateRoom(room, targetFloor);
        }
        toast.success(`Đã nhân bản thành công toàn bộ phòng từ Tầng ${duplicateConfig.sourceFloor} sang Tầng ${targetFloor}!`);
      } else {
        const room = duplicateConfig.sourceRoom;
        if (!room) return;
        const code = duplicateConfig.newRoomCode?.trim();
        if (!code) {
          toast.error('Mã phòng mới không được để trống!');
          return;
        }
        const newRoom = await duplicateRoom(room, targetFloor, code);
        if (newRoom) {
          toast.success(`Đã nhân bản phòng ${room.code} thành ${newRoom.code} thành công!`);
        } else {
          toast.error('Nhân bản phòng thất bại.');
        }
      }
      setIsDupOpen(false);
    } catch (e: any) {
      toast.error(`Lỗi khi nhân bản: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFloor = async (floor: number, rooms: DBRoom[]) => {
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ (${rooms.length}) phòng thuộc Tầng ${floor}? Việc này sẽ xóa vĩnh viễn các phòng này và không thể phục hồi!`)) {
      return;
    }

    setSaving(true);
    try {
      for (const room of rooms) {
        await removeRoom(room.id);
      }
      toast.success(`Đã xóa thành công toàn bộ phòng ở Tầng ${floor}!`);
    } catch (e: any) {
      toast.error(`Lỗi khi xóa tầng: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    const statusVal = fd.get('status') as string;
    const soonDateVal = fd.get('soon_date') as string || null;
    const descVal = (fd.get('description') as string) || null;

    const payload = {
      code: fd.get('code') as string,
      building_id: building?.code || '',
      landlord_id: landlordCode,
      company_id: company?.id ?? null,
      floor: Number(fd.get('floor')),
      room_type: fd.get('room_type') as string,
      size: Number(fd.get('size')),
      price: Number(String(fd.get('price')).replace(/\D/g, '')),
      status: (statusVal === 'soon_available' ? 'rented' : statusVal) as DBRoom['status'],
      bedrooms: Number(fd.get('bedrooms')),
      bathrooms: Number(fd.get('bathrooms')),
      description: statusVal === 'soon_available'
        ? updateSoonAvailableDescription(descVal, soonDateVal)
        : updateSoonAvailableDescription(descVal, null),
      has_private_balcony: fd.get('has_private_balcony') === 'true',
      max_occupants: Number(fd.get('max_occupants')) || 2,
      max_vehicles_per_room: Number(fd.get('max_vehicles_per_room')) || 2,
      min_contract_months: Number(fd.get('min_contract_months')) || 12,
    };

    if (editItem) {
      await updateRoom(editItem.id, payload);
    } else {
      const newRoom = await addRoom(payload);
      if (newRoom && tempImages.length > 0) {
        try {
          for (const img of tempImages) {
            await addRoomImage({
              company_id: company?.id ?? null,
              room_id: newRoom.id,
              url: img.url,
              is_thumbnail: img.is_thumbnail,
              priority: img.priority,
            });
          }
        } catch (err) {
          console.error('Lỗi lưu hình ảnh phòng:', err);
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
  const openEdit = (item: DBRoom) => {
    setEditItem(item);
    setTempImages([]);
    setDisplayPrice(item.price ? item.price.toLocaleString('vi-VN') : '');
    const manualDate = parseSoonAvailableDate(item.description);
    setSelectedStatus(manualDate ? 'soon_available' : item.status);
    setSoonDate(manualDate || '');
    setIsDialogOpen(true);
  };
  const openView = (item: DBRoom) => {
    setViewItem(item);
    setIsViewOpen(true);
  };

  if (buildingLoading) {
    return <div className="flex justify-center items-center py-24"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  if (!building) {
    return <div className="text-center py-16"><h1 className="text-2xl font-bold text-slate-800">Không tìm thấy tòa nhà</h1><Button asChild className="mt-4"><Link href="/admin/realhome/buildings"><ArrowLeft className="h-4 w-4 mr-2" />Quay lại danh sách</Link></Button></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild><Link href="/admin/realhome/buildings"><ArrowLeft className="h-4 w-4 mr-1" />Quay lại</Link></Button>
          <div><h1 className="text-2xl font-bold text-slate-800">{building.name}</h1><p className="text-slate-500 text-sm">{building.code} — {building.address}</p></div>
        </div>
        <PermissionGate roles={['company_admin', 'manager']}>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Thêm phòng</Button>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0 px-6 pt-6">
                <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} phòng</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 px-6 py-4">
              <form onSubmit={handleSave} className="space-y-4 py-1">
                {/* 1. Thông tin cơ bản */}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="code">Mã phòng</Label><Input id="code" name="code" defaultValue={editItem?.code} required /></div>
                  <div><Label htmlFor="floor">Tầng</Label><Input id="floor" name="floor" type="number" defaultValue={editItem?.floor} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="room_type">Loại phòng</Label>
                    <select id="room_type" name="room_type" defaultValue={editItem?.room_type ?? ''} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                      <option value="">Chọn loại</option>
                      {roomTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="status">Trạng thái</Label>
                    <select
                      id="status"
                      name="status"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="available">Còn trống</option>
                      <option value="soon_available">Sắp trống</option>
                      <option value="rented">Đã cho thuê</option>
                      <option value="maintenance">Bảo trì</option>
                      <option value="reserved">Đặt trước</option>
                    </select>
                  </div>
                </div>

                {selectedStatus === 'soon_available' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label htmlFor="soon_date">Ngày trống dự kiến</Label>
                      <Input
                        id="soon_date"
                        name="soon_date"
                        type="date"
                        value={soonDate}
                        onChange={(e) => setSoonDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div><Label htmlFor="size">Diện tích (m²)</Label><Input id="size" name="size" type="number" defaultValue={editItem?.size ?? ''} required /></div>
                  <div><Label htmlFor="bedrooms">Phòng ngủ</Label><Input id="bedrooms" name="bedrooms" type="number" defaultValue={editItem?.bedrooms ?? 0} required /></div>
                  <div><Label htmlFor="bathrooms">Phòng tắm</Label><Input id="bathrooms" name="bathrooms" type="number" defaultValue={editItem?.bathrooms ?? 0} required /></div>
                </div>
                <div>
                  <Label htmlFor="price">Giá thuê (VND/tháng)</Label>
                  <Input id="price" name="price" type="text" value={displayPrice} onChange={handlePriceChange} placeholder="Nhập giá thuê" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="has_private_balcony">Ban công riêng</Label>
                    <select id="has_private_balcony" name="has_private_balcony" defaultValue={editItem ? String(editItem.has_private_balcony) : 'false'} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="false">Không có</option>
                      <option value="true">Có ban công riêng</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="min_contract_months">Thời hạn hợp đồng tối thiểu (tháng)</Label>
                    <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={editItem?.min_contract_months ?? 12} required />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_occupants">Số người tối đa</Label>
                    <Input id="max_occupants" name="max_occupants" type="number" defaultValue={editItem?.max_occupants ?? 2} required />
                  </div>
                  <div>
                    <Label htmlFor="max_vehicles_per_room">Số xe tối đa</Label>
                    <Input id="max_vehicles_per_room" name="max_vehicles_per_room" type="number" defaultValue={editItem?.max_vehicles_per_room ?? 2} required />
                  </div>
                </div>

                <div><Label htmlFor="description">Mô tả</Label><Input id="description" name="description" defaultValue={editItem?.description ?? ''} /></div>

                {/* Quản lý ảnh phòng trực tiếp trong Dialog */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <LucideImage className="h-4 w-4 text-indigo-600" />
                    Hình ảnh phòng ({(editItem ? images : tempImages).length})
                  </Label>

                  {(editItem ? images : tempImages).length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50/50">
                      <LucideImage className="h-5 w-5 mx-auto mb-1 opacity-45" />
                      <p className="text-xs">Chưa có hình ảnh nào cho phòng này</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto p-1 border rounded-lg bg-slate-50/30">
                      {(editItem ? images : tempImages).map((img) => (
                        <div
                          key={img.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border bg-white shadow-sm transition-all ${img.is_thumbnail ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'
                            }`}
                        >
                          <img
                            src={img.url}
                            alt="Room preview"
                            className="object-cover w-14 h-10 rounded border border-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 select-none">
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
                                  className="w-3.5 h-3.5 text-amber-500 border-slate-300 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
                                />
                                Ảnh chính
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50"
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
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400 font-medium">Ưu tiên:</span>
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
                                className="w-10 h-5 border border-slate-200 rounded text-center font-mono text-[10px]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1">
                    <ImageUpload
                      value={null}
                      onChange={handleImageUploaded}
                      bucket="room_images"
                      multiple={true}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu
                  </Button>
                </div>
              </form>
              </div>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {roomError && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="h-4 w-4 flex-shrink-0" />{roomError}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Thông tin tòa nhà</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b">
              <div className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 flex-shrink-0" />{building.address}</div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar className="h-4 w-4 flex-shrink-0" />Năm xây dựng: {building.year_built ?? '—'}</div>
              <div className="flex items-center gap-2 text-slate-600"><Layers className="h-4 w-4 flex-shrink-0" />Tổng số phòng: {building.total_rooms}</div>
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 block uppercase">Tiện ích & Quy định tòa nhà</span>
              <div className="flex flex-wrap gap-2">
                <Badge variant={building.has_elevator ? 'default' : 'secondary'} className="text-xs">
                  Thang máy: {building.has_elevator ? 'Có' : 'Không'}
                </Badge>
                <Badge variant={building.pccc_certified ? 'default' : 'destructive'} className="text-xs">
                  PCCC: {building.pccc_certified ? 'Đảm bảo' : 'Chưa hoàn thiện'}
                </Badge>
                <Badge variant={building.allow_pet ? 'outline' : 'secondary'} className="text-xs">
                  Nuôi Pet: {building.allow_pet ? 'Có' : 'Không'}
                </Badge>
                <Badge variant={building.allow_foreigners ? 'outline' : 'secondary'} className="text-xs">
                  Khách nước ngoài: {building.allow_foreigners ? 'Cho phép' : 'Không'}
                </Badge>
                <Badge variant={building.allow_vinfast_electric ? 'default' : 'secondary'} className="text-xs">
                  Sạc xe điện VinFast: {building.allow_vinfast_electric ? 'Nhận' : 'Cấm'}
                </Badge>
              </div>
              {building.common_drying_area && (
                <div className="mt-2 text-xs text-slate-600 p-2 bg-slate-50 border rounded">
                  <strong>Chỗ phơi đồ chung:</strong> {building.common_drying_area}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cấu hình biểu phí dịch vụ tòa nhà */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-800">
              <DollarSign className="h-4.5 w-4.5 text-emerald-600" />Biểu phí dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="border rounded-md overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="p-2 font-medium">Dịch vụ</th>
                    <th className="p-2 font-medium">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium">Giá điện</td>
                    <td className="p-2 text-emerald-600 font-semibold">{Number(building.electricity_price ?? 4000).toLocaleString('vi-VN')}đ/kWh</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium">Giá nước</td>
                    <td className="p-2 text-emerald-600 font-semibold">{Number(building.water_price ?? 35000).toLocaleString('vi-VN')}đ/m³</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium">Internet</td>
                    <td className="p-2 text-emerald-600 font-semibold">{Number(building.internet_price ?? 100000).toLocaleString('vi-VN')}đ/phòng</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium">Dịch vụ chung</td>
                    <td className="p-2 text-emerald-600 font-semibold">{Number(building.common_service_price ?? 200000).toLocaleString('vi-VN')}đ/người</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium">Phí xe điện</td>
                    <td className="p-2 text-emerald-600 font-semibold">{Number(building.electric_vehicle_fee ?? 0).toLocaleString('vi-VN')}đ/xe</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {building.common_service_description && (
              <p className="text-[11px] text-slate-500 mt-2 px-1">
                * Dịch vụ chung: {building.common_service_description}
              </p>
            )}
            {building.fingerprint_lock_desc && (
              <p className="text-[11px] text-slate-500 mt-1 px-1">
                * {building.fingerprint_lock_desc}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {roomsByFloor.map(({ floor, rooms }) => (
          <Card key={floor}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Tầng {floor}</CardTitle>
              <PermissionGate roles={['company_admin', 'manager']}>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDuplicateFloor(floor)}>
                    Nhân bản tầng {floor}
                  </Button>
                  <PermissionGate roles={['company_admin']}>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteFloor(floor, rooms)}>
                      Xóa tầng {floor}
                    </Button>
                  </PermissionGate>
                </div>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rooms.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800">{item.code}</div>
                        <div className="text-sm text-slate-500">{item.room_type}</div>
                      </div>
                      {(() => {
                        const ds = getRoomDisplayStatus(item, contracts);
                        const activeDeposit = item.status === 'reserved'
                          ? depositContracts.find((c) => c.room_id === item.id && c.status === 'active')
                          : null;
                        return (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge className={`${ds.colorClass} border`} variant="outline">{ds.label}</Badge>
                            {activeDeposit && <DepositCountdown createdAt={activeDeposit.created_at} />}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 text-sm text-slate-600 space-y-1">
                      <div>Giá: {item.price?.toLocaleString('vi-VN')}đ</div>
                      <div>Diện tích: {item.size} m²</div>
                      <div>Phòng ngủ: {item.bedrooms} · Phòng tắm: {item.bathrooms}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openView(item)}><Eye className="h-4 w-4 mr-1" />Xem</Button>
                      <PermissionGate roles={['company_admin', 'manager']}>
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="h-4 w-4 mr-1" />Sửa</Button>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleDuplicateRoomAction(item)}>
                          Nhân bản
                        </Button>
                      </PermissionGate>
                      <PermissionGate roles={['company_admin']}>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 mr-1" />Xóa</Button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết phòng</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-2 text-sm text-slate-600">
              <div><strong>Mã phòng:</strong> {viewItem.code}</div>
              <div><strong>Loại phòng:</strong> {viewItem.room_type}</div>
              <div><strong>Giá:</strong> {viewItem.price?.toLocaleString('vi-VN')}đ</div>
              <div><strong>Diện tích:</strong> {viewItem.size} m²</div>
              {(() => {
                const ds = getRoomDisplayStatus(viewItem, contracts);
                return (
                  <>
                    <div><strong>Trạng thái:</strong> <Badge className={`${ds.colorClass} border`} variant="outline">{ds.label}</Badge></div>
                    {ds.expectedEmptyDate && (
                      <div><strong>Ngày trống dự kiến:</strong> <span className="font-semibold text-amber-600">{formatDateDisplay(ds.expectedEmptyDate)}</span></div>
                    )}
                  </>
                );
              })()}
              <div><strong>Ban công riêng:</strong> {viewItem.has_private_balcony ? 'Có' : 'Không'}</div>
              <div><strong>Số người tối đa:</strong> {viewItem.max_occupants} người</div>
              <div><strong>Số xe tối đa:</strong> {viewItem.max_vehicles_per_room} xe</div>
              <div><strong>Hợp đồng tối thiểu:</strong> {viewItem.min_contract_months} tháng</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nhân bản Tầng / Phòng */}
      <Dialog open={isDupOpen} onOpenChange={setIsDupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {duplicateConfig?.type === 'floor' 
                ? `Nhân bản toàn bộ Tầng ${duplicateConfig.sourceFloor}` 
                : `Nhân bản phòng ${duplicateConfig?.sourceRoom?.code}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {duplicateConfig?.type === 'floor' ? (
              <div className="space-y-2">
                <Label htmlFor="dup_target_floor">Nhân bản đến Tầng (Số tầng mới)</Label>
                <Input
                  id="dup_target_floor"
                  type="number"
                  placeholder="Ví dụ: 2"
                  value={duplicateConfig.targetFloor}
                  onChange={(e) => setDuplicateConfig(prev => prev ? { ...prev, targetFloor: e.target.value } : null)}
                />
                <p className="text-xs text-slate-500">
                  Toàn bộ các phòng ở Tầng {duplicateConfig.sourceFloor} sẽ được sao chép sang tầng mới. Mã phòng mới sẽ tự động đổi đầu số tầng tương ứng.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="dup_room_target_floor">Nhân bản đến Tầng</Label>
                  <Input
                    id="dup_room_target_floor"
                    type="number"
                    value={duplicateConfig?.targetFloor ?? ''}
                    onChange={(e) => {
                      const newFloorVal = e.target.value;
                      setDuplicateConfig(prev => {
                        if (!prev || !prev.sourceRoom) return null;
                        const targetFloorNum = Number(newFloorVal);
                        let calculatedCode = prev.newRoomCode;
                        if (!isNaN(targetFloorNum) && targetFloorNum > 0) {
                          const oldFloorStr = String(prev.sourceRoom.floor);
                          const newFloorStr = String(targetFloorNum);
                          if (prev.sourceRoom.code.includes(oldFloorStr)) {
                            calculatedCode = prev.sourceRoom.code.replace(oldFloorStr, newFloorStr);
                          } else {
                            calculatedCode = `${prev.sourceRoom.code}-${newFloorStr}`;
                          }
                        } else {
                          calculatedCode = `${prev.sourceRoom.code}-B`;
                        }
                        return { ...prev, targetFloor: newFloorVal, newRoomCode: calculatedCode };
                      });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="dup_new_room_code">Mã phòng mới</Label>
                  <Input
                    id="dup_new_room_code"
                    type="text"
                    value={duplicateConfig?.newRoomCode ?? ''}
                    onChange={(e) => setDuplicateConfig(prev => prev ? { ...prev, newRoomCode: e.target.value } : null)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsDupOpen(false)}>Hủy</Button>
              <Button type="button" disabled={saving} onClick={handleExecuteDuplicate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Thực hiện nhân bản
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
