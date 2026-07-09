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
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Chủ nhà</h1>
          <p className="text-slate-500">Quản lý chủ sở hữu bất động sản và danh sách tòa nhà</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Thêm chủ nhà</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} chủ nhà</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name">Họ tên</Label><Input id="name" name="name" defaultValue={editItem?.name} required /></div>
                <div><Label htmlFor="phone">Số điện thoại</Label><Input id="phone" name="phone" defaultValue={editItem?.phone ?? ''} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} /></div>
                <div><Label htmlFor="code">Mã Chủ Nhà</Label><Input id="code" name="code" defaultValue={editItem?.code ?? ''} placeholder="Ví dụ: DH01" required /></div>
              </div>
              <div><Label htmlFor="address">Địa chỉ</Label><Input id="address" name="address" defaultValue={editItem?.address ?? ''} /></div>
              <div><Label htmlFor="notes">Ghi chú</Label><Input id="notes" name="notes" defaultValue={editItem?.notes ?? ''} /></div>
              <div className="space-y-2">
                <Label>Hình ảnh chủ nhà</Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="landlords" />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
              </Button>
            </form>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Tìm theo tên, SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Mã</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Họ tên</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Số điện thoại</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Tòa nhà sở hữu</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => {
                    const ownedBuildings = getLandlordBuildings(item.id);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          openBuildings(item);
                        }}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-600">{item.code ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt={item.name} className="h-8 w-8 rounded-full object-cover flex-shrink-0 border" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-slate-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-slate-800">{item.name}</div>
                              {item.notes && <div className="text-xs text-slate-400 truncate max-w-[140px]">{item.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{item.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-700 font-medium">{ownedBuildings.length}</span>
                            {ownedBuildings.length > 0 && (
                              <span className="text-slate-400 text-xs">
                                ({ownedBuildings.slice(0, 2).map((b) => b.name).join(', ')}{ownedBuildings.length > 2 ? '...' : ''})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có chủ nhà nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBuildingsOpen} onOpenChange={setIsBuildingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLandlord?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedLandlord.image_url} alt={selectedLandlord.name} className="h-6 w-6 rounded-full object-cover border" />
              ) : (
                <User className="h-5 w-5" />
              )}
              {selectedLandlord?.name} {selectedLandlord?.code ? `(${selectedLandlord.code})` : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedLandlord && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{selectedLandlord.phone ?? '—'}</div>
                <div className="text-slate-600">{selectedLandlord.email ?? '—'}</div>
                {selectedLandlord.address && (
                  <div className="col-span-2 flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />{selectedLandlord.address}
                  </div>
                )}
                {selectedLandlord.notes && (
                  <div className="col-span-2 text-slate-500 italic text-xs">{selectedLandlord.notes}</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">Tòa nhà sở hữu ({getLandlordBuildings(selectedLandlord.id).length})</h3>
                </div>
                {getLandlordBuildings(selectedLandlord.id).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 border rounded-lg">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Chưa có tòa nhà nào</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {getLandlordBuildings(selectedLandlord.id).map((building) => (
                      <div key={building.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800">{building.name}</span>
                            <Badge variant="outline" className="text-xs">{building.code}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <MapPin className="h-3 w-3" />{building.area}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{building.address}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-slate-700">{building.total_rooms} phòng</div>
                          <div className="text-xs text-slate-400">{building.total_floors} tầng</div>
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
