'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { useRoomsByBuilding } from '@/src/features/rooms/hooks/useRooms';
import { useRoomImages } from '@/src/features/properties/hooks/useRoomImages';
import { useRentalContracts } from '@/src/features/finance/hooks/useContracts';;
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoom, getRoomWithBuilding, type RoomWithBuilding } from '@/src/features/rooms/services/rooms';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import type { DBRoom } from '@/lib/supabase/types';
import { FacebookPostingAssistant } from './FacebookPostingAssistant';
import { parseSoonAvailableDate, updateSoonAvailableDescription, getRoomDisplayStatus, formatDateDisplay } from '@/lib/room-status';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  available: { label: 'Còn trống', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  rented: { label: 'Đã cho thuê', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  maintenance: { label: 'Bảo trì', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: AlertCircle },
  reserved: { label: 'Đặt trước', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: CheckCircle2 },
  soon_available: { label: 'Sắp trống', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertCircle },
};

const ROOM_TYPES = ['Studio', 'Phòng trọ', '1PN', '2PN', '3PN', 'Penthouse', 'Shophouse', 'Văn phòng', 'Gác xép', 'Duplex'];

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

  const [room, setRoom] = useState<RoomWithBuilding | null>(null);
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

  const handleImageUploaded = async (urls: string | string[] | null, thumbUrls?: string | string[] | null, mediaTypes?: string | string[] | null) => {
    if (!urls || !room) return;
    const urlList = Array.isArray(urls) ? urls : [urls];
    const thumbList = Array.isArray(thumbUrls) ? thumbUrls : (thumbUrls ? [thumbUrls] : []);
    const mediaTypeList = Array.isArray(mediaTypes) ? mediaTypes : (mediaTypes ? [mediaTypes] : []);
    try {
      let currentLength = images.length;
      for (let i = 0; i < urlList.length; i++) {
        const url = urlList[i];
        const thumbnail_url = thumbList[i] || url;
        const media_type = mediaTypeList[i] || 'image';
        const isFirst = currentLength === 0;
        await addImg({
          company_id: company?.id ?? null,
          room_id: room.id,
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRoomWithBuilding(roomId)
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
    if (updated) {
      setRoom((prev) => (prev ? { ...prev, ...updated } : (updated as any)));
    }
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
    if (updated) {
      setRoom((prev) => (prev ? { ...prev, ...updated } : (updated as any)));
    }
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="border-border hover:bg-bg-subtle text-ink rounded-lg">
            <Link href={buildingUrl}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Quay lại tòa nhà
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-6 w-6 text-ink-muted" />
              <h1 className="text-2xl font-bold text-ink font-heading tracking-tight">{room.code}</h1>
              <Badge className={`${sc.bg} ${sc.color} border font-bold text-xs rounded-full`} variant="outline">
                <StatusIcon className="h-3 w-3 mr-1" />
                {ds?.label || sc.label}
              </Badge>
            </div>
            <p className="text-ink-muted text-sm mt-1">
              Tầng {room.floor} · {room.room_type ?? 'Chưa phân loại'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <PermissionGate roles={['company_admin', 'manager']}>
            <Button variant="outline" className="border-border hover:bg-bg-subtle text-ink rounded-lg" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </Button>
          </PermissionGate>
          <PermissionGate roles={['company_admin']}>
            <Button variant="destructive" className="bg-danger hover:bg-danger/90 text-white rounded-lg" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa phòng
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Maximize2, label: 'Diện tích', value: room.size ? `${room.size} m²` : '—' },
          { icon: Banknote, label: 'Giá thuê', value: `${room.price.toLocaleString('vi-VN')}đ/tháng`, class: 'text-accent font-mono font-bold' },
          { icon: BedDouble, label: 'Phòng ngủ', value: room.bedrooms },
          { icon: Bath, label: 'Phòng tắm', value: room.bathrooms },
        ].map((item) => (
          <Card key={item.label} className="border-border rounded-lg shadow-none bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-bg-subtle rounded-lg border border-border">
                  <item.icon className="h-5 w-5 text-ink-muted" />
                </div>
                <div>
                  <div className="text-xs text-ink-muted">{item.label}</div>
                  <div className={`font-bold text-ink ${item.class || ''}`}>{item.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border rounded-lg shadow-none bg-white border-t-2 border-t-accent">
          <CardHeader>
            <CardTitle className="font-heading text-base font-bold text-ink">Thông tin chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow label="Mã phòng" value={<span className="font-mono text-ink font-semibold">{room.code}</span>} />
            <InfoRow label="Tầng" value={`Tầng ${room.floor}`} />
            <InfoRow label="Loại phòng" value={room.room_type} />
            <InfoRow label="Trạng thái" value={
              <Badge className={`${sc.bg} ${sc.color} border font-bold text-xs rounded-full`} variant="outline">{ds?.label || sc.label}</Badge>
            } />
            <InfoRow label="Diện tích" value={room.size ? `${room.size} m²` : null} />
            <InfoRow label="Giá thuê" value={<span className="font-mono text-accent font-bold">{room.price.toLocaleString('vi-VN')}đ/tháng</span>} />
            <InfoRow label="Cấu trúc" value={`${room.bedrooms} PN · ${room.bathrooms} WC`} />
            <InfoRow label="Ban công riêng" value={room.has_private_balcony ? 'Có ban công riêng' : 'Không có'} />
            <InfoRow label="Số người tối đa" value={`${room.max_occupants} người`} />
            <InfoRow label="Số xe tối đa" value={`${room.max_vehicles_per_room} xe/phòng`} />
            <InfoRow label="Hợp đồng tối thiểu" value={`${room.min_contract_months} tháng`} />
            {room.description && (
              <InfoRow label="Mô tả" value={<span className="text-ink-muted text-xs leading-relaxed block text-left max-w-md">{room.description}</span>} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border rounded-lg shadow-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-bold font-heading flex items-center gap-2 text-ink">
              <LucideImage className="h-5 w-5 text-accent" />
              Ảnh phòng ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {imgError && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {imgError}
              </div>
            )}

            {imgLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
              </div>
            ) : (
              <>
                {images.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg text-ink-muted bg-bg-base/30">
                    <LucideImage className="h-8 w-8 mx-auto mb-2 opacity-35" />
                    <p className="text-xs font-semibold">Chưa có hình ảnh nào</p>
                    <p className="text-[10px] text-ink-muted mt-1 px-4">Tải lên ảnh đầu tiên để tự động đặt làm ảnh đại diện.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className={`relative group rounded-lg overflow-hidden border bg-bg-subtle aspect-video flex flex-col justify-between transition-all ${img.is_thumbnail ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-border'
                          }`}
                      >
                        <div className="relative w-full h-16 border-b border-border">
                          <Image
                            src={img.thumbnail_url || img.url}
                            alt="Room"
                            fill
                            sizes="(max-width: 768px) 50vw, 200px"
                            className="object-cover"
                          />
                        </div>
                        {img.is_thumbnail && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-amber-950 shadow-sm uppercase tracking-wider">
                            ★ Ảnh chính
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-5 w-5 bg-danger hover:bg-danger/90 text-white"
                            onClick={() => handleRemoveImage(img.id, img.url)}
                            title="Xóa ảnh"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="p-1 bg-white flex items-center justify-between text-[10px] gap-1 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-ink-muted text-[9px] font-bold uppercase tracking-tight">Ưu tiên:</span>
                            <input
                              type="number"
                              value={img.priority}
                              onChange={(e) => updatePriority(img.id, Number(e.target.value))}
                              className="w-8 h-4 border border-border rounded text-center font-mono text-[9px] text-ink"
                            />
                          </div>
                          {!img.is_thumbnail && (
                            <button
                              onClick={() => makeThumbnail(img.id)}
                              className="text-accent hover:text-accent-500 font-semibold text-[10px]"
                            >
                              Đặt chính
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <ImageUpload allowVideo={true}
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
          {!pathname.startsWith('/customer') && room && (
            <FacebookPostingAssistant room={room} images={images} />
          )}

          <PermissionGate roles={['company_admin', 'manager']}>
            <Card className="border-border rounded-lg shadow-none bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold font-heading text-ink">Đổi trạng thái nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(Object.entries(statusConfig) as [DBRoom['status'], typeof statusConfig[string]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    disabled={room.status === key}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all uppercase tracking-wider font-semibold ${room.status === key
                      ? `${cfg.bg} ${cfg.color} border-current`
                      : 'border-border hover:border-accent text-ink-muted hover:bg-bg-subtle/50'
                      }`}
                  >
                    {cfg.label}
                    {room.status === key && <span className="float-right text-[10px] lowercase text-ink font-normal font-sans">✓ Hiện tại</span>}
                  </button>
                ))}
              </CardContent>
            </Card>
          </PermissionGate>

          <Card className="border-border rounded-lg shadow-none bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold font-heading text-ink">Tòa nhà</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-border hover:bg-bg-subtle text-ink rounded-lg font-semibold text-xs">
                <Link href={buildingUrl}>
                  <Building2 className="h-4 w-4 mr-2 text-ink-muted" />
                  Xem tòa nhà
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border rounded-lg shadow-none bg-white">
            <CardHeader><CardTitle className="text-base font-bold font-heading text-ink">Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-xs text-ink-muted font-medium">
              <div>ID: <span className="font-mono text-ink font-semibold">{room.id.slice(0, 8)}…</span></div>
              <div>Tạo lúc: {room.created_at ? new Date(room.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
              {room.updated_at && (
                <div>Cập nhật: {new Date(room.updated_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-lg border border-border bg-white shadow-lg">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="font-heading text-lg font-bold text-ink">Chỉnh sửa phòng {room.code}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <form onSubmit={handleSave} className="space-y-4 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã phòng</Label>
                  <Input id="code" name="code" defaultValue={room.code} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="floor" className="text-ink font-semibold text-xs uppercase tracking-wider">Tầng</Label>
                  <Input id="floor" name="floor" type="number" defaultValue={room.floor} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại phòng</Label>
                  <select id="room_type" name="room_type" defaultValue={room.room_type ?? ''}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent">
                    <option value="">Chọn loại</option>
                    {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-ink font-semibold text-xs uppercase tracking-wider">Trạng thái</Label>
                  <select
                    id="status"
                    name="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent"
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="size" className="text-ink font-semibold text-xs uppercase tracking-wider">Diện tích (m²)</Label>
                  <Input id="size" name="size" type="number" defaultValue={room.size ?? ''} className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-ink font-semibold text-xs uppercase tracking-wider">Giá thuê (đ)</Label>
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
                  <Label htmlFor="min_contract_months" className="text-ink font-semibold text-xs uppercase tracking-wider">HĐ tối thiểu (tháng)</Label>
                  <Input id="min_contract_months" name="min_contract_months" type="number" defaultValue={room.min_contract_months ?? 12} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has_private_balcony" className="text-ink font-semibold text-xs uppercase tracking-wider">Ban công riêng</Label>
                  <select id="has_private_balcony" name="has_private_balcony" defaultValue={String(room.has_private_balcony ?? false)} className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-accent">
                    <option value="false">Không có</option>
                    <option value="true">Có ban công riêng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bedrooms" className="text-ink font-semibold text-xs uppercase tracking-wider">Phòng ngủ</Label>
                  <Input id="bedrooms" name="bedrooms" type="number" defaultValue={room.bedrooms ?? 1} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bathrooms" className="text-ink font-semibold text-xs uppercase tracking-wider">Phòng tắm</Label>
                  <Input id="bathrooms" name="bathrooms" type="number" defaultValue={room.bathrooms ?? 1} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_occupants" className="text-ink font-semibold text-xs uppercase tracking-wider">Số người tối đa</Label>
                  <Input id="max_occupants" name="max_occupants" type="number" defaultValue={room.max_occupants ?? 2} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_vehicles_per_room" className="text-ink font-semibold text-xs uppercase tracking-wider">Số xe tối đa</Label>
                  <Input id="max_vehicles_per_room" name="max_vehicles_per_room" type="number" defaultValue={room.max_vehicles_per_room ?? 2} required className="rounded-lg border-border focus-visible:ring-accent" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-ink font-semibold text-xs uppercase tracking-wider">Mô tả</Label>
                <Input id="description" name="description" defaultValue={room.description ?? ''} className="rounded-lg border-border focus-visible:ring-accent" />
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
                  <LucideImage className="h-4 w-4 text-accent" />
                  Hình ảnh phòng ({images.length})
                </Label>

                {images.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg text-ink-muted bg-bg-base/30">
                    <LucideImage className="h-5 w-5 mx-auto mb-1 opacity-45" />
                    <p className="text-xs">Chưa có hình ảnh nào cho phòng này</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto p-1 border border-border rounded-lg bg-bg-subtle/20">
                    {images.map((img) => (
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
                                name="dialog_thumbnail_radio"
                                checked={img.is_thumbnail}
                                onChange={() => makeThumbnail(img.id)}
                                className="w-3.5 h-3.5 text-amber-500 border-border focus:ring-amber-450 focus:ring-offset-0 cursor-pointer"
                              />
                              Ảnh chính
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-danger hover:text-danger hover:bg-danger/10"
                              onClick={() => handleRemoveImage(img.id, img.url)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                            <span className="font-semibold text-[10px] uppercase">Ưu tiên:</span>
                            <input
                              type="number"
                              value={img.priority}
                              onChange={(e) => updatePriority(img.id, Number(e.target.value))}
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

              <div className="flex gap-2 pt-4 border-t border-border mt-4">
                <Button type="button" variant="ghost" className="flex-1 text-ink hover:bg-bg-subtle rounded-lg" onClick={() => setIsEditOpen(false)}>Hủy</Button>
                <Button type="submit" className="flex-1 bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold" disabled={saving}>
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
