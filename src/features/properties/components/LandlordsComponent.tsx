'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Pencil, Trash2, Plus, Search, Phone, User, Building2, Loader2,
  AlertCircle, Mail, CreditCard, Clock, ChevronRight, UserCog,
  MapPin, ShieldCheck, Hash, Check, X,
} from 'lucide-react';
import { useLandlords } from '@/features/properties/hooks/useLandlords';
import { useBuildings } from '@/features/properties/hooks/useBuildings';
import { useManagers } from '@/features/managers/hooks/useManagers';
import { deleteManager } from '@/features/managers/services/managers';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import type { DBLandlord, DBBuilding, DBManager } from '@/lib/supabase/types';

// ─── Landlord Edit Form Dialog ───────────────────────────────────────────────

function LandlordEditDialog({
  open, landlord, onClose, onSave,
}: {
  open: boolean;
  landlord: DBLandlord | null;
  onClose: () => void;
  onSave: (data: Partial<DBLandlord>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(landlord?.image_url ?? null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string || '').trim();
    const phone = (fd.get('phone') as string || '').trim();
    const email = (fd.get('email') as string || '').trim();
    const code = (fd.get('code') as string || '').trim();

    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Không được để trống';
    if (!phone) errs.phone = 'Không được để trống';
    if (!code) errs.code = 'Không được để trống';
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaving(true);

    await onSave({
      name,
      system_name: (fd.get('system_name') as string) || null,
      phone: phone || null,
      email: email || null,
      code: code || null,
      address: (fd.get('address') as string) || null,
      notes: (fd.get('notes') as string) || null,
      bank_name: (fd.get('bank_name') as string) || null,
      bank_account_number: (fd.get('bank_account_number') as string) || null,
      bank_account_owner: (fd.get('bank_account_owner') as string) || null,
      image_url: imageUrl,
    });
    setSaving(false);
    onClose();
  };

  if (!landlord) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl border border-border bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-ink font-bold">Chỉnh sửa thông tin Chủ nhà</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên <span className="text-red-500">*</span></Label>
              <Input name="name" defaultValue={landlord.name} onChange={() => formErrors.name && setFormErrors(p => ({ ...p, name: '' }))} className={`rounded-lg border-border mt-1.5 ${formErrors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
              {formErrors.name && <p className="text-xs text-red-500 mt-1">⚠️ {formErrors.name}</p>}
            </div>
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại <span className="text-red-500">*</span></Label>
              <Input name="phone" defaultValue={landlord.phone ?? ''} onChange={() => formErrors.phone && setFormErrors(p => ({ ...p, phone: '' }))} className={`rounded-lg border-border mt-1.5 ${formErrors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
              {formErrors.phone && <p className="text-xs text-red-500 mt-1">⚠️ {formErrors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Email</Label>
              <Input name="email" type="email" defaultValue={landlord.email ?? ''} className="rounded-lg border-border mt-1.5" />
            </div>
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Mã Chủ Nhà <span className="text-red-500">*</span></Label>
              <Input name="code" defaultValue={landlord.code ?? ''} placeholder="Ví dụ: DH01" onChange={() => formErrors.code && setFormErrors(p => ({ ...p, code: '' }))} className={`rounded-lg border-border mt-1.5 ${formErrors.code ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
              {formErrors.code && <p className="text-xs text-red-500 mt-1">⚠️ {formErrors.code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Tên Thương hiệu</Label>
              <Input name="system_name" defaultValue={landlord.system_name ?? ''} placeholder="Ví dụ: HT Home" className="rounded-lg border-border mt-1.5" />
            </div>
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
              <Input name="address" defaultValue={landlord.address ?? ''} className="rounded-lg border-border mt-1.5" />
            </div>
          </div>
          <div>
            <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
            <Input name="notes" defaultValue={landlord.notes ?? ''} className="rounded-lg border-border mt-1.5" />
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Tài khoản Ngân hàng
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <Label className="text-ink font-semibold text-[10px] uppercase">Ngân hàng</Label>
                <Input name="bank_name" defaultValue={landlord.bank_name ?? ''} placeholder="MB Bank, VCB..." className="rounded-lg border-border mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-ink font-semibold text-[10px] uppercase">Số tài khoản</Label>
                <Input name="bank_account_number" defaultValue={landlord.bank_account_number ?? ''} placeholder="0123456789" className="rounded-lg border-border mt-1 text-xs font-mono" />
              </div>
              <div>
                <Label className="text-ink font-semibold text-[10px] uppercase">Chủ tài khoản</Label>
                <Input name="bank_account_owner" defaultValue={landlord.bank_account_owner ?? ''} placeholder="NGUYEN VAN A" className="rounded-lg border-border mt-1 text-xs uppercase" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="landlords" />
          </div>
          <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg mt-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}Lưu thay đổi
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manager Add/Edit Dialog ──────────────────────────────────────────────────

function ManagerFormDialog({
  open, manager, landlord, landlordId, companyId, buildingList, onClose, onSave,
}: {
  open: boolean;
  manager: DBManager | null;
  landlord?: DBLandlord | null;
  landlordId: string;
  companyId: string;
  buildingList: DBBuilding[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(manager?.avatar_url ?? '');
  const [assignedBuildingIds, setAssignedBuildingIds] = useState<string[]>(() => {
    if (!manager) return buildingList.map(b => b.id); // Default assign all owned buildings when adding
    return buildingList.filter(b => b.manager_ids?.includes(manager.id)).map(b => b.id);
  });
  const [buildingSearch, setBuildingSearch] = useState('');

  // Sync avatarUrl & assignedBuildingIds when manager prop changes
  useEffect(() => {
    setAvatarUrl(manager?.avatar_url ?? '');
    if (manager) {
      setAssignedBuildingIds(buildingList.filter(b => b.manager_ids?.includes(manager.id)).map(b => b.id));
    } else {
      setAssignedBuildingIds(buildingList.map(b => b.id));
    }
  }, [manager, buildingList]);

  const filteredBuildings = buildingList.filter(b =>
    b.name.toLowerCase().includes(buildingSearch.toLowerCase()) ||
    (b.code ?? '').toLowerCase().includes(buildingSearch.toLowerCase()) ||
    (b.address ?? '').toLowerCase().includes(buildingSearch.toLowerCase())
  );

  const handleSelectAllBuildings = () => {
    setAssignedBuildingIds(buildingList.map(b => b.id));
  };

  const handleDeselectAllBuildings = () => {
    setAssignedBuildingIds([]);
  };

  const landlordTitleStr = landlord
    ? `${landlord.system_name || landlord.name}${landlord.code ? ` [${landlord.code}]` : ''}${landlord.system_name && landlord.name ? ` · ${landlord.name}` : ''}`
    : '';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string || '').trim();
    if (!name) { toast.error('Vui lòng nhập tên quản lý!'); return; }
    setSaving(true);

    const payload = {
      company_id: companyId,
      name,
      phone: (fd.get('phone') as string) || null,
      email: (fd.get('email') as string) || null,
      manager_type: (fd.get('manager_type') as 'individual' | 'company') || 'individual',
      avatar_url: avatarUrl || null,
      landlord_id: landlordId,
    };

    const localToken = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (localToken) authHeaders['Authorization'] = `Bearer ${localToken}`;

    try {
      let savedManager: DBManager | null = null;
      if (manager) {
        const res = await fetch('/api/managers', {
          method: 'PUT',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({ id: manager.id, ...payload }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const resData = await res.json();
        savedManager = resData.data;
        toast.success('Cập nhật quản lý thành công!');
      } else {
        const res = await fetch('/api/managers', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const resData = await res.json();
        savedManager = resData.data;
        if (resData.emailSent) {
          toast.success('Tạo người quản lý thành công!', {
            description: `Email kích hoạt đã gửi tới ${payload.email}`,
            duration: 5000,
          });
        } else {
          toast.success('Tạo người quản lý thành công!');
        }
      }

      // Sync building assignments
      if (savedManager) {
        const managerId = savedManager.id;
        for (const b of buildingList) {
          const wasAssigned = b.manager_ids?.includes(managerId) ?? false;
          const nowAssigned = assignedBuildingIds.includes(b.id);
          if (!wasAssigned && nowAssigned) {
            await supabase.from('buildings').update({ manager_ids: [...(b.manager_ids || []), managerId] }).eq('id', b.id);
            await supabase.from('building_managers').upsert({ building_id: b.id, manager_id: managerId }, { onConflict: 'building_id,manager_id' }).select();
          } else if (wasAssigned && !nowAssigned) {
            await supabase.from('buildings').update({ manager_ids: (b.manager_ids || []).filter(id => id !== managerId) }).eq('id', b.id);
            await supabase.from('building_managers').delete().eq('building_id', b.id).eq('manager_id', managerId);
          }
        }
      }

      await onSave();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[80vw] max-w-5xl rounded-2xl border border-border bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto p-0">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-950 dark:to-zinc-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="font-heading text-lg font-bold text-white">
                  {manager ? 'Chỉnh sửa quản lý tòa nhà' : 'Thêm quản lý tòa nhà'}
                </DialogTitle>
                <p className="text-xs text-indigo-100/90 font-medium mt-0.5">
                  {landlordTitleStr ? `Chủ nhà: ${landlordTitleStr}` : 'Phân công nhân sự theo dõi & vận hành các bất động sản'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {manager?.code && (
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 font-mono text-xs px-2.5 py-1">
                  {manager.code}
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Basic Information - 4 Columns */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5 whitespace-nowrap truncate">
                  Họ &amp; Tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="name"
                  defaultValue={manager?.name}
                  placeholder="Nguyễn Văn A"
                  required
                  className="rounded-xl border-border mt-1.5 text-sm focus-visible:ring-indigo-500"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5 whitespace-nowrap truncate">
                  Số Điện Thoại <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="phone"
                  defaultValue={manager?.phone ?? ''}
                  placeholder="0912 345 678"
                  required
                  className="rounded-xl border-border mt-1.5 text-sm font-mono focus-visible:ring-indigo-500"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5 whitespace-nowrap truncate" title="Email liên hệ / Đăng nhập">
                  Email liên hệ
                </Label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={manager?.email ?? ''}
                  placeholder="quanly@gmail.com"
                  className="rounded-xl border-border mt-1.5 text-sm focus-visible:ring-indigo-500"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5 whitespace-nowrap truncate">
                  Loại hình Quản lý
                </Label>
                <select
                  name="manager_type"
                  defaultValue={manager?.manager_type ?? 'individual'}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 mt-1.5"
                >
                  <option value="individual">Cá nhân (Quản lý trực tiếp)</option>
                  <option value="company">Đơn vị / Công ty vận hành</option>
                </select>
              </div>
            </div>

          </div>

          {/* Section 2: Avatar & Auto-Email Info */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-border pt-4 items-center">
            <div className="md:col-span-7 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-ink-muted block">Ảnh Đại Diện</Label>
              <ImageUpload
                value={avatarUrl}
                onChange={(url) => setAvatarUrl(Array.isArray(url) ? url[0] : url || '')}
                bucket="avatars"
              />
            </div>

            {!manager && (
              <div className="md:col-span-5 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                  <Mail className="h-4 w-4 shrink-0 text-indigo-600" />Tự động gửi email kích hoạt
                </div>
                <p className="text-ink-muted text-xs leading-relaxed">
                  Hệ thống sẽ tự động khởi tạo tài khoản và gửi thư mời thiết lập mật khẩu tới Email đăng nhập của người quản lý ngay sau khi lưu.
                </p>
              </div>
            )}
          </div>

          {/* Building Assignment Section (Full Width - 3 Columns) */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-ink flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Phân công Tòa nhà phụ trách
                  <Badge className="ml-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold text-[10px]">
                    {assignedBuildingIds.length} / {buildingList.length} tòa
                  </Badge>
                </Label>
              </div>

              {buildingList.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    onClick={handleSelectAllBuildings}
                  >
                    Select All
                  </Button>
                  <span className="text-border">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-ink-muted hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                    onClick={handleDeselectAllBuildings}
                  >
                    Deselect All
                  </Button>
                </div>
              )}
            </div>

            {buildingList.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-muted border border-dashed border-border rounded-xl bg-bg-subtle/50">
                Chủ nhà này chưa có tòa nhà nào để phân công.
              </div>
            ) : (
              <div className="space-y-2.5">
                {buildingList.length > 3 && (
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                    <Input
                      placeholder="Tìm tòa nhà theo tên, mã hoặc địa chỉ..."
                      value={buildingSearch}
                      onChange={(e) => setBuildingSearch(e.target.value)}
                      className="pl-8 h-8 rounded-lg text-xs border-border"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">

                  {filteredBuildings.map(b => {
                    const isChecked = assignedBuildingIds.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setAssignedBuildingIds(prev =>
                            isChecked ? prev.filter(id => id !== b.id) : [...prev, b.id]
                          );
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm'
                            : 'bg-white dark:bg-zinc-900 border-border hover:bg-bg-subtle/50'
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-border bg-white dark:bg-zinc-800'
                        }`}>
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>

                        {b.thumbnail_url ? (
                          <img src={b.thumbnail_url} alt={b.name} className="h-9 w-9 rounded-lg object-cover border border-border shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-emerald-600" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-ink truncate">{b.name}</div>
                          <div className="text-[10px] text-ink-muted flex items-center gap-1">
                            <span className="font-mono">{b.code}</span>
                            <span>·</span>
                            <span>{b.total_rooms ?? 0} phòng</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs px-4"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs px-5 gap-2 font-bold shadow-md shadow-indigo-200 dark:shadow-none"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {manager ? 'Lưu thay đổi' : 'Thêm người quản lý'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ─── Landlord Detail Sheet (Slide-over) ──────────────────────────────────────

function LandlordDetailSheet({
  open, landlord, managers, buildings, companyId,
  onClose, onRefreshManagers, onRefreshBuildings, onEditLandlord,
  inline = false,
}: {
  open: boolean;
  landlord: DBLandlord | null;
  managers: DBManager[];
  buildings: DBBuilding[];
  companyId: string;
  onClose: () => void;
  onRefreshManagers: () => void;
  onRefreshBuildings: () => void;
  onEditLandlord: () => void;
  inline?: boolean;
}) {
  const [managerDialog, setManagerDialog] = useState<{ open: boolean; manager: DBManager | null }>({ open: false, manager: null });

  const handleDeleteManager = async (mgr: DBManager) => {
    if (!window.confirm(`Xóa quản lý "${mgr.name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteManager(mgr.id);
      toast.success('Đã xóa người quản lý!');
      await Promise.all([onRefreshManagers(), onRefreshBuildings()]);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa');
    }
  };

  if (!landlord) return null;
  const isVerified = landlord.is_kyc_verified || landlord.kyc_status === 'verified';
  const ownedBuildings = buildings.filter(b => b.landlord_id === landlord.code || b.landlord_id === landlord.id);
  const landlordManagers = managers.filter(m => m.landlord_id === landlord.id);

  // Shared content for both modes
  const panelHeader = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {landlord.image_url ? (
          <Image src={landlord.image_url} alt={landlord.name} width={48} height={48} className="rounded-full object-cover border-2 border-border flex-shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 border-2 border-indigo-200 dark:border-indigo-700 flex items-center justify-center flex-shrink-0">
            <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-bold text-ink text-base leading-tight truncate">{landlord.system_name || landlord.name}</h2>
          {landlord.system_name && <p className="text-xs text-ink-muted truncate">Chủ nhà: {landlord.name}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {landlord.code && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                <Hash className="h-3 w-3" />{landlord.code}
              </span>
            )}
            {isVerified ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px] font-bold">
                <ShieldCheck className="h-3 w-3" />Đã KYC
              </Badge>
            ) : landlord.kyc_status === 'pending' ? (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[10px] font-bold">
                <Clock className="h-3 w-3 animate-pulse" />Chờ KYC
              </Badge>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700">Chưa KYC</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5" onClick={onEditLandlord}>
          <Pencil className="h-3.5 w-3.5" />Sửa
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-ink-muted hover:text-ink" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </Button>
      </div>
    </div>
  );

  const panelBody = (
    <div className="px-5 py-5 space-y-6">
      {/* Contact Info */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest">Thông tin liên hệ</h3>
        <div className="grid grid-cols-1 gap-2">
          {landlord.phone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border">
              <Phone className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase">Điện thoại</p>
                <a href={`tel:${landlord.phone}`} className="text-sm font-bold text-ink hover:text-accent transition-colors">{landlord.phone}</a>
              </div>
            </div>
          )}
          {landlord.email && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border">
              <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase">Email</p>
                <a href={`mailto:${landlord.email}`} className="text-sm font-bold text-ink hover:text-accent transition-colors">{landlord.email}</a>
              </div>
            </div>
          )}
          {landlord.address && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-bg-subtle border border-border">
              <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-ink-muted uppercase">Địa chỉ</p>
                <p className="text-sm text-ink">{landlord.address}</p>
              </div>
            </div>
          )}
        </div>
        {(landlord.bank_name || landlord.bank_account_number) && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
            <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <CreditCard className="h-3.5 w-3.5" />Tài khoản nhận doanh thu
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              {landlord.bank_name && <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-700">{landlord.bank_name}</span>}
              {landlord.bank_account_number && <span className="text-sm font-mono font-bold text-ink">{landlord.bank_account_number}</span>}
              {landlord.bank_account_owner && <span className="text-xs text-ink-muted">· {landlord.bank_account_owner}</span>}
            </div>
          </div>
        )}
      </section>

      {/* Managers Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5" />Người Quản Lý Tòa
            <span className="ml-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{landlordManagers.length}</span>
          </h3>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setManagerDialog({ open: true, manager: null })}>
            <Plus className="h-3.5 w-3.5" />Thêm
          </Button>
        </div>
        {landlordManagers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border rounded-xl bg-bg-subtle/50">
            <UserCog className="h-8 w-8 text-ink-muted/40 mb-2" />
            <p className="text-xs text-ink-muted">Chưa có người quản lý nào</p>
            <Button size="sm" variant="link" className="text-xs text-indigo-600 mt-1" onClick={() => setManagerDialog({ open: true, manager: null })}>
              + Thêm quản lý đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {landlordManagers.map((mgr) => {
              const mgrBuildings = ownedBuildings.filter(b => b.manager_ids?.includes(mgr.id));
              return (
                <div key={mgr.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-bg-subtle/30 hover:bg-bg-subtle transition-colors group">
                  {mgr.avatar_url ? (
                    <img src={mgr.avatar_url} alt={mgr.name} className="h-10 w-10 rounded-full object-cover border border-border flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-700 dark:to-zinc-800 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                      <UserCog className="h-5 w-5 text-ink-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink">{mgr.name}</span>
                      {mgr.code && <span className="text-[10px] font-mono text-ink-muted bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">{mgr.code}</span>}
                    </div>
                    {mgr.phone && <a href={`tel:${mgr.phone}`} className="text-xs text-ink-muted hover:text-accent transition-colors font-mono">{mgr.phone}</a>}
                    {mgrBuildings.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <Building2 className="h-3 w-3 text-ink-muted" />
                        {mgrBuildings.map(b => <span key={b.id} className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 rounded-md font-medium">{b.name}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-ink hover:text-accent rounded-lg" onClick={() => setManagerDialog({ open: true, manager: mgr })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:bg-danger/10 rounded-lg" onClick={() => handleDeleteManager(mgr)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Buildings Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />Tòa Nhà Sở Hữu
          <span className="ml-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{ownedBuildings.length}</span>
        </h3>
        {ownedBuildings.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-xs text-ink-muted border border-dashed border-border rounded-xl bg-bg-subtle/50 justify-center">
            <Building2 className="h-4 w-4 opacity-40" />Chưa có tòa nhà nào
          </div>
        ) : (
          <div className="space-y-2">
            {ownedBuildings.map(b => {
              const bManagers = landlordManagers.filter(m => b.manager_ids?.includes(m.id));
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-subtle/30 hover:bg-bg-subtle transition-colors">
                  {b.thumbnail_url ? (
                    <img src={b.thumbnail_url} alt={b.name} className="h-10 w-10 rounded-lg object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-ink truncate">{b.name}</div>
                    <div className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{b.code}</span>
                      {b.area && <><span>·</span><span>{b.area}</span></>}
                    </div>
                    {bManagers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <UserCog className="h-3 w-3 text-indigo-500" />
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">{bManagers.map(m => m.name).join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-ink">{b.total_rooms}</span>
                    <p className="text-[10px] text-ink-muted">phòng</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {landlord.notes && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest">Ghi chú</h3>
          <p className="text-sm text-ink-muted bg-bg-subtle rounded-xl p-3 border border-border">{landlord.notes}</p>
        </section>
      )}
    </div>
  );

  return (
    <>
      {inline ? (
        /* Inline split-view mode: renders as a scrollable Card fitting strictly within 1 screen */
        <Card className="border border-border rounded-2xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-235px)]">
          <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-border px-4 py-3.5">
            {panelHeader}
          </div>
          <div className="flex-1 overflow-y-auto">
            {panelBody}
          </div>
        </Card>
      ) : (

        /* Sheet overlay mode (legacy / mobile fallback) */
        <Sheet open={open} onOpenChange={onClose}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-y-auto bg-white dark:bg-zinc-900 border-l border-border">
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-border px-5 pt-5 pb-4">
              <SheetHeader>
                {panelHeader}
              </SheetHeader>
            </div>
            {panelBody}
          </SheetContent>
        </Sheet>
      )}

      {/* Manager Form Dialog */}
      <ManagerFormDialog
        open={managerDialog.open}
        manager={managerDialog.manager}
        landlord={landlord}
        landlordId={landlord.id}
        companyId={companyId}
        buildingList={ownedBuildings}
        onClose={() => setManagerDialog({ open: false, manager: null })}
        onSave={async () => { await Promise.all([onRefreshManagers(), onRefreshBuildings()]); }}
      />

    </>
  );
}

// ─── Main LandlordsComponent ──────────────────────────────────────────────────

export function LandlordsComponent() {
  const { company } = useAuth();
  const { items: landlordList, loading, error, update, remove, refetch } = useLandlords(company?.id);
  const { items: buildings, refetch: refetchBuildings } = useBuildings(company?.id);
  const { items: managers, refetch: refetchManagers } = useManagers(company?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLandlord, setSelectedLandlord] = useState<DBLandlord | null>(null);
  const [editLandlordDialogOpen, setEditLandlordDialogOpen] = useState(false);


  // Add new landlord dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addImageUrl, setAddImageUrl] = useState<string | null>(null);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

  const filtered = landlordList.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.system_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.code ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone ?? '').includes(searchQuery) ||
    (l.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLandlordBuildings = useCallback((landlord: DBLandlord) =>
    buildings.filter(b => b.landlord_id === landlord.code || b.landlord_id === landlord.id),
    [buildings]
  );

  const getLandlordManagerCount = useCallback((landlordId: string) =>
    managers.filter(m => m.landlord_id === landlordId).length,
    [managers]
  );

  const handleRowClick = (landlord: DBLandlord) => {
    setSelectedLandlord(landlord);
  };


  const handleUpdateLandlord = async (data: Partial<DBLandlord>) => {
    if (!selectedLandlord) return;
    await update(selectedLandlord.id, data);
    await refetch();
    // Also update selectedLandlord to reflect new data
    setSelectedLandlord(prev => prev ? { ...prev, ...data } : null);
    toast.success('Cập nhật Chủ nhà thành công!');
  };

  const handleAddLandlord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string || '').trim();
    const phone = (fd.get('phone') as string || '').trim();
    const email = (fd.get('email') as string || '').trim();
    const code = (fd.get('code') as string || '').trim();
    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Không được để trống';
    if (!phone) errs.phone = 'Không được để trống';
    if (!email) errs.email = 'Không được để trống';
    if (!code) errs.code = 'Không được để trống';
    if (Object.keys(errs).length > 0) { setAddFormErrors(errs); return; }
    setAddFormErrors({});
    setAddSaving(true);

    try {
      const payload = {
        company_id: company?.id ?? '',
        name,
        system_name: (fd.get('system_name') as string) || null,
        phone: phone || null,
        email: email || null,
        code: code || null,
        address: (fd.get('address') as string) || null,
        notes: (fd.get('notes') as string) || null,
        bank_name: (fd.get('bank_name') as string) || null,
        bank_account_number: (fd.get('bank_account_number') as string) || null,
        bank_account_owner: (fd.get('bank_account_owner') as string) || null,
        properties_count: 0,
        image_url: addImageUrl,
      };
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
        await refetch();
        if (resData.emailSent) {
          toast.success('Tạo chủ nhà thành công!', { description: `Email kích hoạt đã gửi đến ${email}`, duration: 6000 });
        } else {
          toast.success('Tạo chủ nhà thành công!');
        }
        setAddDialogOpen(false);
        setAddImageUrl(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-ink tracking-tight">Quản lý Chủ nhà</h2>
          <p className="text-ink-muted text-xs mt-0.5">Danh sách chủ sở hữu bất động sản · Click vào hàng để xem chi tiết &amp; quản lý tòa</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-accent hover:bg-accent-500 text-white rounded-xl gap-2">
          <Plus className="h-4 w-4" />Thêm chủ nhà
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* ── Split View Layout ─────────────────────────────────────────────── */}
      <div className={`flex gap-4 transition-all duration-300 ${selectedLandlord ? 'items-start' : ''}`}>

        {/* ── LEFT: Landlord List ──────────────────────────────────────────── */}
        <div className={`transition-all duration-300 min-w-0 ${selectedLandlord ? 'w-[42%] flex-shrink-0' : 'w-full'}`}>
          <Card className="border-border rounded-2xl shadow-sm bg-white dark:bg-zinc-900 h-[calc(100vh-235px)] flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <Input
                  placeholder="Tìm theo tên, mã, SĐT hoặc email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-border focus-visible:ring-accent"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
              ) : (
                <div className="border-t border-border">

                  {/* Desktop Table */}
                  <table className="w-full text-sm hidden md:table border-collapse">
                    <thead className="bg-bg-subtle border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider w-16">Mã</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Chủ nhà</th>
                        {!selectedLandlord && <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">SĐT / Email</th>}
                        <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Tòa</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">QL</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-ink">
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={selectedLandlord ? 5 : 6} className="px-6 py-12 text-center text-ink-muted">
                            <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Không tìm thấy chủ nhà nào</p>
                          </td>
                        </tr>
                      )}
                      {filtered.map((item) => {
                        const ownedBldgs = getLandlordBuildings(item);
                        const mgrCount = getLandlordManagerCount(item.id);
                        const isVerified = item.is_kyc_verified || item.kyc_status === 'verified';
                        const isActive = selectedLandlord?.id === item.id;

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors cursor-pointer group ${isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-l-2 border-l-indigo-500'
                              : 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'}`}
                            onClick={() => handleRowClick(item)}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-xs text-ink-muted">{item.code ?? '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {item.image_url ? (
                                  <Image src={item.image_url} alt={item.name} width={32} height={32} className="rounded-full object-cover border border-border flex-shrink-0" />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 flex items-center justify-center flex-shrink-0 border border-indigo-200 dark:border-indigo-700">
                                    <User className="h-3.5 w-3.5 text-indigo-500" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-ink text-sm flex items-center gap-1 truncate">
                                    {item.system_name || item.name}
                                    {isVerified && <ShieldCheck className="h-3 w-3 text-emerald-500 flex-shrink-0" />}
                                  </div>
                                  {item.system_name && <div className="text-xs text-ink-muted truncate">{item.name}</div>}
                                </div>
                              </div>
                            </td>
                            {!selectedLandlord && (
                              <td className="px-4 py-3">
                                <div className="space-y-0.5">
                                  {item.phone && <div className="text-xs font-mono text-ink-muted">{item.phone}</div>}
                                  {item.email && <div className="text-xs text-ink-muted truncate max-w-[150px]">{item.email}</div>}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="font-bold text-ink text-sm">{ownedBldgs.length}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <UserCog className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="font-bold text-ink text-sm">{mgrCount}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-danger hover:bg-danger/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => { if (window.confirm('Bạn có chắc muốn xóa chủ nhà này?')) remove(item.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-border">
                    {filtered.map((item) => {
                      const ownedBldgs = getLandlordBuildings(item);
                      const mgrCount = getLandlordManagerCount(item.id);
                      const isVerified = item.is_kyc_verified || item.kyc_status === 'verified';
                      const isActive = selectedLandlord?.id === item.id;
                      return (
                        <div key={item.id} className={`p-4 space-y-3 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/30 border-l-2 border-l-indigo-500' : 'hover:bg-bg-subtle/50'}`} onClick={() => handleRowClick(item)}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <Image src={item.image_url} alt={item.name} width={40} height={40} className="rounded-full object-cover border border-border" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200 dark:border-indigo-700">
                                  <User className="h-5 w-5 text-indigo-500" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-ink flex items-center gap-1.5 text-sm">
                                  {item.system_name || item.name}
                                  {isVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                                </div>
                                {item.code && <div className="text-[10px] font-mono text-ink-muted">{item.code}</div>}
                              </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'text-indigo-600 rotate-90' : 'text-ink-muted'}`} />
                          </div>
                          <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1 text-ink-muted"><Building2 className="h-3.5 w-3.5 text-emerald-500" />{ownedBldgs.length} tòa</div>
                            <div className="flex items-center gap-1 text-ink-muted"><UserCog className="h-3.5 w-3.5 text-indigo-500" />{mgrCount} quản lý</div>
                            {item.phone && <div className="flex items-center gap-1 text-ink-muted"><Phone className="h-3.5 w-3.5" />{item.phone}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Inline Detail Panel ────────────────────────────────────── */}
        {selectedLandlord && (
          <div className="flex-1 min-w-0 animate-in slide-in-from-right-4 duration-300">
            <LandlordDetailSheet
              open={true}
              landlord={selectedLandlord}
              managers={managers}
              buildings={buildings}
              companyId={company?.id ?? ''}
              onClose={() => setSelectedLandlord(null)}
              onRefreshManagers={refetchManagers}
              onRefreshBuildings={refetchBuildings}
              onEditLandlord={() => setEditLandlordDialogOpen(true)}
              inline
            />
          </div>
        )}
      </div>

      {/* Add Landlord Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-ink font-bold">Thêm Chủ nhà mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLandlord} noValidate className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên <span className="text-red-500">*</span></Label>
                <Input name="name" onChange={() => addFormErrors.name && setAddFormErrors(p => ({ ...p, name: '' }))} className={`rounded-lg border-border mt-1.5 ${addFormErrors.name ? 'border-red-500' : ''}`} />
                {addFormErrors.name && <p className="text-xs text-red-500 mt-1">⚠️ {addFormErrors.name}</p>}
              </div>
              <div>
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại <span className="text-red-500">*</span></Label>
                <Input name="phone" onChange={() => addFormErrors.phone && setAddFormErrors(p => ({ ...p, phone: '' }))} className={`rounded-lg border-border mt-1.5 ${addFormErrors.phone ? 'border-red-500' : ''}`} />
                {addFormErrors.phone && <p className="text-xs text-red-500 mt-1">⚠️ {addFormErrors.phone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
                <Input name="email" type="email" onChange={() => addFormErrors.email && setAddFormErrors(p => ({ ...p, email: '' }))} className={`rounded-lg border-border mt-1.5 ${addFormErrors.email ? 'border-red-500' : ''}`} />
                {addFormErrors.email && <p className="text-xs text-red-500 mt-1">⚠️ {addFormErrors.email}</p>}
              </div>
              <div>
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Mã Chủ Nhà <span className="text-red-500">*</span></Label>
                <Input name="code" placeholder="DH01" onChange={() => addFormErrors.code && setAddFormErrors(p => ({ ...p, code: '' }))} className={`rounded-lg border-border mt-1.5 ${addFormErrors.code ? 'border-red-500' : ''}`} />
                {addFormErrors.code && <p className="text-xs text-red-500 mt-1">⚠️ {addFormErrors.code}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Tên Thương hiệu</Label>
                <Input name="system_name" placeholder="HT Home" className="rounded-lg border-border mt-1.5" />
              </div>
              <div>
                <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
                <Input name="address" className="rounded-lg border-border mt-1.5" />
              </div>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />Tài khoản Ngân hàng
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-ink font-semibold text-[10px] uppercase">Ngân hàng</Label>
                  <Input name="bank_name" placeholder="MB Bank" className="rounded-lg border-border mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-ink font-semibold text-[10px] uppercase">Số TK</Label>
                  <Input name="bank_account_number" className="rounded-lg border-border mt-1 text-xs font-mono" />
                </div>
                <div>
                  <Label className="text-ink font-semibold text-[10px] uppercase">Chủ TK</Label>
                  <Input name="bank_account_owner" className="rounded-lg border-border mt-1 text-xs uppercase" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh</Label>
              <ImageUpload value={addImageUrl} onChange={setAddImageUrl} bucket="landlords" />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-xl" disabled={addSaving}>
              {addSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Thêm chủ nhà
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Landlord Dialog (triggered from inline panel) */}
      <LandlordEditDialog
        open={editLandlordDialogOpen}
        landlord={selectedLandlord}
        onClose={() => setEditLandlordDialogOpen(false)}
        onSave={handleUpdateLandlord}
      />
    </div>
  );
}
