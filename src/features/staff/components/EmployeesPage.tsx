'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, User, Loader2, AlertCircle } from 'lucide-react';
import { useEmployees } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import { authFetch } from '@/lib/supabase/auth-fetch';
import type { DBEmployee, DBRole } from '@/lib/supabase/types';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  active: 'Đang làm việc',
  inactive: 'Đã nghỉ việc',
};

export function EmployeesPage() {
  const { company, hasPermission } = useAuth();
  const { items: employeeList, loading, error, add, update, remove } = useEmployees(company?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState<DBEmployee | null>(null);
  const [viewItem, setViewItem] = useState<DBEmployee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<DBRole[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          setRoles(data || []);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };
    fetchRoles();
  }, [company?.id]);

  const filtered = employeeList.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.department ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      department: formData.get('department') as string || null,
      position: formData.get('position') as string || null,
      join_date: formData.get('join_date') as string || null,
      status: formData.get('status') as any,
    };

    try {
      if (editItem) {
        await update(editItem.id, payload);
        toast.success('Cập nhật nhân viên thành công!');
      } else {
        const response = await authFetch('/api/employees/create', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(resData.error || 'Có lỗi xảy ra khi tạo nhân viên');
        }

        if (resData.emailSent) {
          toast.success('Tạo nhân viên thành công! Một email kích hoạt đã được gửi.');
        } else {
          toast.success('Tạo nhân viên thành công! Tuy nhiên email kích hoạt chưa gửi được.', {
            description: resData.emailError || 'Kiểm tra lại cấu hình MAILJET_API_KEY / MAILJET_API_SECRET',
          });
        }
      }
      
      setIsDialogOpen(false);
      setEditItem(null);
    } catch (err: any) {
       toast.error(err.message || 'Lỗi xử lý lưu thông tin nhân viên');
    } finally {
       setSaving(false);
    }
  };

  const openAdd = () => { setEditItem(null); setIsDialogOpen(true); };
  const openEdit = (item: DBEmployee) => { setEditItem(item); setIsDialogOpen(true); };
  const openView = (item: DBEmployee) => { setViewItem(item); setIsViewOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Nhân viên</h1>
          <p className="text-slate-500">Quản lý nhân sự và thông tin nhân viên</p>
        </div>
        {hasPermission('employees.write') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Thêm nhân viên</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} nhân viên</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="name">Họ tên <span className="text-red-500">*</span></Label><Input id="name" name="name" defaultValue={editItem?.name} required /></div>
                  <div><Label htmlFor="email">Email <span className="text-red-500">*</span></Label><Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="phone">Số điện thoại</Label><Input id="phone" name="phone" defaultValue={editItem?.phone ?? ''} /></div>
                  <div><Label htmlFor="department">Phòng ban</Label><Input id="department" name="department" defaultValue={editItem?.department ?? ''} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Chức vụ</Label>
                    <select
                      id="position"
                      name="position"
                      defaultValue={editItem?.position ?? ''}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">-- Chọn chức vụ --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                      {editItem?.position && !roles.some((r) => r.name === editItem.position) && (
                        <option value={editItem.position}>{editItem.position}</option>
                      )}
                    </select>
                  </div>
                  <div><Label htmlFor="join_date">Ngày vào làm</Label><Input id="join_date" name="join_date" type="date" defaultValue={editItem?.join_date ?? ''} /></div>
                </div>
                <div>
                  <Label htmlFor="status">Trạng thái</Label>
                  <select id="status" name="status" defaultValue={editItem?.status ?? 'active'} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Đã nghỉ việc</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
            <Input placeholder="Tìm theo tên, email hoặc phòng ban..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Họ tên</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Phòng ban</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Chức vụ</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    {hasPermission('employees.write') && <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        openView(item);
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.email ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.department ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.position ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                          {statusLabels[item.status]}
                        </Badge>
                      </td>
                      {hasPermission('employees.write') && (
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) remove(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openView(item)}
                    className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink text-sm">{item.name}</span>
                      <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                        {statusLabels[item.status]}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      <div>
                        <span className="font-medium text-ink-muted">Phòng ban:</span>{' '}
                        <span className="text-ink font-semibold">{item.department ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Chức vụ:</span>{' '}
                        <span className="text-ink font-semibold">{item.position ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">SĐT:</span>{' '}
                        <span className="text-ink font-mono">{item.phone ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Ngày vào:</span>{' '}
                        <span className="text-ink font-mono">{item.join_date ?? '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs text-ink-muted truncate max-w-[180px] font-mono">
                        {item.email ?? '—'}
                      </div>
                      {hasPermission('employees.write') && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) remove(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có nhân viên nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" />Chi tiết nhân viên</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Họ tên:</span> <span className="font-medium">{viewItem.name}</span></div>
                <div><span className="text-slate-500">Email:</span> {viewItem.email ?? '—'}</div>
                <div><span className="text-slate-500">SĐT:</span> {viewItem.phone ?? '—'}</div>
                <div><span className="text-slate-500">Phòng ban:</span> {viewItem.department ?? '—'}</div>
                <div><span className="text-slate-500">Chức vụ:</span> {viewItem.position ?? '—'}</div>
                <div><span className="text-slate-500">Ngày vào làm:</span> {viewItem.join_date ?? '—'}</div>
                <div><span className="text-slate-500">Trạng thái:</span> <Badge variant={viewItem.status === 'active' ? 'default' : 'secondary'}>{statusLabels[viewItem.status]}</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
