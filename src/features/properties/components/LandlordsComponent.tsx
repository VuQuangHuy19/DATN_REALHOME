'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getAreaColorClass } from '@/lib/utils/colors';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, Phone, User, Building2, MapPin, Layers, Loader2, AlertCircle, Mail, CreditCard, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { useLandlords } from '@/src/features/properties/hooks/useLandlords';
import { useBuildings } from '@/src/features/properties/hooks/useBuildings';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import KYCBadge from '@/components/kyc/KYCBadge';
import { toast } from 'sonner';
import type { DBLandlord, DBBuilding } from '@/lib/supabase/types';

export function LandlordsComponent() {
  const { company } = useAuth();
  const { items: landlordList, loading, error, update, remove, refetch } = useLandlords(company?.id);
  const { items: buildings } = useBuildings(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState<DBLandlord | null>(null);
  const [selectedLandlord, setSelectedLandlord] = useState<DBLandlord | null>(null);
  const [isBuildingsOpen, setIsBuildingsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = landlordList.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.system_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.code ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone ?? '').includes(searchQuery) ||
    (l.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLandlordBuildings = (landlordCode: string | null | undefined, landlordId: string): DBBuilding[] =>
    buildings.filter((b) => b.landlord_id === landlordCode || b.landlord_id === landlordId);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const code = (formData.get('code') as string || '').trim();
    const system_name = (formData.get('system_name') as string || '').trim();

    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Không được để trống';
    if (!phone) errs.phone = 'Không được để trống';
    if (!email) errs.email = 'Không được để trống';
    if (!code) errs.code = 'Không được để trống';

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors({});
    setSaving(true);

    const payload = {
      company_id: company?.id ?? '',
      name,
      system_name: system_name || null,
      phone: phone || null,
      email: email || null,
      code: code || null,
      address: formData.get('address') as string || null,
      properties_count: editItem?.properties_count || 0,
      notes: formData.get('notes') as string || null,
      bank_name: formData.get('bank_name') as string || null,
      bank_account_number: formData.get('bank_account_number') as string || null,
      bank_account_owner: formData.get('bank_account_owner') as string || null,
      image_url: imageUrl,
    };
    if (editItem) {
      await update(editItem.id, payload);
    } else {
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
              description: resData.emailError || 'Kiểm tra lại cấu hình MAILJET_API_KEY',
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} chủ nhà đã chọn không? Thao tác này không thể hoàn tác.`)) return;
    try {
      await Promise.all(selectedIds.map(id => remove(id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
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
          <h2 className="text-xl font-bold font-heading text-ink tracking-tight">Quản lý Chủ nhà </h2>
          <p className="text-ink-muted text-xs mt-0.5">Danh sách chủ sở hữu bất động sản, trạng thái KYC và thông tin ngân hàng</p>
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
            <form onSubmit={handleSave} noValidate className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editItem?.name}
                    onChange={() => formErrors.name && setFormErrors(prev => ({ ...prev, name: '' }))}
                    className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${formErrors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  {formErrors.name && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {formErrors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    defaultValue={editItem?.phone ?? ''}
                    onChange={() => formErrors.phone && setFormErrors(prev => ({ ...prev, phone: '' }))}
                    className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${formErrors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  {formErrors.phone && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {formErrors.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-ink font-semibold text-xs uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    defaultValue={editItem?.email ?? ''}
                    onChange={() => formErrors.email && setFormErrors(prev => ({ ...prev, email: '' }))}
                    className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${formErrors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  {formErrors.email && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {formErrors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã Chủ Nhà <span className="text-red-500">*</span></Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={editItem?.code ?? ''}
                    placeholder="Ví dụ: DH01"
                    onChange={() => formErrors.code && setFormErrors(prev => ({ ...prev, code: '' }))}
                    className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${formErrors.code ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  {formErrors.code && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {formErrors.code}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="system_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên hệ thống / Thương hiệu</Label>
                  <Input
                    id="system_name"
                    name="system_name"
                    defaultValue={editItem?.system_name ?? ''}
                    placeholder="Ví dụ: HT Home"
                    className="rounded-lg border-border mt-1.5 focus-visible:ring-accent font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
                  <Input id="address" name="address" defaultValue={editItem?.address ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
                <Input id="notes" name="notes" defaultValue={editItem?.notes ?? ''} className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
              </div>
              <div className="border-t border-border pt-3 mt-3 space-y-2">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Tài khoản Ngân hàng (Nhận doanh thu)
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <Label htmlFor="bank_name" className="text-ink font-semibold text-[10px] uppercase">Ngân hàng</Label>
                    <Input id="bank_name" name="bank_name" defaultValue={editItem?.bank_name ?? ''} placeholder="MB Bank, VCB..." className="rounded-lg border-border mt-1 text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="bank_account_number" className="text-ink font-semibold text-[10px] uppercase">Số tài khoản</Label>
                    <Input id="bank_account_number" name="bank_account_number" defaultValue={editItem?.bank_account_number ?? ''} placeholder="0123456789" className="rounded-lg border-border mt-1 text-xs font-mono" />
                  </div>
                  <div>
                    <Label htmlFor="bank_account_owner" className="text-ink font-semibold text-[10px] uppercase">Chủ tài khoản</Label>
                    <Input id="bank_account_owner" name="bank_account_owner" defaultValue={editItem?.bank_account_owner ?? ''} placeholder="NGUYEN VAN A" className="rounded-lg border-border mt-1 text-xs uppercase" />
                  </div>
                </div>
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
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input placeholder="Tìm theo tên, mã chủ nhà (code), SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-lg border-border focus-visible:ring-accent" />
            </div>
            {selectedIds.length > 0 && (
              <Button onClick={handleBulkDelete} size="sm" className="bg-red-500 hover:bg-red-600 text-white rounded-lg whitespace-nowrap h-10">
                <Trash2 className="h-4 w-4 mr-2" /> Xóa {selectedIds.length} mục
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
          ) : (
            <div className="overflow-hidden border-t border-border">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table border-collapse">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                        onChange={handleSelectAll}
                        checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Họ tên</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Xác thực KYC</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Tòa nhà sở hữu</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filtered.map((item) => {
                    const ownedBuildings = getLandlordBuildings(item.code, item.id);
                    const isVerified = item.is_kyc_verified || item.kyc_status === 'verified';
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                          openBuildings(item);
                        }}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => handleSelect(item.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-ink-muted text-xs">{item.code ?? '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} width={32} height={32} className="rounded-full object-cover flex-shrink-0 border border-border" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-bg-subtle flex items-center justify-center flex-shrink-0 border border-border">
                                <User className="h-4 w-4 text-ink-muted" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-ink text-sm flex items-center gap-1.5">
                                <span>{item.system_name ? item.system_name : item.name}</span>
                                {isVerified && (
                                  <KYCBadge type="landlord" isVerified={true} systemName={item.system_name} name={item.name} size="sm" showTooltip={false} />
                                )}
                              </div>
                              {item.system_name && (
                                <div className="text-xs text-ink-muted">Chủ nhà: {item.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isVerified ? (
                            <KYCBadge type="landlord" isVerified={true} systemName={item.system_name} name={item.name} size="sm" />
                          ) : item.kyc_status === 'pending' ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Đang chờ duyệt
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                              Chưa KYC
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-ink-muted font-mono text-xs">{item.phone ?? '—'}</td>
                        <td className="px-6 py-4 text-ink-muted text-sm">{item.email ?? '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-ink-muted" />
                            <span className="text-ink font-semibold text-sm">{ownedBuildings.length}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent rounded-md" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:bg-danger/10 rounded-md" onClick={() => { if (window.confirm('Bạn có chắc muốn xóa?')) remove(item.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
