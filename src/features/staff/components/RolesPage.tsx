'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Shield,
  Edit,
  Trash2,
  Search,
  Check,
  Lock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sliders,
  CheckSquare,
  Square,
  Grid,
  List,
  Eye,
  Key,
  Building,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  Settings,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBRole } from '@/lib/supabase/types';
import { getRoleLabel } from '@/lib/constants/roles';
import { toast } from 'sonner';

export interface PermGroup {
  group: string;
  icon: any;
  items: { key: string; label: string }[];
}

export const ALL_PERMISSIONS: PermGroup[] = [
  {
    group: 'Tổng quan & Báo cáo',
    icon: BarChart2,
    items: [
      { key: 'dashboard.read', label: 'Xem trang tổng quan' },
      { key: 'reports.read', label: 'Xem báo cáo thống kê' },
      { key: 'activity_logs.read', label: 'Xem nhật ký hoạt động' },
    ],
  },
  {
    group: 'Bất động sản',
    icon: Building,
    items: [
      { key: 'buildings.read', label: 'Xem tòa nhà' },
      { key: 'buildings.write', label: 'Thêm/Sửa tòa nhà' },
      { key: 'buildings.delete', label: 'Xóa tòa nhà' },
      { key: 'rooms.read', label: 'Xem danh sách phòng' },
      { key: 'rooms.write', label: 'Thêm/Sửa thông tin phòng' },
      { key: 'rooms.delete', label: 'Xóa phòng' },
    ],
  },
  {
    group: 'Khách hàng & Lịch hẹn (CRM)',
    icon: Users,
    items: [
      { key: 'leads.read', label: 'Xem leads chăm sóc' },
      { key: 'leads.write', label: 'Thêm/Sửa leads chăm sóc' },
      { key: 'leads.delete', label: 'Xóa leads chăm sóc' },
      { key: 'appointments.read', label: 'Xem lịch hẹn xem phòng' },
      { key: 'appointments.write', label: 'Quản lý lịch hẹn xem phòng' },
      { key: 'appointments.delete', label: 'Hủy/Xóa lịch hẹn' },
    ],
  },
  {
    group: 'Đội ngũ Nhân sự & KPI',
    icon: Briefcase,
    items: [
      { key: 'users.read', label: 'Xem danh sách tài khoản người dùng' },
      { key: 'users.write', label: 'Tạo/Chỉnh sửa người dùng' },
      { key: 'users.delete', label: 'Khóa/Xóa người dùng' },
      { key: 'managers.read', label: 'Xem danh sách quản lý' },
      { key: 'managers.write', label: 'Phân công/Quản lý quản lý' },
      { key: 'kpi.read', label: 'Xem báo cáo chỉ tiêu KPI' },
      { key: 'kpi.write', label: 'Thiết lập/Giao chỉ tiêu KPI' },
    ],
  },
  {
    group: 'Hợp đồng & Chủ nhà',
    icon: FileText,
    items: [
      { key: 'landlords.read', label: 'Xem thông tin chủ nhà' },
      { key: 'landlords.write', label: 'Thêm/Sửa chủ nhà' },
      { key: 'landlords.delete', label: 'Xóa thông tin chủ nhà' },
      { key: 'contracts.read', label: 'Xem hợp đồng thuê' },
      { key: 'contracts.write', label: 'Thêm/Sửa hợp đồng thuê' },
      { key: 'contracts.delete', label: 'Hủy/Xóa hợp đồng thuê' },
    ],
  },
  {
    group: 'Hóa đơn, Dịch vụ & Thông báo',
    icon: DollarSign,
    items: [
      { key: 'services.read', label: 'Xem chỉ số dịch vụ điện/nước' },
      { key: 'services.write', label: 'Cập nhật chỉ số dịch vụ' },
      { key: 'invoices.read', label: 'Xem hóa đơn thanh toán' },
      { key: 'invoices.write', label: 'Tạo/Sửa hóa đơn' },
      { key: 'invoices.delete', label: 'Hủy/Xóa hóa đơn' },
      { key: 'notifications.read', label: 'Xem thông báo hệ thống' },
      { key: 'notifications.write', label: 'Gửi thông báo hệ thống' },
    ],
  },
  {
    group: 'Cấu hình Phân quyền',
    icon: Settings,
    items: [
      { key: 'roles.read', label: 'Xem danh sách phân quyền' },
      { key: 'roles.write', label: 'Chỉnh sửa ma trận phân quyền' },
    ],
  },
];

const TOTAL_PERMISSION_KEYS = ALL_PERMISSIONS.reduce(
  (acc, g) => acc + g.items.length,
  0
);

