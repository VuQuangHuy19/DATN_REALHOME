'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  User,
  Loader2,
  AlertCircle,
  Users,
  Briefcase,
  UserCheck,
  Building2,
  Phone,
  Mail,
  Calendar,
  LayoutGrid,
  List,
  Filter,
  BarChart2,
} from 'lucide-react';
import { useEmployees } from '@/features/staff/hooks/useStaff';
import { useAuth } from '@/lib/auth/AuthContext';
import { authFetch } from '@/lib/supabase/auth-fetch';
import type { DBEmployee, DBRole } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { getRoleLabel } from '@/lib/constants/roles';
import Link from 'next/link';

const statusLabels: Record<string, string> = {
  active: 'Đang làm việc',
  inactive: 'Đã nghỉ việc',
};

const departmentColors: Record<string, string> = {
  Sale: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Kinh doanh': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Vận hành': 'bg-blue-50 text-blue-700 border-blue-200',
  'Kế toán': 'bg-purple-50 text-purple-700 border-purple-200',
  'Nhân sự': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kỹ thuật': 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

export function EmployeesPage() {
  const { company, hasPermission } = useAuth();
  const { items: employeeList, loading, error, update, remove } = useEmployees(company?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [editItem, setEditItem] = useState<DBEmployee | null>(null);
  const [viewItem, setViewItem] = useState<DBEmployee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<DBRole[]>([]);
  const [empErrors, setEmpErrors] = useState<Record<string, string>>({});

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

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employeeList.forEach((e) => {
      const d = (e as any).department;
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [employeeList]);

  // Available roles for select, excluding non-staff roles
  const availableRoles = useMemo(() => {
    const excluded = ['super_admin', 'super admin', 'customer', 'tenant'];
    return roles.filter((r) => !excluded.includes((r.name || '').trim().toLowerCase()));
  }, [roles]);

  const filtered = useMemo(() => {
    return employeeList.filter((e) => {
      const name = e.full_name || (e as any).name || '';
      const email = e.email || '';
      const phone = e.phone || '';
      const dept = (e as any).department || '';
      const role = e.role || (e as any).position || '';
      const term = searchQuery.toLowerCase();

      const matchSearch =
        name.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        dept.toLowerCase().includes(term);

      const matchDept = !deptFilter || dept === deptFilter;
      const matchRole = !roleFilter || role === roleFilter;
      const matchStatus = !statusFilter || e.status === statusFilter;

      return matchSearch && matchDept && matchRole && matchStatus;
    });
  }, [employeeList, searchQuery, deptFilter, roleFilter, statusFilter]);

  // Metrics
  const totalEmployees = employeeList.length;
  const activeCount = useMemo(() => employeeList.filter((e) => e.status === 'active').length, [employeeList]);
  const salesCount = useMemo(
    () => employeeList.filter((e) => (e.role || (e as any).position) === 'sales_agent').length,
    [employeeList]
  );
  const managerCount = useMemo(
    () => employeeList.filter((e) => (e.role || (e as any).position) === 'manager').length,
    [employeeList]
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = ((formData.get('name') as string) || '').trim();
    const email = ((formData.get('email') as string) || '').trim();

    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Không được để trống';
    if (!email) errs.email = 'Không được để trống';

    if (Object.keys(errs).length > 0) {
      setEmpErrors(errs);
      return;
    }
    setEmpErrors({});
    setSaving(true);

    const payload = {
      company_id: company?.id ?? '',
      name,
      email: email || null,
      phone: (formData.get('phone') as string) || null,
      department: (formData.get('department') as string) || null,
      position: (formData.get('position') as string) || null,
      join_date: (formData.get('join_date') as string) || null,
      status: formData.get('status') as any,
    };

    try {
      if (editItem) {
        await update(editItem.id, payload);
        toast.success('Cập nhật thông tin nhân viên thành công!');
      } else {
        const response = await authFetch('/api/employees/create', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || 'Có lỗi xảy ra khi tạo nhân viên mới');
        }

        if (resData.emailSent) {
          toast.success('Tạo nhân viên mới thành công! Email mời kích hoạt đã được gửi.');
        } else {
          toast.success('Tạo nhân viên thành công!', {
            description: resData.emailError || 'Kiểm tra lại cấu hình gửi mail',
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

  const openAdd = () => {
    setEditItem(null);
    setEmpErrors({});
    setIsDialogOpen(true);
  };

  const openEdit = (item: DBEmployee) => {
    setEditItem(item);
    setEmpErrors({});
    setIsDialogOpen(true);
  };

  const openView = (item: DBEmployee) => {
    setViewItem(item);
    setIsViewOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink flex items-center gap-2.5">
            <Users className="h-7 w-7 text-accent" /> Quản lý Đội ngũ Nhân sự
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Quản lý thông tin nhân viên, sơ đồ tổ chức phòng ban, chức vụ và theo dõi trạng thái làm việc toàn công ty.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/admin/hr/kpi">
            <Button variant="outline" className="rounded-xl h-11 px-4 border-border font-bold text-xs gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-600" /> Báo cáo KPI & Doanh số
            </Button>
          </Link>
          {hasPermission('employees.write') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-11 px-5 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" /> Thêm nhân viên mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white p-6 rounded-2xl border border-border shadow-2xl">
                <DialogHeader className="pb-3 border-b border-border">
                  <DialogTitle className="font-heading font-extrabold text-lg text-ink">
                    {editItem ? 'Chỉnh sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} noValidate className="space-y-4 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="name" className="text-xs font-bold text-ink uppercase">
                        Họ tên <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editItem?.full_name || (editItem as any)?.name}
                        onChange={() => empErrors.name && setEmpErrors((prev) => ({ ...prev, name: '' }))}
                        className={`rounded-xl h-10 ${empErrors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        placeholder="VD: Nguyễn Văn A"
                      />
                      {empErrors.name && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {empErrors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs font-bold text-ink uppercase">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editItem?.email ?? ''}
                        onChange={() => empErrors.email && setEmpErrors((prev) => ({ ...prev, email: '' }))}
                        className={`rounded-xl h-10 ${empErrors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        placeholder="nv@realhome.vn"
                      />
                      {empErrors.email && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {empErrors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="phone" className="text-xs font-bold text-ink uppercase">
                        Số điện thoại
                      </Label>
                      <Input id="phone" name="phone" defaultValue={editItem?.phone ?? ''} className="rounded-xl h-10" placeholder="0987654321" />
                    </div>
                    <div>
                      <Label htmlFor="department" className="text-xs font-bold text-ink uppercase">
                        Phòng ban
                      </Label>
                      <Input
                        id="department"
                        name="department"
                        defaultValue={(editItem as any)?.department ?? ''}
                        className="rounded-xl h-10"
                        placeholder="VD: Kinh doanh, Vận hành..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="position" className="text-xs font-bold text-ink uppercase">
                        Chức vụ / Vai trò
                      </Label>
                      <select
                        id="position"
                        name="position"
                        defaultValue={editItem?.role || (editItem as any)?.position || ''}
                        className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">-- Chọn chức vụ --</option>
                        {availableRoles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {getRoleLabel(r.name)}
                          </option>
                        ))}
                        {(editItem?.role || (editItem as any)?.position) &&
                          !['super_admin', 'super admin', 'customer', 'tenant'].includes(
                            ((editItem?.role || (editItem as any)?.position) || '').trim().toLowerCase()
                          ) &&
                          !roles.some((r) => r.name === (editItem?.role || (editItem as any)?.position)) && (
                            <option value={editItem?.role || (editItem as any)?.position}>
                              {getRoleLabel(editItem?.role || (editItem as any)?.position)}
                            </option>
                          )}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="join_date" className="text-xs font-bold text-ink uppercase">
                        Ngày vào làm
                      </Label>
                      <Input id="join_date" name="join_date" type="date" defaultValue={(editItem as any)?.join_date ?? ''} className="rounded-xl h-10" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="status" className="text-xs font-bold text-ink uppercase">
                      Trạng thái làm việc
                    </Label>
                    <select
                      id="status"
                      name="status"
                      defaultValue={editItem?.status ?? 'active'}
                      className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="active">🟢 Đang làm việc</option>
                      <option value="inactive">🔴 Đã nghỉ việc</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-10 px-4">
                      Hủy
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-10 px-6">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu nhân sự
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-ink-muted">TỔNG NHÂN SỰ</p>
              <p className="text-2xl font-extrabold text-ink mt-1">{totalEmployees}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-600">ĐANG LÀM VIỆC</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-600">SALES & MÔI GIỚI</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{salesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-purple-600">QUẢN LÝ VẬN HÀNH</p>
              <p className="text-2xl font-extrabold text-purple-700 mt-1">{managerCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Toolbar & View Switcher */}
      <Card className="rounded-2xl border border-border bg-white shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder="Tìm theo tên, email, SĐT hoặc phòng ban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl h-10 border-border bg-bg-base/30 text-xs"
            />
          </div>

          {/* Filters & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-ink-muted font-bold mr-1">
              <Filter className="h-3.5 w-3.5" /> Lọc:
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tất cả phòng ban</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  Phòng {d}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tất cả chức vụ</option>
              <option value="sales_agent">Chuyên viên tư vấn / Sales</option>
              <option value="manager">Quản lý vận hành</option>
              <option value="company_admin">Giám đốc / Admin</option>
              <option value="accountant">Kế toán viên</option>
              <option value="employee">Nhân viên</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">🟢 Đang làm việc</option>
              <option value="inactive">🔴 Đã nghỉ việc</option>
            </select>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border ml-2">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-accent' : 'text-ink-muted hover:text-ink'
                }`}
                title="Hiển thị dạng bảng"
              >
                <List className="h-3.5 w-3.5" /> Bảng
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-accent' : 'text-ink-muted hover:text-ink'
                }`}
                title="Hiển thị dạng thẻ"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Thẻ
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-ink-muted font-medium">Đang tải danh sách nhân viên...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-bg-base/30">
            <User className="h-8 w-8 mx-auto mb-2 text-ink-muted opacity-40" />
            <p className="text-sm font-medium text-ink-muted">Không tìm thấy nhân viên nào phù hợp với bộ lọc</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-bg-subtle/80 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">Họ tên nhân viên</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">Email / Số điện thoại</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">Phòng ban</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">Chức vụ</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold text-ink-muted uppercase">Trạng thái</th>
                  {hasPermission('employees.write') && (
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-ink-muted uppercase">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-ink">
                {filtered.map((item) => {
                  const dept = (item as any).department || 'Chưa xếp';
                  const deptStyle = departmentColors[dept] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-accent/5 transition-all cursor-pointer group"
                      onClick={() => openView(item)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/10 text-accent font-extrabold flex items-center justify-center shrink-0">
                            {(item.full_name || (item as any).name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ink text-sm">{item.full_name || (item as any).name || '—'}</p>
                            <p className="text-[11px] text-ink-muted font-mono">
                              {(item as any).join_date ? `Vào làm: ${(item as any).join_date}` : '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-xs text-ink font-mono">{item.email ?? '—'}</p>
                        <p className="text-xs text-ink-muted font-mono">{item.phone ?? '—'}</p>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className={`font-semibold text-xs ${deptStyle}`}>
                          {dept}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200 font-bold text-xs">
                          {getRoleLabel(item.role || (item as any).position)}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="font-semibold">
                          {statusLabels[item.status]}
                        </Badge>
                      </td>

                      {hasPermission('employees.write') && (
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 text-ink-muted hover:text-accent rounded-lg"
                              onClick={() => openEdit(item)}
                              title="Chỉnh sửa thông tin"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                              onClick={() => {
                                if (confirm('Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?')) {
                                  remove(item.id);
                                }
                              }}
                              title="Xóa nhân viên"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const dept = (item as any).department || 'Chưa xếp';
              const deptStyle = departmentColors[dept] || 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <Card
                  key={item.id}
                  className="rounded-2xl border border-border bg-white shadow-xs hover:shadow-md transition-all cursor-pointer group overflow-hidden relative"
                  onClick={() => openView(item)}
                >
                  <div className="h-2 bg-gradient-to-r from-accent via-indigo-500 to-emerald-500" />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent font-black text-xl flex items-center justify-center shrink-0 shadow-2xs">
                          {(item.full_name || (item as any).name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-ink text-base group-hover:text-accent transition-colors">
                            {item.full_name || (item as any).name || '—'}
                          </h4>
                          <Badge variant="outline" className={`font-bold text-[11px] mt-1 ${deptStyle}`}>
                            {dept}
                          </Badge>
                        </div>
                      </div>

                      <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="font-semibold text-xs shrink-0">
                        {statusLabels[item.status]}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-ink-muted pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-muted">Chức vụ:</span>
                        <span className="font-bold text-ink">{getRoleLabel(item.role || (item as any).position)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-muted">Email:</span>
                        <span className="font-mono text-ink text-[11px] truncate max-w-[170px]">{item.email ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-muted">Số điện thoại:</span>
                        <span className="font-mono font-semibold text-ink">{item.phone ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-muted">Ngày vào làm:</span>
                        <span className="font-mono text-ink">{(item as any).join_date ?? '—'}</span>
                      </div>
                    </div>

                    {hasPermission('employees.write') && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="h-8 rounded-lg text-xs font-bold text-ink-muted hover:text-accent gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?')) {
                              remove(item.id);
                            }
                          }}
                          className="h-8 rounded-lg text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* View Detail Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 font-heading font-extrabold text-base text-ink">
              <User className="h-5 w-5 text-accent" /> Hồ sơ chi tiết nhân viên
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-3 text-sm text-ink">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-base border border-border">
                <div className="w-12 h-12 rounded-full bg-accent text-white font-extrabold flex items-center justify-center text-lg">
                  {(viewItem.full_name || (viewItem as any).name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-ink">{viewItem.full_name || (viewItem as any).name || '—'}</h4>
                  <p className="text-xs text-ink-muted font-mono">{viewItem.email || '—'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Số điện thoại:</span>
                  <span className="font-mono font-bold text-ink">{viewItem.phone || '—'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Phòng ban:</span>
                  <span className="font-bold text-ink">{(viewItem as any).department || 'Chưa xếp'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Chức vụ / Vai trò:</span>
                  <span className="font-bold text-ink">{getRoleLabel(viewItem.role || (viewItem as any).position)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Ngày vào làm:</span>
                  <span className="font-mono text-ink">{(viewItem as any).join_date || '—'}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-ink-muted font-medium">Trạng thái:</span>
                  <Badge variant={viewItem.status === 'active' ? 'default' : 'secondary'} className="font-semibold">
                    {statusLabels[viewItem.status]}
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-center gap-3">
                {viewItem.phone && (
                  <a
                    href={`tel:${viewItem.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition-all"
                  >
                    <Phone className="h-3.5 w-3.5" /> Gọi điện
                  </a>
                )}
                {viewItem.email && (
                  <a
                    href={`mailto:${viewItem.email}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-all"
                  >
                    <Mail className="h-3.5 w-3.5" /> Gửi email
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
