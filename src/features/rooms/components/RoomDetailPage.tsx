'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PermissionGate } from '@/components/ui/PermissionGate';
import {
  ArrowLeft, DoorOpen, Building2, Layers, Maximize2, BedDouble,
  Bath, Banknote, Pencil, Trash2, Loader2, AlertCircle, CheckCircle2,
  Image as LucideImage
} from 'lucide-react';
import { useRoomsByBuilding, useRoomImages, useRentalContracts } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoom } from '@/lib/supabase/repositories/rooms';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import type { DBRoom } from '@/lib/supabase/types';
import { parseSoonAvailableDate, updateSoonAvailableDescription, getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  available: { label: 'Còn trống', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  rented: { label: 'Đã cho thuê', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  maintenance: { label: 'Bảo trì', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: AlertCircle },
  reserved: { label: 'Đặt trước', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: CheckCircle2 },
  soon_available: { label: 'Sắp trống', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertCircle },
};

const ROOM_TYPES = ['Studio', 'Phòng trọ', '1PN', '2PN', '3PN', 'Penthouse', 'Shophouse', 'Văn phòng'];

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between py-3 border-b last:border-0">
    <span className="text-slate-500 text-sm w-32 shrink-0">{label}</span>
    <span className="text-slate-800 text-sm font-medium text-right">{value ?? '—'}</span>
  </div>
);

export function RoomDetailPage() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  const { company } = useAuth();
  const { items: contracts } = useRentalContracts(company?.id);
  const pathname = usePathname();

  const [room, setRoom] = useState<DBRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>('available');
  const [soonDate, setSoonDate] = useState<string>('');

  const backUrl = pathname.startsWith('/landlord') ? '/landlord/buildings' : '/admin/realhome/buildings';
  const buildingUrl = pathname.startsWith('/landlord') ? `/landlord/buildings/${room?.building_id}` : `/admin/realhome/buildings/${room?.building_id}`;

  const [displayPrice, setDisplayPrice] = useState<string>('');

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) { setDisplayPrice(''); return; }
    setDisplayPrice(Number(rawValue).toLocaleString('vi-VN'));
  };

  useEffect(() => {
    if (room) {
      const manualDate = parseSoonAvailableDate(room.description);
      setSelectedStatus(manualDate ? 'soon_available' : room.status);
      setSoonDate(manualDate || '');
      setDisplayPrice(room.price ? room.price.toLocaleString('vi-VN') : '');
    }
  }, [room]);

  const { update: updateRoom, remove: removeRoom } = useRoomsByBuilding(
    room?.building_id ?? undefined,
    company?.id,
  );

  const {
    images,
    loading: imgLoading,
    error: imgError,
    add: addImg,
    remove: removeImg,
    makeThumbnail,
    updatePriority
  } = useRoomImages(roomId);

  const handleImageUploaded = async (urls: string | string[] | null) => {
    if (!urls || !room) return;
    const urlList = Array.isArray(urls) ? urls : [urls];
    try {
      let currentLength = images.length;
      for (const url of urlList) {
        const isFirst = currentLength === 0;
        await addImg({
          company_id: company?.id ?? null,
          room_id: room.id,
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRoom(roomId)
      .then((data) => { if (mounted) { setRoom(data); setLoading(false); } })
      .catch((e) => { if (mounted) { setError(e.message); setLoading(false); } });
    return () => { mounted = false; };
  }, [roomId]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!room) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const statusVal = fd.get('status') as string;
    const soonDateVal = fd.get('soon_date') as string || null;
    const descVal = fd.get('description') as string || null;

    const patch = {
      code: fd.get('code') as string,
      floor: Number(fd.get('floor')),
      room_type: fd.get('room_type') as string,
      size: Number(fd.get('size')),
      price: Number(fd.get('price')),
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
    const updated = await updateRoom(room.id, patch);
    if (updated) setRoom(updated as DBRoom);
    setSaving(false);
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!room || !confirm('Bạn có chắc muốn xóa phòng này?')) return;
    await removeRoom(room.id);
    router.push(buildingUrl);
  };

  const handleStatusChange = async (newStatus: DBRoom['status']) => {
    if (!room) return;
    const updated = await updateRoom(room.id, { status: newStatus });
    if (updated) setRoom(updated as DBRoom);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-700">Không tìm thấy phòng</h1>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={backUrl}>← Quay lại danh sách tòa nhà</Link>
        </Button>
      </div>
    );
  }

  const ds = room ? getRoomDisplayStatus(room, contracts) : null;
  const sc = statusConfig[ds?.status || room.status] ?? statusConfig['available'];
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={buildingUrl}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Quay lại tòa nhà
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-6 w-6 text-slate-600" />
              <h1 className="text-2xl font-bold text-slate-800 font-mono">{room.code}</h1>
              <Badge className={`${sc.bg} ${sc.color} border`} variant="outline">
                <StatusIcon className="h-3 w-3 mr-1" />
                {ds?.label || sc.label}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Tầng {room.floor} · {room.room_type ?? 'Chưa phân loại'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <PermissionGate roles={['company_admin', 'manager']}>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </Button>
          </PermissionGate>
          <PermissionGate roles={['company_admin']}>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa phòng
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Maximize2, label: 'Diện tích', value: room.size ? `${room.size} m²` : '—' },
          { icon: Banknote, label: 'Giá thuê', value: `${room.price.toLocaleString('vi-VN')}đ/tháng` },
          { icon: BedDouble, label: 'Phòng ngủ', value: room.bedrooms },
          { icon: Bath, label: 'Phòng tắm', value: room.bathrooms },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-semibold text-slate-800">{value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Thông tin chi tiết</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Mã phòng" value={<span className="font-mono">{room.code}</span>} />
            <InfoRow label="Tầng" value={`Tầng ${room.floor}`} />
            <InfoRow label="Loại phòng" value={room.room_type} />
            <InfoRow label="Trạng thái" value={
              <Badge className={`${sc.bg} ${sc.color} border`} variant="outline">{ds?.label || sc.label}</Badge>
            } />
            <InfoRow label="Diện tích" value={room.size ? `${room.size} m²` : null} />
            <InfoRow label="Giá thuê" value={`${room.price.toLocaleString('vi-VN')}đ/tháng`} />
            <InfoRow label="Phòng ngủ" value={room.bedrooms} />
            <InfoRow label="Phòng tắm" value={room.bathrooms} />
            <InfoRow label="Ban công riêng" value={room.has_private_balcony ? 'Có ban công riêng' : 'Không có'} />
            <InfoRow label="Số người tối đa" value={`${room.max_occupants} người`} />
            <InfoRow label="Số xe tối đa" value={`${room.max_vehicles_per_room} xe/phòng`} />
            <InfoRow label="Hợp đồng tối thiểu" value={`${room.min_contract_months} tháng`} />
            {room.description && (
              <InfoRow label="Mô tả" value={room.description} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LucideImage className="h-5 w-5 text-indigo-600" />
              Bộ sưu tập ảnh phòng ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {imgError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {imgError}
              </div>
            )}

            {imgLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {images.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50/50">
                    <LucideImage className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Chưa có hình ảnh nào cho phòng này</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tải lên ảnh đầu tiên để tự động đặt làm ảnh đại diện.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className={`relative group rounded-lg overflow-hidden border bg-slate-50 aspect-video flex flex-col justify-between transition-all ${img.is_thumbnail ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                          }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt="Room"
                          className="object-cover w-full h-20 border-b border-slate-100"
                        />
                        {img.is_thumbnail && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 shadow-sm">
                            ★ Đại diện
                          </div>
                        )}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-6 w-6"
                            onClick={() => handleRemoveImage(img.id, img.url)}
                            title="Xóa ảnh"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="p-1 bg-white flex items-center justify-between text-[11px] gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[9px] font-medium uppercase">Ưu tiên:</span>
                            <input
                              type="number"
                              value={img.priority}
                              onChange={(e) => updatePriority(img.id, Number(e.target.value))}
                              className="w-8 h-4 border border-slate-200 rounded text-center font-mono text-[10px]"
                            />
                          </div>
                          {!img.is_thumbnail && (
                            <button
                              onClick={() => makeThumbnail(img.id)}
                              className="text-indigo-650 hover:text-indigo-850 font-semibold"
                            >
                              Đại diện
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <ImageUpload
                    value={null}
                    onChange={handleImageUploaded}
                    bucket="room_images"
                    multiple={true}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <PermissionGate roles={['company_admin', 'manager']}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Đổi trạng thái nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(Object.entries(statusConfig) as [DBRoom['status'], typeof statusConfig[string]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    disabled={room.status === key}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-all ${room.status === key
                      ? `${cfg.bg} ${cfg.color} border-current font-medium`
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {cfg.label}
                    {room.status === key && <span className="float-right text-xs">✓ Hiện tại</span>}
                  </button>
                ))}
              </CardContent>
            </Card>
          </PermissionGate>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tòa nhà</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={buildingUrl}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Xem tòa nhà
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs text-slate-500">
              <div>ID: <span className="font-mono text-slate-700">{room.id.slice(0, 8)}…</span></div>
              <div>Tạo lúc: {new Date(room.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              {room.updated_at && (
                <div>Cập nhật: {new Date(room.updated_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[70vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle>Chỉnh sửa phòng {room.code}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <form onSubmit={handleSave} className="space-y-4 py-1">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="code">Mã phòng</Label>
                  <Input id="code" name="code" defaultValue={room.code} required />
                </div>
                <div>
                  <Label htmlFor="floor">Tầng</Label>
                  <Input id="floor" name="floor" type="number" defaultValue={room.floor} required />
                </div>
                <div>
                  <Label htmlFor="room_type">Loại phòng</Label>
                  <select id="room_type" name="room_type" defaultValue={room.room_type ?? ''}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Chọn loại</option>
                    {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="size">Diện tích (m²)</Label>
                  <Input id="size" name="size" type="number" defaultValue={room.size ?? ''} />
                </div>
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
                  <Label htmlFor="min_contract_months">HĐ tối thiểu (tháng)</Label>
                  <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={room.min_contract_months} required />
                </div>
                <div>
                  <Label htmlFor="has_private_balcony">Ban công riêng</Label>
                  <select id="has_private_balcony" name="has_private_balcony" defaultValue={String(room.has_private_balcony)} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="false">Không có</option>
                    <option value="true">Có ban công riêng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Phòng ngủ</Label>
                  <Input id="bedrooms" name="bedrooms" type="number" defaultValue={room.bedrooms} required />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Phòng tắm</Label>
                  <Input id="bathrooms" name="bathrooms" type="number" defaultValue={room.bathrooms} required />
                </div>
                <div>
                  <Label htmlFor="max_occupants">Số người tối đa</Label>
                  <Input id="max_occupants" name="max_occupants" type="number" defaultValue={room.max_occupants} required />
                </div>
                <div>
                  <Label htmlFor="max_vehicles_per_room">Số xe tối đa</Label>
                  <Input id="max_vehicles_per_room" name="max_vehicles_per_room" type="number" defaultValue={room.max_vehicles_per_room} required />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Input id="description" name="description" defaultValue={room.description ?? ''} />
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <LucideImage className="h-4 w-4 text-indigo-600" />
                  Hình ảnh phòng ({images.length})
                </Label>

                {images.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50/50">
                    <LucideImage className="h-5 w-5 mx-auto mb-1 opacity-45" />
                    <p className="text-xs">Chưa có hình ảnh nào cho phòng này</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto p-1 border rounded-lg bg-slate-50/30">
                    {images.map((img) => (
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
                                name="dialog_thumbnail_radio"
                                checked={img.is_thumbnail}
                                onChange={() => makeThumbnail(img.id)}
                                className="w-3.5 h-3.5 text-amber-500 border-slate-300 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
                              />
                              Ảnh chính
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveImage(img.id, img.url)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400 font-medium">Ưu tiên:</span>
                            <input
                              type="number"
                              value={img.priority}
                              onChange={(e) => updatePriority(img.id, Number(e.target.value))}
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

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsEditOpen(false)}>Hủy</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
