'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, Image as LucideImage } from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { DBRoom } from '@/lib/supabase/types';

interface BuildingRoomDialogProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editItem: DBRoom | null;
  handleSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  roomTypes: any[];
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  soonDate: string;
  setSoonDate: (date: string) => void;
  displayPrice: string;
  handlePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  images: any[];
  tempImages: any[];
  setTempImages: React.Dispatch<React.SetStateAction<any[]>>;
  makeThumbnail: (id: string) => void;
  updatePriority: (id: string, val: number) => void;
  handleRemoveImage: (id: string, url: string) => void;
  handleRemoveTempImage: (id: string, url: string) => void;
  handleImageUploaded: (urls: string | string[] | null, thumbUrls?: string | string[] | null, mediaTypes?: string | string[] | null) => void;
  building: any;
  saving: boolean;
}

export function BuildingRoomDialog({
  isDialogOpen,
  setIsDialogOpen,
  editItem,
  handleSave,
  roomTypes,
  selectedStatus,
  setSelectedStatus,
  soonDate,
  setSoonDate,
  displayPrice,
  handlePriceChange,
  images,
  tempImages,
  setTempImages,
  makeThumbnail,
  updatePriority,
  handleRemoveImage,
  handleRemoveTempImage,
  handleImageUploaded,
  building,
  saving,
}: BuildingRoomDialogProps) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col rounded-lg border border-border bg-white shadow-lg">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="font-heading text-lg font-bold text-ink">{editItem ? 'Chỉnh sửa' : 'Thêm'} phòng</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          <form onSubmit={handleSave} className="space-y-4 py-1">
            {/* 1. Thông tin cơ bản */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã phòng</Label>
                <Input id="code" name="code" defaultValue={editItem?.code} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="floor" className="text-ink font-semibold text-xs uppercase tracking-wider">Tầng</Label>
                <Input id="floor" name="floor" type="number" defaultValue={editItem?.floor} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="room_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại phòng</Label>
                {(() => {
                  const list = [...(roomTypes || [])];
                  if (editItem?.room_type && !list.some(t => t.name === editItem.room_type)) {
                    list.unshift({ id: 'current-' + editItem.room_type, name: editItem.room_type });
                  }
                  return (
                    <select id="room_type" name="room_type" defaultValue={editItem?.room_type ?? ''} className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent" required>
                      <option value="">Chọn loại</option>
                      {list.map((t) => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
                    </select>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-ink font-semibold text-xs uppercase tracking-wider">Trạng thái</Label>
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
                  <option value="reserved">Đặt trước</option>
                </select>
              </div>
            </div>

            {selectedStatus === 'soon_available' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="soon_date" className="text-ink font-semibold text-xs uppercase tracking-wider">Ngày trống dự kiến</Label>
                  <Input
                    id="soon_date"
                    name="soon_date"
                    type="date"
                    value={soonDate}
                    onChange={(e) => setSoonDate(e.target.value)}
                    required
                    className="rounded-lg border-border focus-visible:ring-accent"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="size" className="text-ink font-semibold text-xs uppercase tracking-wider">Diện tích (m²)</Label>
                <Input id="size" name="size" type="number" defaultValue={editItem?.size ?? ''} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bedrooms" className="text-ink font-semibold text-xs uppercase tracking-wider">Phòng ngủ</Label>
                <Input id="bedrooms" name="bedrooms" type="number" defaultValue={editItem?.bedrooms ?? 0} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bathrooms" className="text-ink font-semibold text-xs uppercase tracking-wider">Phòng tắm</Label>
                <Input id="bathrooms" name="bathrooms" type="number" defaultValue={editItem?.bathrooms ?? 0} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-ink font-semibold text-xs uppercase tracking-wider">Giá thuê (VND/tháng)</Label>
              <Input id="price" name="price" type="text" value={displayPrice} onChange={handlePriceChange} placeholder="Nhập giá thuê" required className="rounded-lg border-border focus-visible:ring-accent" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="has_private_balcony" className="text-ink font-semibold text-xs uppercase tracking-wider">Ban công riêng</Label>
                <select id="has_private_balcony" name="has_private_balcony" defaultValue={editItem ? String(editItem.has_private_balcony) : 'false'} className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent">
                  <option value="false">Không có</option>
                  <option value="true">Có ban công riêng</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min_contract_months" className="text-ink font-semibold text-xs uppercase tracking-wider">Thời hạn hợp đồng tối thiểu (tháng)</Label>
                <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={editItem?.min_contract_months ?? 12} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="max_occupants" className="text-ink font-semibold text-xs uppercase tracking-wider">Số người tối đa</Label>
                <Input id="max_occupants" name="max_occupants" type="number" defaultValue={editItem?.max_occupants ?? 2} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_vehicles_per_room" className="text-ink font-semibold text-xs uppercase tracking-wider">Số xe tối đa</Label>
                <Input id="max_vehicles_per_room" name="max_vehicles_per_room" type="number" defaultValue={editItem?.max_vehicles_per_room ?? 2} required className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-ink font-semibold text-xs uppercase tracking-wider">Mô tả</Label>
                <Input id="description" name="description" defaultValue={editItem?.description ?? ''} className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rose" className="text-ink font-semibold text-xs uppercase tracking-wider">Hoa hồng môi giới</Label>
                <Input id="rose" name="rose" defaultValue={editItem?.rose ?? ''} placeholder="Nhập hoa hồng..." className="rounded-lg border-border focus-visible:ring-accent" />
              </div>
            </div>

            {/* Quản lý ảnh phòng trực tiếp trong Dialog */}
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
                <ImageUpload
                  allowVideo={true}
                  value={null}
                  buildingId={building?.id}
                  buildingCode={building?.code}
                  buildingName={building?.name}
                  onChange={handleImageUploaded}
                  bucket="room_images"
                  multiple={true}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="ghost" className="text-ink hover:bg-bg-subtle rounded-lg" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-accent hover:bg-accent-500 text-white rounded-lg" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
