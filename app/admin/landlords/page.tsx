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
import { Pencil, Trash2, Plus, Search, Phone, User, Building2, MapPin, Layers, Loader2, AlertCircle, Mail } from 'lucide-react';
import { useLandlords, useBuildings } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';
import type { DBLandlord, DBBuilding } from '@/lib/supabase/types';

export default function LandlordsPage() {
  const { company } = useAuth();
  const { items: landlordList, loading, error, add, update, remove, refetch } = useLandlords(company?.id);
  const { items: buildings } = useBuildings(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState<DBLandlord | null>(null);
  const [selectedLandlord, setSelectedLandlord] = useState<DBLandlord | null>(null);
  const [isBuildingsOpen, setIsBuildingsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const filtered = landlordList.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone ?? '').includes(searchQuery) ||
    (l.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLandlordBuildings = (landlordId: string): DBBuilding[] =>
    buildings.filter((b) => b.landlord_id === landlordId);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      code: formData.get('code') as string || null,
      address: formData.get('address') as string || null,
      properties_count: editItem?.properties_count || 0,
      notes: formData.get('notes') as string || null,
      image_url: imageUrl,
    };
    if (editItem) {
      await update(editItem.id, payload);
    } else {
      // Gọi trực tiếp API để lấy phản hồi emailSent/emailError
      try {
        const res = await fetch('/api/landlords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!res.ok) {
          toast.error(resData.error || 'Không thể tạo chủ nhà');
        } else {
          // Cập nhật danh sách qua refetch thay vì add()
          if (resData.data) {
            await refetch();
          }
          const emailAddress = payload.email;
          if (resData.emailSent) {
            toast.success('Tạo chủ nhà thành công!', {
              description: `Email kích hoạt đã gửi đến ${emailAddress}`,
              icon: <Mail className="h-4 w-4" />,
              duration: 6000,
            });
          } else if (emailAddress) {
            toast.warning('Tạo chủ nhà thành công, nhưng gửi email thất bại!', {
              description: resData.emailError || 'Kiểm tra lại cấu hình MAILJET_API_KEY / MAILJET_API_SECRET',
              duration: 8000,
            });
          } else {
            toast.success('Tạo chủ nhà thành công!');
          }
        }
      } catch (err: any) {
        toast.error(err.message || 'Lỗi kết nối máy chủ');
      }
    }
    setSaving(false);
    setIsDialogOpen(false);
    setEditItem(null);
  };

  const openAdd = () => {
    setEditItem(null);
    setImageUrl(null);
    setIsDialogOpen(true);
  };
  const openEdit = (item: DBLandlord) => {
    setEditItem(item);
    setImageUrl(item.image_url || null);
    setIsDialogOpen(true);
  };
  const openBuildings = (item: DBLandlord) => { setSelectedLandlord(item); setIsBuildingsOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Quản lý Chủ nhà</h1>
          <p className="text-ink-muted text-sm">Quản lý chủ sở hữu bất động sản và danh sách tòa nhà</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-accent hover:bg-accent-500 text-white rounded-lg">
              <Plus className="h-4 w-4 mr-2" />Thêm chủ nhà
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg rounded-lg border border-border bg-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg text-ink font-bold">
                {editItem ? 'Chỉnh sửa' : 'Thêm'} chủ nhà
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên</Label>
                  <Input id="name" name="name" defaultValue={editItem?.name} required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại</Label>
                  <Input id="phone" name="phone" defaultValue={editItem?.phone ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-ink font-semibold text-xs uppercase tracking-wider">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
                <div>
                  <Label htmlFor="code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã Chủ Nhà</Label>
                  <Input id="code" name="code" defaultValue={editItem?.code ?? ''} placeholder="Ví dụ: DH01" required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
              </div>
              <div>
                <Label htmlFor="address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
                <Input id="address" name="address" defaultValue={editItem?.address ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
              <div>
                <Label htmlFor="notes" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
                <Input id="notes" name="notes" defaultValue={editItem?.notes ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
              <div className="space-y-2">
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh chủ nhà</Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="landlords" />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg mt-2" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <Card className="border-border rounded-lg shadow-none bg-white">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input placeholder="Tìm theo tên, SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-lg border-border focus-visible:ring-accent" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Họ tên</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Tòa nhà sở hữu</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filtered.map((item) => {
                    const ownedBuildings = getLandlordBuildings(item.id);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          openBuildings(item);
                        }}
                      >
                        <td className="px-6 py-4 font-mono font-medium text-ink-muted text-xs">{item.code ?? '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt={item.name} className="h-8 w-8 rounded-full object-cover flex-shrink-0 border border-border" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-bg-subtle flex items-center justify-center flex-shrink-0 border border-border">
                                <User className="h-4 w-4 text-ink-muted" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-ink text-sm">{item.name}</div>
                              {item.notes && <div className="text-xs text-ink-muted truncate max-w-[180px]">{item.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-ink-muted font-mono text-xs">{item.phone ?? '—'}</td>
                        <td className="px-6 py-4 text-ink-muted text-sm">{item.email ?? '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-ink-muted" />
                            <span className="text-ink font-semibold text-sm">{ownedBuildings.length}</span>
                            {ownedBuildings.length > 0 && (
                              <span className="text-ink-muted text-xs max-w-[150px] truncate">
                                ({ownedBuildings.slice(0, 2).map((b) => b.name).join(', ')}{ownedBuildings.length > 2 ? '...' : ''})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle rounded-md"
                              onClick={() => openEdit(item)}
                              title="Chỉnh sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-md"
                              onClick={() => remove(item.id)}
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-ink-muted bg-white">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-35" />
                  <p className="text-sm">Chưa có chủ nhà nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBuildingsOpen} onOpenChange={setIsBuildingsOpen}>
        <DialogContent className="max-w-2xl rounded-lg border border-border bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg text-ink font-bold">
              {selectedLandlord?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedLandlord.image_url} alt={selectedLandlord.name} className="h-6 w-6 rounded-full object-cover border border-border" />
              ) : (
                <User className="h-5 w-5 text-ink-muted" />
              )}
              {selectedLandlord?.name} {selectedLandlord?.code ? `(${selectedLandlord.code})` : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedLandlord && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-3 p-4 bg-bg-subtle/50 border border-border rounded-lg text-sm">
                <div className="flex items-center gap-2 text-ink-muted">
                  <Phone className="h-4 w-4 text-ink-muted flex-shrink-0" />
                  <span className="font-mono">{selectedLandlord.phone ?? '—'}</span>
                </div>
                <div className="text-ink-muted truncate">{selectedLandlord.email ?? '—'}</div>
                {selectedLandlord.address && (
                  <div className="col-span-2 flex items-start gap-2 text-ink-muted">
                    <MapPin className="h-4 w-4 text-ink-muted flex-shrink-0 mt-0.5" />
                    <span>{selectedLandlord.address}</span>
                  </div>
                )}
                {selectedLandlord.notes && (
                  <div className="col-span-2 text-ink-muted italic text-xs border-t border-border/50 pt-2 mt-1">
                    Ghi chú: {selectedLandlord.notes}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-accent" />
                  <h3 className="font-heading font-bold text-ink">Tòa nhà sở hữu ({getLandlordBuildings(selectedLandlord.id).length})</h3>
                </div>
                {getLandlordBuildings(selectedLandlord.id).length === 0 ? (
                  <div className="text-center py-8 text-ink-muted border border-dashed border-border rounded-lg">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-35" />
                    <p className="text-sm">Chưa có tòa nhà nào</p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {getLandlordBuildings(selectedLandlord.id).map((building) => (
                      <div key={building.id} className="flex items-center gap-4 p-3.5 border border-border rounded-lg bg-bg-base hover:bg-bg-subtle/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-ink text-sm">{building.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-border bg-white text-ink-muted rounded-md">{building.code}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-ink-muted mt-1">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{building.area}</span>
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5 truncate">{building.address}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-ink font-heading">{building.total_rooms} phòng</div>
                          <div className="text-[10px] text-ink-muted mt-0.5">{building.total_floors} tầng</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
