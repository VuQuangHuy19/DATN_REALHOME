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
import { Pencil, Trash2, Plus, Search, Eye, DoorOpen, Loader2, AlertCircle, Image as LucideImage } from 'lucide-react';
import { useRooms, useBuildings, useRoomImages, useRentalContracts, useRoomTypesCatalog } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { addRoomImage } from '@/lib/supabase/repositories/room_images';
import type { RoomWithBuilding } from '@/lib/supabase/repositories/rooms';
import type { DBRoom } from '@/lib/supabase/types';
import { parseSoonAvailableDate, updateSoonAvailableDescription, getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';
import Link from 'next/link';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã cho thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đang giữ',
};

export function RoomListPage() {
  const { company } = useAuth();
  const { items: roomList, loading, error, add, update, remove } = useRooms(company?.id);
  const { items: buildings } = useBuildings(company?.id);
  const { items: contracts } = useRentalContracts(company?.id);
  const { items: roomTypes } = useRoomTypesCatalog(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editItem, setEditItem] = useState<RoomWithBuilding | null>(null);
  const [viewItem, setViewItem] = useState<RoomWithBuilding | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayPrice, setDisplayPrice] = useState('');

  const [selectedStatus, setSelectedStatus] = useState<string>('available');
  const [soonDate, setSoonDate] = useState<string>('');

  const [tempImages, setTempImages] = useState<{ id: string; url: string; is_thumbnail: boolean; priority: number }[]>([]);

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

  const filtered = roomList.filter((r) => {
    const buildingName = r.buildings?.name ?? '';
    const landlordCode = r.landlord_code ?? '';
    const matchesSearch = r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlordCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || r.status === filterStatus;
    return matchesSearch && matchesStatus;
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
              is_thumbnail: img.is_thumbnail,
              priority: img.priority,
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
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Căn hộ/Phòng</h1>
          <p className="text-slate-500">Quản lý căn hộ và phòng riêng lẻ</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Thêm phòng</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0 px-6 pt-6">
              <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} phòng</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-6 py-4">
            <form onSubmit={handleSave} className="space-y-4 py-1">
              <div className="grid grid-cols-4 gap-4">
                <div><Label htmlFor="code">Mã phòng</Label><Input id="code" name="code" defaultValue={editItem?.code} required /></div>
                <div>
                  <Label htmlFor="building_id">Tòa nhà</Label>
                  <select id="building_id" name="building_id" defaultValue={editItem?.building_id ?? ''} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Chọn tòa nhà</option>
                    {buildings.map((b) => <option key={b.id} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="room_type">Loại phòng</Label>
                  <select id="room_type" name="room_type" defaultValue={editItem?.room_type ?? ''} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Chọn loại</option>
                    {roomTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="floor">Tầng</Label><Input id="floor" name="floor" type="number" defaultValue={editItem?.floor} required /></div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
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
                    <option value="reserved">Đặt trước / Đang giữ</option>
                  </select>
                </div>
                <div><Label htmlFor="size">Diện tích (m²)</Label><Input id="size" name="size" type="number" defaultValue={editItem?.size ?? ''} /></div>
                <div>
                  <Label htmlFor="price">Giá (đ)</Label>
                  <Input
                    id="price"
                    type="text"
                    inputMode="numeric"
                    value={displayPrice}
                    onChange={handlePriceChange}
                    placeholder="0"
                    required
                  />
                  <input type="hidden" name="price" value={displayPrice.replace(/\./g, '')} />
                </div>
                <div>
                  <Label htmlFor="min_contract_months">Hợp đồng tối thiểu (tháng)</Label>
                  <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={editItem?.min_contract_months ?? 12} required />
                </div>
              </div>

              {selectedStatus === 'soon_available' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="soon_date">Ngày trống dự kiến</Label>
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

              <div className="grid grid-cols-5 gap-4">
                <div><Label htmlFor="bedrooms">Phòng ngủ</Label><Input id="bedrooms" name="bedrooms" type="number" defaultValue={editItem?.bedrooms} required /></div>
                <div><Label htmlFor="bathrooms">Phòng tắm</Label><Input id="bathrooms" name="bathrooms" type="number" defaultValue={editItem?.bathrooms} required /></div>
                <div>
                  <Label htmlFor="has_private_balcony">Ban công riêng</Label>
                  <select id="has_private_balcony" name="has_private_balcony" defaultValue={editItem ? String(editItem.has_private_balcony) : 'false'} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="false">Không có</option>
                    <option value="true">Có ban công riêng</option>
                  </select>
                </div>
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

              {/* Quản lý ảnh phòng trực tiếp trong Dialog Sửa hoặc Thêm */}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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

                {/* Image Upload Component inside Dialog */}
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


              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
              </Button>
            </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Tìm theo mã phòng, tòa nhà hoặc mã chủ nhà..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Tất cả trạng thái</option>
              <option value="available">Còn trống</option>
              <option value="rented">Đã cho thuê</option>
              <option value="maintenance">Bảo trì</option>
              <option value="reserved">Đang giữ</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Mã</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Mã Chủ Nhà</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Tòa nhà</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Loại</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Diện tích</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Giá</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openView(item)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-600">{item.code}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{item.landlord_code ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-800">{item.buildings?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.room_type ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.size ? `${item.size}m²` : '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.price.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const ds = getRoomDisplayStatus(item, contracts);
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${ds.colorClass}`}>
                              {ds.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openView(item)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openView(item)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-base">Phòng {item.code}</span>
                      {(() => {
                        const ds = getRoomDisplayStatus(item, contracts);
                        return (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${ds.colorClass}`}>
                            {ds.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>
                        <span className="font-medium text-slate-400">Tòa nhà:</span>{' '}
                        <span className="text-slate-700 font-semibold">{item.buildings?.name ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Mã chủ nhà:</span>{' '}
                        <span className="text-slate-700 font-semibold">{item.landlord_code ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Loại:</span>{' '}
                        <span className="text-slate-700 font-semibold">{item.room_type ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Diện tích:</span>{' '}
                        <span className="text-slate-700 font-semibold">{item.size ? `${item.size}m²` : '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-bold text-indigo-600">
                        {item.price.toLocaleString('vi-VN')}đ/tháng
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openView(item)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <DoorOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có phòng nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />Chi tiết phòng
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Mã:</span> <span className="font-mono">{viewItem.code}</span></div>
                <div><span className="text-slate-500">Mã chủ nhà:</span> <span className="font-mono">{viewItem.landlord_code ?? '—'}</span></div>
                <div><span className="text-slate-500">Tòa nhà:</span> {viewItem.buildings?.name ?? '—'}</div>
                <div><span className="text-slate-500">Tầng:</span> {viewItem.floor}</div>
                <div><span className="text-slate-500">Loại:</span> {viewItem.room_type ?? '—'}</div>
                <div>
                  <span className="text-slate-500">Trạng thái:</span>{' '}
                  {(() => {
                    const ds = getRoomDisplayStatus(viewItem, contracts);
                    return (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs border ${ds.colorClass}`}>
                        {ds.label}
                      </span>
                    );
                  })()}
                </div>
                <div><span className="text-slate-500">Diện tích:</span> {viewItem.size ? `${viewItem.size}m²` : '—'}</div>
                <div><span className="text-slate-500">Giá:</span> {viewItem.price.toLocaleString('vi-VN')}đ</div>
                <div><span className="text-slate-500">Phòng ngủ:</span> {viewItem.bedrooms}</div>
                <div><span className="text-slate-500">Phòng tắm:</span> {viewItem.bathrooms}</div>
                <div><span className="text-slate-500">Ban công riêng:</span> {viewItem.has_private_balcony ? 'Có' : 'Không'}</div>
                <div><span className="text-slate-500">Số người tối đa:</span> {viewItem.max_occupants} người</div>
                <div><span className="text-slate-500">Số xe tối đa:</span> {viewItem.max_vehicles_per_room} xe</div>
                <div><span className="text-slate-500">Hợp đồng tối thiểu:</span> {viewItem.min_contract_months} tháng</div>
              </div>
              {(() => {
                const ds = getRoomDisplayStatus(viewItem, contracts);
                return ds.expectedEmptyDate && (
                  <div className="text-sm">
                    <span className="text-slate-500">Ngày trống dự kiến:</span>{' '}
                    <span className="font-semibold text-amber-600">{formatDateDisplay(ds.expectedEmptyDate)}</span>
                  </div>
                );
              })()}
              <div className="text-sm"><span className="text-slate-500">Mô tả:</span> {viewItem.description}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