export function RolesPage() {
  const { company, hasPermission } = useAuth();
  const [roleList, setRoleList] = useState<DBRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

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
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const excludedRoleNames = useMemo(
    () => ['super_admin', 'super admin', 'customer', 'tenant'],
    []
  );

  const filtered = useMemo(() => {
    return roleList.filter(
      (r) =>
        !excludedRoleNames.includes((r.name || '').trim().toLowerCase()) &&
        (r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [roleList, searchQuery, excludedRoleNames]);

  // Metrics
  const totalRoles = filtered.length;
  const systemRolesCount = useMemo(
    () => filtered.filter((r) => r.is_system).length,
    [filtered]
  );
  const customRolesCount = useMemo(
    () => filtered.filter((r) => !r.is_system).length,
    [filtered]
  );

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error('Không thể xóa vai trò hệ thống mặc định');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa vai trò tùy chỉnh này?')) return;
    try {
      const res = await fetch(`/api/roles?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi khi xóa vai trò');
      }
      toast.success('Đã xóa vai trò thành công');
      fetchRoles();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi xóa vai trò');
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setSelectedPerms([]);
    setIsFormOpen(true);
  };

  const openEdit = (item: DBRole) => {
    setEditItem(item);
    setSelectedPerms(
      item.permissions.includes('*') || item.permissions.includes('all')
        ? ALL_PERMISSIONS.flatMap((g) => g.items.map((i) => i.key))
        : [...item.permissions]
    );
    setIsFormOpen(true);
  };

  const openView = (item: DBRole) => {
    setViewItem(item);
    setIsViewOpen(true);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleGroupAll = (group: PermGroup) => {
    const keysInGroup = group.items.map((i) => i.key);
    const allSelected = keysInGroup.every((k) => selectedPerms.includes(k));

    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((k) => !keysInGroup.includes(k)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...keysInGroup])));
    }
  };

  const selectAllPermissions = () => {
    const allKeys = ALL_PERMISSIONS.flatMap((g) => g.items.map((i) => i.key));
    setSelectedPerms(allKeys);
  };

  const deselectAllPermissions = () => {
    setSelectedPerms([]);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const name = ((fd.get('name') as string) || '').trim();
    const description = ((fd.get('description') as string) || '').trim();
    const permissions = selectedPerms;

    if (!name) {
      toast.error('Vui lòng nhập tên vai trò');
      setSaving(false);
      return;
    }

    try {
      if (editItem) {
        if (editItem.is_system) {
          throw new Error('Không thể chỉnh sửa vai trò hệ thống mặc định');
        }

        const res = await fetch('/api/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editItem.id, name, description, permissions }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Lỗi lưu vai trò');
        }
        toast.success('Cập nhật vai trò thành công!');
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
        toast.success('Tạo vai trò mới thành công!');
      }

      await fetchRoles();
      setIsFormOpen(false);
      setEditItem(null);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi lưu vai trò');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-accent" /> Vai trò & Phân quyền Hệ thống
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Cấu hình danh sách vai trò, ma trận phân quyền chi tiết cho từng phân hệ nghiệp vụ doanh nghiệp.
          </p>
        </div>
        {hasPermission('roles.write') && (
          <Button
            onClick={openAdd}
            className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-11 px-5 shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" /> Thêm vai trò tùy chỉnh
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-ink-muted">TỔNG VAI TRÒ</p>
              <p className="text-2xl font-extrabold text-ink mt-1">{totalRoles}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-700">VAI TRÒ HỆ THỐNG</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{systemRolesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-600">VAI TRÒ TÙY CHỈNH</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{customRolesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-600">TỔNG QUYỀN TRUY CẬP</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{TOTAL_PERMISSION_KEYS}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Key className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Card View */}
      <Card className="rounded-2xl border border-border bg-white shadow-xs p-6 space-y-4">
        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder="Tìm kiếm vai trò hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl h-10 border-border bg-bg-base/30 text-xs"
            />
          </div>

          <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white shadow-xs text-accent'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Grid className="h-3.5 w-3.5" /> Dạng Thẻ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'matrix'
                  ? 'bg-white shadow-xs text-accent'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Ma Trận Phân Quyền
            </button>
          </div>
        </div>

        {/* Content Render */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-ink-muted font-medium">Đang tải danh sách vai trò...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-bg-base/30">
            <Shield className="h-8 w-8 mx-auto mb-2 text-ink-muted opacity-40" />
            <p className="text-sm font-medium text-ink-muted">Không tìm thấy vai trò nào phù hợp</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const isSuperAdmin =
                item.permissions.includes('*') ||
                item.permissions.includes('all') ||
                item.permissions.length >= TOTAL_PERMISSION_KEYS;

              const permCount = isSuperAdmin
                ? TOTAL_PERMISSION_KEYS
                : Math.min(item.permissions.length, TOTAL_PERMISSION_KEYS);

              return (
                <Card
                  key={item.id}
                  className="rounded-2xl border border-border bg-white shadow-xs hover:shadow-md transition-all cursor-pointer group p-5 flex flex-col justify-between"
                  onClick={() => openView(item)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            item.is_system
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {item.is_system ? <Lock className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                        </div>
                        <div>
                          <h3 className="font-heading font-extrabold text-base text-ink group-hover:text-accent transition-colors">
                            {getRoleLabel(item.name)}
                          </h3>
                          <p className="text-[11px] text-ink-muted font-mono">{item.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.is_system ? (
                          <Badge variant="outline" className="bg-slate-900 text-white border-slate-900 font-bold text-xs">
                            Hệ thống
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs">
                            Tùy chỉnh
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed min-h-[36px]">
                      {item.description || 'Chưa có mô tả chi tiết cho vai trò này.'}
                    </p>

                    {/* Permissions Badge Counter & List Preview */}
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-muted">Quyền truy cập:</span>
                        <span className="font-bold text-accent font-mono">
                          {isSuperAdmin ? `Toàn quyền (${TOTAL_PERMISSION_KEYS}/${TOTAL_PERMISSION_KEYS})` : `${permCount} / ${TOTAL_PERMISSION_KEYS} quyền`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-[64px] overflow-hidden">
                        {isSuperAdmin ? (
                          <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                            ⚡ Toàn quyền Quản trị công ty
                          </span>
                        ) : (
                          item.permissions.slice(0, 5).map((pKey) => {
                            let label = pKey;
                            ALL_PERMISSIONS.forEach((g) => {
                              const found = g.items.find((i) => i.key === pKey);
                              if (found) label = found.label;
                            });
                            return (
                              <span
                                key={pKey}
                                className="text-[11px] font-medium bg-bg-base text-ink-muted px-2 py-0.5 rounded-md border border-border"
                              >
                                {label}
                              </span>
                            );
                          })
                        )}
                        {!isSuperAdmin && item.permissions.length > 5 && (
                          <span className="text-[11px] font-bold text-accent px-1.5 py-0.5">
                            +{item.permissions.length - 5} quyền khác
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div
                    className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openView(item)}
                      className="h-8 rounded-lg text-xs font-bold text-ink-muted hover:text-accent gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Chi tiết
                    </Button>

                    {!item.is_system && hasPermission('roles.write') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="h-8 rounded-lg text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                        >
                          <Edit className="h-3.5 w-3.5" /> Sửa quyền
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.is_system)}
                          className="h-8 rounded-lg text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Matrix Table View */
          <div className="border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[700px]">
              <thead className="bg-bg-subtle/80 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-ink uppercase w-1/3">
                    Phân hệ & Quyền hạn hệ thống
                  </th>
                  {filtered.map((role) => (
                    <th key={role.id} className="px-4 py-3 text-center font-bold text-ink uppercase">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{getRoleLabel(role.name)}</span>
                        {role.is_system && (
                          <span className="text-[10px] text-slate-500 font-normal">(Hệ thống)</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-ink">
                {ALL_PERMISSIONS.map((group) => {
                  const GroupIcon = group.icon;
                  return [
                    <tr key={`header-${group.group}`} className="bg-accent/5 font-extrabold text-accent">
                      <td colSpan={filtered.length + 1} className="px-4 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <GroupIcon className="h-4 w-4" /> {group.group}
                        </div>
                      </td>
                    </tr>,
                    ...group.items.map((perm) => (
                      <tr key={perm.key} className="hover:bg-accent/5 transition-all">
                        <td className="px-5 py-2.5 font-medium text-ink flex items-center justify-between">
                          <span>{perm.label}</span>
                          <span className="font-mono text-[10px] text-ink-muted">{perm.key}</span>
                        </td>
                        {filtered.map((role) => {
                          const hasPerm =
                            role.permissions.includes('*') ||
                            role.permissions.includes('all') ||
                            role.permissions.includes(perm.key);
                          return (
                            <td key={role.id} className="px-4 py-2.5 text-center">
                              {hasPerm ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="h-4 w-4 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Add / Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="font-heading font-extrabold text-lg text-ink flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              {editItem ? `Chỉnh sửa quyền: ${getRoleLabel(editItem.name)}` : 'Thêm vai trò mới'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-3">
            <div>
              <Label htmlFor="name" className="text-xs font-bold text-ink uppercase">
                Tên vai trò <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={editItem?.name ?? ''}
                disabled={editItem?.is_system}
                required
                placeholder="VD: Trưởng phòng Kinh doanh, Nhân viên Kỹ thuật..."
                className="rounded-xl h-10"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs font-bold text-ink uppercase">
                Mô tả nhiệm vụ & phạm vi quyền hạn
              </Label>
              <Input
                id="description"
                name="description"
                defaultValue={editItem?.description ?? ''}
                placeholder="Mô tả công việc và thẩm quyền của vai trò này..."
                className="rounded-xl h-10"
              />
            </div>

            {/* Permission Picker Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="font-bold text-sm text-ink">Phân quyền chi tiết theo nhóm</h4>
                  <p className="text-xs text-ink-muted">
                    Chọn các quyền được phép thực thi đối với vai trò này.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full font-mono">
                    {selectedPerms.length} / {TOTAL_PERMISSION_KEYS} đã chọn
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllPermissions}
                    className="h-7 text-[11px] font-bold rounded-lg"
                  >
                    Chọn tất cả
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllPermissions}
                    className="h-7 text-[11px] font-bold rounded-lg text-red-600 hover:bg-red-50"
                  >
                    Bỏ chọn
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {ALL_PERMISSIONS.map((group) => {
                  const GroupIcon = group.icon;
                  const keysInGroup = group.items.map((i) => i.key);
                  const isAllGroupSelected = keysInGroup.every((k) => selectedPerms.includes(k));

                  return (
                    <div
                      key={group.group}
                      className="border border-border rounded-xl p-4 bg-bg-base/20 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2 font-bold text-sm text-ink">
                          <GroupIcon className="h-4 w-4 text-accent" /> {group.group}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleGroupAll(group)}
                          className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                        >
                          {isAllGroupSelected ? (
                            <>
                              <CheckSquare className="h-3.5 w-3.5" /> Bỏ chọn nhóm
                            </>
                          ) : (
                            <>
                              <Square className="h-3.5 w-3.5" /> Chọn cả nhóm
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.items.map((item) => {
                          const isChecked = selectedPerms.includes(item.key);
                          return (
                            <label
                              key={item.key}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-accent/10 border-accent/40 text-ink font-semibold shadow-2xs'
                                  : 'bg-white border-border text-ink-muted hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePerm(item.key)}
                                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                              />
                              <div className="text-xs">
                                <p className="font-bold text-ink">{item.label}</p>
                                <p className="font-mono text-[10px] text-ink-muted">{item.key}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl h-10 px-4">
                Hủy
              </Button>
              <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-10 px-6">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu quyền vai trò
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 font-heading font-extrabold text-base text-ink">
              <ShieldCheck className="h-5 w-5 text-accent" /> Chi tiết vai trò & quyền hạn
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-3 text-sm text-ink">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-base border border-border">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    viewItem.is_system ? 'bg-slate-900 text-white' : 'bg-accent/10 text-accent'
                  }`}
                >
                  {viewItem.is_system ? <Lock className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-base text-ink">{getRoleLabel(viewItem.name)}</h4>
                  <p className="text-xs text-ink-muted font-mono">{viewItem.name}</p>
                </div>
              </div>

              <div className="text-xs space-y-1 text-ink-muted">
                <p className="font-semibold text-ink">Mô tả:</p>
                <p className="bg-bg-base/40 p-2.5 rounded-xl border border-border leading-relaxed">
                  {viewItem.description || 'Chưa có mô tả.'}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink">Danh sách quyền hạn:</span>
                  <span className="font-mono text-accent font-bold">
                    {viewItem.permissions.includes('*') || viewItem.permissions.includes('all')
                      ? `Toàn quyền (${TOTAL_PERMISSION_KEYS}/${TOTAL_PERMISSION_KEYS})`
                      : `${Math.min(viewItem.permissions.length, TOTAL_PERMISSION_KEYS)} / ${TOTAL_PERMISSION_KEYS} quyền`}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {ALL_PERMISSIONS.map((group) => {
                    const groupPerms = group.items.filter(
                      (i) =>
                        viewItem.permissions.includes('*') ||
                        viewItem.permissions.includes('all') ||
                        viewItem.permissions.includes(i.key)
                    );

                    if (groupPerms.length === 0) return null;

                    return (
                      <div key={group.group} className="text-xs space-y-1 bg-bg-base/30 p-2.5 rounded-xl border border-border">
                        <p className="font-bold text-accent">{group.group}</p>
                        <ul className="list-disc list-inside text-ink-muted space-y-0.5 pl-1">
                          {groupPerms.map((p) => (
                            <li key={p.key}>{p.label}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
