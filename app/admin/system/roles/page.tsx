'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Shield, Edit, Trash2, Search, Check, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBRole } from '@/lib/supabase/types';

const ALL_PERMISSIONS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: 'Bất động sản',
    items: [
      { key: 'buildings.read', label: 'Xem tòa nhà' },
      { key: 'buildings.write', label: 'Quản lý tòa nhà' },
      { key: 'rooms.read', label: 'Xem phòng' },
      { key: 'rooms.write', label: 'Quản lý phòng' },
    ],
  },
  {
    group: 'Khách hàng',
    items: [
      { key: 'leads.read', label: 'Xem leads' },
      { key: 'leads.write', label: 'Quản lý leads' },
      { key: 'consultations.read', label: 'Xem tư vấn' },
      { key: 'consultations.write', label: 'Quản lý tư vấn' },
      { key: 'appointments.read', label: 'Xem lịch hẹn' },
      { key: 'appointments.write', label: 'Quản lý lịch hẹn' },
    ],
  },
  {
    group: 'Nhân sự',
    items: [
      { key: 'employees.read', label: 'Xem nhân viên' },
      { key: 'employees.write', label: 'Quản lý nhân viên' },
    ],
  },
  {
    group: 'Hợp đồng & Chủ nhà',
    items: [
      { key: 'landlords.read', label: 'Xem chủ nhà' },
      { key: 'landlords.write', label: 'Quản lý chủ nhà' },
      { key: 'contracts.read', label: 'Xem hợp đồng' },
      { key: 'contracts.write', label: 'Quản lý hợp đồng' },
    ],
  },
  {
    group: 'Hóa đơn & Dịch vụ',
    items: [
      { key: 'services.read', label: 'Xem chỉ số dịch vụ' },
      { key: 'services.write', label: 'Quản lý chỉ số dịch vụ' },
      { key: 'invoices.read', label: 'Xem hóa đơn' },
      { key: 'invoices.write', label: 'Quản lý hóa đơn' },
    ],
  },
  {
    group: 'Hệ thống',
    items: [
      { key: 'reports.read', label: 'Xem báo cáo' },
      { key: 'accounts.read', label: 'Xem tài khoản' },
      { key: 'accounts.write', label: 'Quản lý tài khoản' },
      { key: 'roles.read', label: 'Xem phân quyền' },
      { key: 'roles.write', label: 'Quản lý phân quyền' },
    ],
  },
];

export default function RolesPage() {
  const { company, hasPermission } = useAuth();
  const [roleList, setRoleList] = useState<DBRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editItem, setEditItem] = useState<DBRole | null>(null);
  const [viewItem, setViewItem] = useState<DBRole | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roles');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi tải vai trò');
      }
      const data = await res.json();
      setRoleList(data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filtered = roleList.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('Không thể xóa vai trò hệ thống');
      return;
    }
    if (!confirm('Bạn có chắc muốn xóa vai trò này?')) return;
    try {
      const res = await fetch(`/api/roles?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi khi xóa vai trò');
      }
      await fetchRoles();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa vai trò');
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setSelectedPerms([]);
    setIsFormOpen(true);
  };

  const openEdit = (item: DBRole) => {
    setEditItem(item);
    setSelectedPerms(item.permissions.includes('*') ? ['*'] : [...item.permissions]);
    setIsFormOpen(true);
  };

  const openView = (item: DBRole) => { setViewItem(item); setIsViewOpen(true); };

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const description = fd.get('description') as string;
    const permissions = selectedPerms;

    try {
      if (editItem) {
        if (editItem.is_system) throw new Error('Không thể chỉnh sửa vai trò hệ thống');

        const res = await fetch('/api/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editItem.id, name, description, permissions }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Lỗi lưu vai trò');
        }
      } else {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, permissions }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Lỗi lưu vai trò');
        }
      }

      await fetchRoles();
      setIsFormOpen(false);
      setEditItem(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi lưu vai trò');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Vai trò & Phân quyền</h1>
          <p className="text-ink-muted">Quản lý vai trò và quyền hạn trong hệ thống</p>
        </div>
        {hasPermission('roles.write') && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm vai trò
          </Button>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder="Tìm vai trò..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((item) => {
                const isSuperAdmin = item.permissions.includes('*');
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 border rounded-lg hover:bg-bg-subtle dark:hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all transition-colors cursor-pointer"
                    onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; openView(item); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.is_system ? 'bg-slate-900 text-white' : 'bg-bg-subtle text-ink-muted'}`}>
                        {item.is_system ? <Lock className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ink">{item.name}</span>
                          {item.is_system && (
                            <span className="text-xs bg-border-subtle text-ink-muted px-2 py-0.5 rounded-full">Hệ thống</span>
                          )}
                          <span className="text-xs text-ink-muted">{item.users_count} người dùng</span>
                        </div>
                        <p className="text-sm text-ink-muted mt-0.5">{item.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {isSuperAdmin ? (
                            <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded">Toàn quyền</span>
                          ) : (
                            item.permissions.slice(0, 5).map((p) => (
                              <span key={p} className="text-xs bg-bg-subtle text-ink-muted px-2 py-0.5 rounded">{p}</span>
                            ))
                          )}
                          {!isSuperAdmin && item.permissions.length > 5 && (
                            <span className="text-xs text-ink-muted">+{item.permissions.length - 5} quyền khác</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!item.is_system && hasPermission('roles.write') && (
                      <div className="flex items-center gap-1 ml-auto sm:ml-0">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.is_system); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-ink-muted text-center py-4">Không tìm thấy vai trò nào</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {viewItem?.name}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-ink-muted">{viewItem.description}</p>
              {viewItem.permissions.includes('*') ? (
                <div className="p-3 bg-slate-900 text-white rounded-lg text-sm text-center">Toàn quyền hệ thống</div>
              ) : (
                ALL_PERMISSIONS.map((group) => {
                  const active = group.items.filter((item) => viewItem.permissions.includes(item.key));
                  if (!active.length) return null;
                  return (
                    <div key={group.group}>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{group.group}</p>
                      <div className="flex flex-wrap gap-2">
                        {active.map((item) => (
                          <span key={item.key} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                            <Check className="h-3 w-3" />{item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} vai trò</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 pt-2">
            <div>
              <Label htmlFor="name">Tên vai trò</Label>
              <Input id="name" name="name" defaultValue={editItem?.name} required />
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Input id="description" name="description" defaultValue={editItem?.description ?? ''} />
            </div>

            <div>
              <p className="text-sm font-medium text-ink mb-3">Phân quyền</p>
              <div className="space-y-4">
                {ALL_PERMISSIONS.map((group) => (
                  <div key={group.group}>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{group.group}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map((perm) => (
                        <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPerms.includes(perm.key)}
                            onChange={() => togglePerm(perm.key)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-ink-muted">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />}
              Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
