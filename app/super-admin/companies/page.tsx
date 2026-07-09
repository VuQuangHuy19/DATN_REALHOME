'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, Building2, Edit, Trash2, Lock, Unlock,
  Users, MapPin, Mail, Phone, Eye, Loader2, RotateCw,
} from 'lucide-react';
import { useCompanies } from '@/lib/hooks/useCompanies';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';

const planConfig: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: 'bg-slate-100 text-slate-700' },
  professional: { label: 'Professional', color: 'bg-blue-100 text-blue-700' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Hoạt động', color: 'bg-green-100 text-green-700' },
  trial: { label: 'Dùng thử', color: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Tạm khóa', color: 'bg-red-100 text-red-700' },
};

// Đã fix lỗi Invalid Date: Kiểm tra dữ liệu an toàn trước khi format
function formatDate(s: string) {
  if (!s) return '---';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('vi-VN');
}

export default function SuperAdminCompaniesPage() {
  const { companies, loading, error, refetch, add, update, remove } = useCompanies();

  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [editItem, setEditItem] = useState<any | null>(null);
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const filtered = companies.filter((c: any) => {
    const matchSearch =
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.owner_email && c.owner_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.owner_name && c.owner_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchPlan = planFilter === 'all' || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const toggleStatus = async (id: string) => {
    const target = companies.find((c: any) => c.id === id);
    if (target) {
      await update(id, { status: target.status === 'active' ? 'suspended' : 'active' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa công ty này?')) {
      await remove(id);
    }
  };

  // Tạo mới: gọi /api/onboarding/invite (sinh token + gửi email)
  // Chỉnh sửa: vẫn dùng hook update() bình thường
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const name = fd.get('name') as string;
    const code = fd.get('code') as string;
    const plan = fd.get('plan') as string;
    const status = fd.get('status') as string;
    const owner_name = fd.get('ownerName') as string;
    const owner_email = fd.get('ownerEmail') as string;
    const phone = fd.get('phone') as string;
    const address = fd.get('address') as string;
    const jwt_duration = parseInt(fd.get('jwt_duration') as string) || 10;

    if (!name || !phone || !owner_email || !owner_name || !address || !code) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc (Tên, SĐT, Email, Chủ sở hữu, Địa chỉ, Mã công ty)');
      return;
    }

    setSubmitting(true);
    try {
      if (editItem) {
        // --- Chỉnh sửa công ty hiện có ---
        await update(editItem.id, {
          name,
          code,
          logo_url: logoUrl,
          plan: plan as any,
          status: status as any,
          owner_name, owner_email, phone, address,
          total_users: editItem.total_users || 0,
          total_properties: editItem.total_properties || 0,
          trial_ends_at: editItem.trial_ends_at || null,
          jwt_duration,
        });
        toast.success('Cập nhật công ty thành công!');
      } else {
        // --- Tạo công ty mới qua Onboarding Invite API ---
        const res = await fetch('/api/onboarding/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            code,
            logo_url: logoUrl,
            plan,
            owner_name,
            owner_email,
            phone,
            address,
            jwt_duration,
            status: 'pending'
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Không thể tạo công ty');
        }

        if (data.emailSent) {
          toast.success('Đã khởi tạo công ty và gửi email kích hoạt tài khoản!');
        } else {
          toast.success('Công ty đã được tạo! Lưu ý: email kích hoạt chưa gửi được.', {
            description: data.emailError || 'Kiểm tra lại cấu hình MAILJET_API_KEY / MAILJET_API_SECRET',
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
      return;
    } finally {
      setSubmitting(false);
    }

    setIsFormOpen(false);
    setEditItem(null);
    setLogoUrl(null);
  };

  const openAdd = () => { setEditItem(null); setLogoUrl(null); setIsFormOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setLogoUrl(item.logo_url || null); setIsFormOpen(true); };
  const openView = (item: any) => { setViewItem(item); setIsViewOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Công ty</h1>
          <p className="text-slate-500">Tất cả công ty trên nền tảng RealHome</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={loading} title="Làm mới dữ liệu">
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm công ty
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'starter', 'professional', 'enterprise'].map((p) => (
          <button
            key={p}
            onClick={() => setPlanFilter(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${planFilter === p ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {p === 'all' ? `Tất cả (${companies.length})` : planConfig[p]?.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm công ty, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Đang tải dữ liệu...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Công ty</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Chủ sở hữu</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Gói</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Users</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Ngày tạo</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Setime JWT</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item: any) => {
                    const pc = planConfig[item.plan] || planConfig['starter'];
                    const sc = statusConfig[item.status] || statusConfig['trial'];
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; openView(item); }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border">
                              {item.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.logo_url} alt="Logo" className="object-cover w-full h-full" />
                              ) : (
                                <Building2 className="h-4 w-4 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                {item.name}
                                {item.code && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.25 rounded border">
                                    {item.code}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">{item.owner_name}</div>
                          <div className="text-xs text-slate-400">{item.owner_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc.color}`}>{pc.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700 font-medium">{item.total_users || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-slate-700 font-medium bg-slate-100 px-2.5 py-1 rounded border text-xs">
                            {item.jwt_duration ?? 10} phút
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); openView(item); }}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" title="Chỉnh sửa" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Edit className="h-4 w-4" /></Button>
                            <Button
                              variant="ghost" size="sm"
                              title={item.status === 'suspended' ? 'Mở khóa' : 'Khóa'}
                              onClick={(e) => { e.stopPropagation(); toggleStatus(item.id); }}
                            >
                              {item.status === 'suspended'
                                ? <Unlock className="h-4 w-4 text-green-600" />
                                : <Lock className="h-4 w-4 text-red-500" />
                              }
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Không tìm thấy công ty nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border flex-shrink-0">
                {viewItem?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewItem.logo_url} alt="Logo" className="object-cover w-full h-full" />
                ) : (
                  <Building2 className="h-5 w-5 text-slate-500" />
                )}
              </div>
              <div>
                <div>{viewItem?.name}</div>
                <div className="text-xs text-slate-400 font-mono font-normal">Mã công ty: {viewItem?.code ?? '—'}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" />{viewItem.owner_email}</div>
                <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{viewItem.phone}</div>
                <div className="col-span-2 flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{viewItem.address}</div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-400 mb-1">Gói</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planConfig[viewItem.plan]?.color}`}>{planConfig[viewItem.plan]?.label}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-400 mb-1">Trạng thái</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[viewItem.status]?.color}`}>{statusConfig[viewItem.status]?.label}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-400 mb-1">Users</p>
                  <p className="font-bold text-slate-800">{viewItem.total_users || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-400 mb-1">Hạn JWT</p>
                  <p className="font-bold text-slate-800">{viewItem.jwt_duration ?? 10} phút</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setIsViewOpen(false); openEdit(viewItem); }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
                <Button
                  variant={viewItem.status === 'suspended' ? 'default' : 'destructive'}
                  className="flex-1"
                  onClick={() => { toggleStatus(viewItem.id); setIsViewOpen(false); }}
                >
                  {viewItem.status === 'suspended' ? <><Unlock className="h-4 w-4 mr-2" />Mở khóa</> : <><Lock className="h-4 w-4 mr-2" />Khóa</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} công ty</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="name">Tên công ty <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" defaultValue={editItem?.name} required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="code">Mã công ty <span className="text-red-500">*</span></Label>
                <Input id="code" name="code" defaultValue={editItem?.code} required placeholder="Ví dụ: CTY001" disabled={!!editItem} />
                {editItem && <input type="hidden" name="code" value={editItem.code} />}
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                <Input id="phone" name="phone" defaultValue={editItem?.phone} required />
              </div>
              <div>
                <Label htmlFor="ownerName">Chủ sở hữu <span className="text-red-500">*</span></Label>
                <Input id="ownerName" name="ownerName" defaultValue={editItem?.owner_name} required />
              </div>
              <div>
                <Label htmlFor="ownerEmail">Email <span className="text-red-500">*</span></Label>
                <Input id="ownerEmail" name="ownerEmail" type="email" defaultValue={editItem?.owner_email} required />
              </div>
              <div>
                <Label htmlFor="plan">Gói dịch vụ</Label>
                <select id="plan" name="plan" defaultValue={editItem?.plan || 'starter'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <Label htmlFor="jwt_duration">Setime JWT (phút)</Label>
                <Input id="jwt_duration" name="jwt_duration" type="number" min={1} defaultValue={editItem?.jwt_duration ?? 10} required placeholder="Ví dụ: 10" />
              </div>
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status || 'active'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="active">Hoạt động</option>
                  <option value="suspended">Tạm khóa</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Địa chỉ <span className="text-red-500">*</span></Label>
                <Input id="address" name="address" defaultValue={editItem?.address} required />
              </div>
              <div className="col-span-2">
                <Label>Ảnh đại diện / Logo công ty</Label>
                <ImageUpload
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url)}
                  bucket="avatars"
                  className="mt-1"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang xử lý...</>
              ) : (
                editItem ? 'Lưu thay đổi' : 'Khởi tạo công ty & Gửi email'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}