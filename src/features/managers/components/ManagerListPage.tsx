'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Pencil, Trash2, Plus, Search, UserCog, Loader2, AlertCircle, User,
  Building2, Check, Mail, X, ShieldCheck, Phone, CheckCircle2, Clock,
  Send, RefreshCw, LayoutGrid, Table as TableIcon, ArrowUpRight, Users,
  ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useManagers } from '@/features/managers/hooks/useManagers';
import { useLandlords } from '@/features/properties/hooks/useLandlords';
import { usePropertiesFeature } from '@/features/properties/hooks/usePropertiesFeature';
import { deleteManager } from '@/features/managers/services/managers';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import type { DBManager, DBLandlord, DBBuilding } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export function ManagerListPage() {
  const { company } = useAuth();
  const { items: managerList, loading, error, add, update, remove, refetch: refetchManagers } = useManagers(company?.id);
  const { items: landlordList, refetch: refetchLandlords } = useLandlords(company?.id);
  const { items: buildingList, refetch: refetchBuildings } = usePropertiesFeature(company?.id);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [landlordSearch, setLandlordSearch] = useState('');
  const [filterLandlordId, setFilterLandlordId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Independent Pagination states
  const [managerPage, setManagerPage] = useState(1);
  const managerPageSize = 6; // 6 managers per page (2 columns x 3 rows)

  const [landlordPage, setLandlordPage] = useState(1);
  const landlordPageSize = 5; // 5 landlords per page in sidebar

  // Manager Dialog states
  const [editItem, setEditItem] = useState<DBManager | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [managerAvatar, setManagerAvatar] = useState<string>('');

  // Building Assignment states
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>('');
  const [assignedBuildingIds, setAssignedBuildingIds] = useState<string[]>([]);
  const [buildingSearch, setBuildingSearch] = useState('');

  // Landlord Quick Create states
  const [isLandlordDialogOpen, setIsLandlordDialogOpen] = useState(false);
  const [creatingLandlord, setCreatingLandlord] = useState(false);
  const [newLandlordAvatar, setNewLandlordAvatar] = useState<string>('');

  // Reset page numbers when search or filters change
  useEffect(() => {
    setManagerPage(1);
  }, [searchQuery, filterLandlordId, statusFilter]);

  useEffect(() => {
    setLandlordPage(1);
  }, [landlordSearch]);

  // Derived filtered buildings based on selected landlord
  const selectedLandlordCode = landlordList.find((l) => l.id === selectedLandlordId)?.code;
  const landlordBuildings = buildingList.filter((b) => (selectedLandlordCode ? b.landlord_id === selectedLandlordCode : false));

  // Map counting managers per landlord
  const landlordManagerCountMap = useMemo(() => {
    const map = new Map<string, number>();
    managerList.forEach((m) => {
      if (m.landlord_id) {
        map.set(m.landlord_id, (map.get(m.landlord_id) || 0) + 1);
      }
    });
    return map;
  }, [managerList]);

  // Derived Statistics for KPI Header
  const kpiStats = useMemo(() => {
    const total = managerList.length;
    const active = managerList.filter((m) => !!m.email).length;
    const pending = total - active;

    const assignedBldSet = new Set<string>();
    buildingList.forEach((b) => {
      if (b.manager_ids && b.manager_ids.length > 0) {
        assignedBldSet.add(b.id);
      }
    });
    const totalAssignedBuildings = assignedBldSet.size;

    const linkedLandlordSet = new Set(managerList.map((m) => m.landlord_id).filter(Boolean));
    const totalLinkedLandlords = linkedLandlordSet.size;

    return { total, active, pending, totalAssignedBuildings, totalLinkedLandlords };
  }, [managerList, buildingList]);

  // Filtered & Paginated Manager List
  const filteredManagers = useMemo(() => {
    return managerList.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.phone ?? '').includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.code ?? '').toLowerCase().includes(q);

      const matchLandlord = !filterLandlordId || m.landlord_id === filterLandlordId;

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = !!m.email;
      else if (statusFilter === 'pending') matchStatus = !m.email;

      return matchSearch && matchLandlord && matchStatus;
    });
  }, [managerList, searchQuery, filterLandlordId, statusFilter]);

  const managerTotalPages = Math.max(1, Math.ceil(filteredManagers.length / managerPageSize));
  const safeManagerPage = Math.min(managerPage, managerTotalPages);
  const paginatedManagers = useMemo(() => {
    const startIdx = (safeManagerPage - 1) * managerPageSize;
    return filteredManagers.slice(startIdx, startIdx + managerPageSize);
  }, [filteredManagers, safeManagerPage, managerPageSize]);

  // Filtered & Paginated Landlord List for Left Sidebar
  const filteredLandlordsForSidebar = useMemo(() => {
    if (!landlordSearch.trim()) return landlordList;
    const q = landlordSearch.toLowerCase().trim();
    return landlordList.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.code ?? '').toLowerCase().includes(q) ||
      (l.system_name ?? '').toLowerCase().includes(q)
    );
  }, [landlordList, landlordSearch]);

  const landlordTotalPages = Math.max(1, Math.ceil(filteredLandlordsForSidebar.length / landlordPageSize));
  const safeLandlordPage = Math.min(landlordPage, landlordTotalPages);
  const paginatedLandlordsForSidebar = useMemo(() => {
    const startIdx = (safeLandlordPage - 1) * landlordPageSize;
    return filteredLandlordsForSidebar.slice(startIdx, startIdx + landlordPageSize);
  }, [filteredLandlordsForSidebar, safeLandlordPage, landlordPageSize]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLandlordId) {
      toast.error('Vui lòng chọn Chủ nhà!');
      return;
    }

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      ...(company?.id ? { company_id: company.id } : {}),
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      manager_type: (formData.get('manager_type') as 'individual' | 'company') || null,
      company_name: (formData.get('company_name') as string) || null,
      avatar_url: managerAvatar || null,
      landlord_id: selectedLandlordId,
    };

    let savedManager: DBManager | null = null;

    try {
      if (editItem) {
        savedManager = (await update(editItem.id, payload)) as DBManager;
      } else {
        savedManager = (await add(payload)) as DBManager;
      }

      if (!savedManager) {
        toast.error('Không thể lưu thông tin người quản lý!');
        setSaving(false);
        return;
      }

      toast.success(editItem ? 'Cập nhật người quản lý thành công!' : 'Tạo người quản lý thành công!');

      const managerId = savedManager.id;
      const buildingsToAdd = assignedBuildingIds;
      const buildingsToRemove = buildingList
        .filter((b) => b.manager_ids?.includes(managerId) && !assignedBuildingIds.includes(b.id))
        .map((b) => b.id);

      for (const bId of buildingsToAdd) {
        const building = buildingList.find((b) => b.id === bId);
        if (building && !building.manager_ids?.includes(managerId)) {
          const newIds = [...(building.manager_ids || []), managerId];
          await supabase.from('buildings').update({ manager_ids: newIds }).eq('id', bId);
        }
        await supabase.from('building_managers').upsert(
          { building_id: bId, manager_id: managerId },
          { onConflict: 'building_id,manager_id' }
        );
      }

      for (const bId of buildingsToRemove) {
        const building = buildingList.find((b) => b.id === bId);
        if (building && building.manager_ids?.includes(managerId)) {
          const newIds = building.manager_ids.filter((id) => id !== managerId);
          await supabase.from('buildings').update({ manager_ids: newIds }).eq('id', bId);
        }
        await supabase.from('building_managers').delete().eq('building_id', bId).eq('manager_id', managerId);
      }

      await Promise.all([refetchBuildings(), refetchManagers()]);

      setIsDialogOpen(false);
      setEditItem(null);
      setAssignedBuildingIds([]);
      setSelectedLandlordId('');
      setManagerAvatar('');
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu người quản lý!');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLandlord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingLandlord(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      code: (formData.get('code') as string) || null,
      phone: (formData.get('phone') as string) || null,
      address: (formData.get('address') as string) || null,
      notes: (formData.get('notes') as string) || null,
      owner_type: (formData.get('owner_type') as 'individual' | 'company') || null,
      company_name: (formData.get('company_name') as string) || null,
      image_url: newLandlordAvatar || null,
    };

    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      toast.success('Tạo chủ nhà thành công!');

      if (refetchLandlords) await refetchLandlords();
      setSelectedLandlordId(data.id);
      setIsLandlordDialogOpen(false);
      setNewLandlordAvatar('');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo chủ nhà');
    } finally {
      setCreatingLandlord(false);
    }
  };

  const handleResendActivationEmail = async (m: DBManager) => {
    if (!m.email) {
      toast.error('Người quản lý này chưa có Email!');
      return;
    }
    setResendingEmailId(m.id);
    try {
      const res = await fetch('/api/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          company_id: m.company_id,
          landlord_id: m.landlord_id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi khi gửi email');
      }

      toast.success(`Đã gửi lại email kích hoạt tới ${m.email}!`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi email kích hoạt!');
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleDeleteOne = async (id: string, name: string) => {
    if (!window.confirm(`Xóa người quản lý "${name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteManager(id);
      toast.success('Đã xóa người quản lý thành công!');
      await Promise.all([refetchManagers(), refetchBuildings()]);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa người quản lý');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredManagers.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} người quản lý đã chọn?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteManager(id)));
      setSelectedIds([]);
      toast.success('Đã xóa thành công!');
      await Promise.all([refetchManagers(), refetchBuildings()]);
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setAssignedBuildingIds([]);
    setSelectedLandlordId(filterLandlordId || '');
    setManagerAvatar('');
    setIsDialogOpen(true);
  };

  const openEdit = (item: DBManager) => {
    setEditItem(item);
    const currentAssignments = buildingList.filter((b) => b.manager_ids?.includes(item.id)).map((b) => b.id);
    setAssignedBuildingIds(currentAssignments);
    setSelectedLandlordId(item.landlord_id || '');
    setManagerAvatar(item.avatar_url || '');
    setIsDialogOpen(true);
  };

  const currentLandlordObj = landlordList.find((l) => l.id === filterLandlordId);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại trang trước
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Người quản lý tòa</h1>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono text-xs border border-indigo-200 dark:border-indigo-800">
              {kpiStats.total} nhân sự
            </Badge>
          </div>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">
            Danh sách nhân sự vận hành theo từng Chủ nhà · Mã phân cấp &amp; Phân công bất động sản real-time
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => refetchManagers()}
            variant="outline"
            size="sm"
            className="rounded-xl border-border h-10 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 font-bold text-xs gap-2 shadow-md shadow-indigo-200 dark:shadow-none">
                <Plus className="h-4 w-4" />Thêm quản lý mới
              </Button>
            </DialogTrigger>

            {/* Modal Dialog Form */}
            <DialogContent className="w-[85vw] max-w-5xl rounded-2xl border border-border bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto p-0">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-950 dark:to-zinc-900 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <UserCog className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="font-heading text-lg font-bold text-white">
                        {editItem ? 'Chỉnh sửa người quản lý' : 'Thêm người quản lý tòa mới'}
                      </DialogTitle>
                      <p className="text-xs text-indigo-100/90 font-medium mt-0.5">
                        Phân công nhân sự theo dõi &amp; vận hành bất động sản
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {editItem?.code && (
                      <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 font-mono text-xs px-2.5 py-1 rounded-full font-bold">
                        {editItem.code}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsDialogOpen(false)}
                      className="h-8 w-8 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    <div>
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5">
                        Họ &amp; Tên <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editItem?.name}
                        placeholder="Nguyễn Văn A"
                        required
                        className="rounded-xl border-border mt-1.5 text-sm focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5">
                        Số Điện Thoại <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={editItem?.phone ?? ''}
                        placeholder="0912345678"
                        required
                        className="rounded-xl border-border mt-1.5 text-sm font-mono focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5">
                        Email liên hệ
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editItem?.email ?? ''}
                        placeholder="quanly@gmail.com"
                        className="rounded-xl border-border mt-1.5 text-sm focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manager_type" className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1 h-5">
                        Loại hình
                      </Label>
                      <select
                        id="manager_type"
                        name="manager_type"
                        defaultValue={editItem?.manager_type ?? 'individual'}
                        className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 mt-1.5"
                      >
                        <option value="individual">Cá nhân (Trực tiếp)</option>
                        <option value="company">Đơn vị / Công ty vận hành</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-ink">
                        Chủ nhà trực thuộc <span className="text-red-500">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-indigo-600 text-xs font-semibold"
                        onClick={() => {
                          setNewLandlordAvatar('');
                          setIsLandlordDialogOpen(true);
                        }}
                      >
                        + Tạo nhanh chủ nhà
                      </Button>
                    </div>
                    <select
                      value={selectedLandlordId}
                      onChange={(e) => setSelectedLandlordId(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 mt-1.5 font-medium"
                      required
                    >
                      <option value="">-- Bắt buộc chọn Chủ nhà --</option>
                      {landlordList.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code ? `${l.code} · ` : ''}{l.system_name || l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Avatar & Email Info */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-border pt-4 items-center">
                  <div className="md:col-span-7 space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-ink-muted block">Ảnh Đại Diện</Label>
                    <ImageUpload
                      value={managerAvatar}
                      onChange={(url) => setManagerAvatar(Array.isArray(url) ? url[0] : url || '')}
                      bucket="avatars"
                    />
                  </div>

                  {!editItem && (
                    <div className="md:col-span-5 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                        <Mail className="h-4 w-4 shrink-0 text-indigo-600" />Tự động gửi email kích hoạt
                      </div>
                      <p className="text-ink-muted text-xs leading-relaxed">
                        Hệ thống sẽ gửi email mời thiết lập mật khẩu truy cập cho người quản lý ngay sau khi lưu.
                      </p>
                    </div>
                  )}
                </div>

                {/* Building Assignment */}
                {selectedLandlordId && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-ink flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        Phân công Tòa nhà phụ trách
                        <span className="ml-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {assignedBuildingIds.length} / {landlordBuildings.length} tòa
                        </span>
                      </Label>

                      {landlordBuildings.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            onClick={() => setAssignedBuildingIds(landlordBuildings.map((b) => b.id))}
                          >
                            Chọn tất cả
                          </Button>
                          <span className="text-border">|</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-ink-muted hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                            onClick={() => setAssignedBuildingIds([])}
                          >
                            Bỏ chọn tất cả
                          </Button>
                        </div>
                      )}
                    </div>

                    {landlordBuildings.length === 0 ? (
                      <div className="p-4 text-center text-xs text-ink-muted border border-dashed border-border rounded-xl bg-bg-subtle/50">
                        Chủ nhà này chưa có tòa nhà nào trong hệ thống.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {landlordBuildings.length > 3 && (
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
                          {landlordBuildings
                            .filter(
                              (b) =>
                                b.name.toLowerCase().includes(buildingSearch.toLowerCase()) ||
                                (b.code ?? '').toLowerCase().includes(buildingSearch.toLowerCase()) ||
                                (b.address ?? '').toLowerCase().includes(buildingSearch.toLowerCase())
                            )
                            .map((b) => {
                              const isChecked = assignedBuildingIds.includes(b.id);
                              return (
                                <div
                                  key={b.id}
                                  onClick={() => {
                                    setAssignedBuildingIds((prev) =>
                                      isChecked ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                                    );
                                  }}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                                      : 'bg-white dark:bg-zinc-900 border-border hover:bg-bg-subtle/50'
                                  }`}
                                >
                                  <div
                                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                      isChecked
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-border bg-white dark:bg-zinc-800'
                                    }`}
                                  >
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
                )}

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
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
                    {editItem ? 'Lưu thay đổi' : 'Thêm người quản lý'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── KPI Stats Header Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-ink leading-none">{kpiStats.total}</div>
            <div className="text-xs text-ink-muted mt-1 font-medium">Tổng số Quản lý</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-emerald-600 leading-none">{kpiStats.active}</div>
            <div className="text-xs text-ink-muted mt-1 font-medium">Đã kích hoạt Account</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-ink leading-none">{kpiStats.totalAssignedBuildings}</div>
            <div className="text-xs text-ink-muted mt-1 font-medium">Tòa nhà phụ trách</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-ink leading-none">{kpiStats.totalLinkedLandlords}</div>
            <div className="text-xs text-ink-muted mt-1 font-medium">Chủ nhà liên kết</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Main Split-View Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── Left Sidebar Panel (Landlords Filter List with Pagination) ─────── */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-border rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-3.5 border-b border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <User className="h-4 w-4 text-indigo-600" />
                    LỌC THEO CHỦ NHÀ
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    {landlordList.length} Chủ nhà
                  </Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                  <Input
                    placeholder="Tìm theo tên/mã chủ nhà..."
                    value={landlordSearch}
                    onChange={(e) => setLandlordSearch(e.target.value)}
                    className="pl-8 h-8 rounded-xl text-xs border-border bg-bg-subtle/50"
                  />
                </div>
              </div>

              {/* Landlord list items */}
              <div className="divide-y divide-border/60">
                {/* Option "All Landlords" - Only show on page 1 */}
                {safeLandlordPage === 1 && (
                  <button
                    type="button"
                    onClick={() => setFilterLandlordId('')}
                    className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                      filterLandlordId === ''
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'hover:bg-bg-subtle/60 text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0 font-bold">
                        <UserCog className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Tất cả Chủ nhà</div>
                        <div className="text-[10px] text-ink-muted">Toàn bộ nhân sự quản lý</div>
                      </div>
                    </div>
                    <Badge className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                      {managerList.length}
                    </Badge>
                  </button>
                )}

                {paginatedLandlordsForSidebar.map((l) => {
                  const count = landlordManagerCountMap.get(l.id) || 0;
                  const isSelected = filterLandlordId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setFilterLandlordId(isSelected ? '' : l.id)}
                      className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'hover:bg-bg-subtle/60 text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.name} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 font-bold">
                            {l.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{l.system_name || l.name}</div>
                          <div className="text-[10px] text-ink-muted font-mono truncate">
                            {l.code || 'CHƯA CÓ MÃ'} {l.system_name && l.name ? `· ${l.name}` : ''}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          count > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        QL: {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Left Landlord Sidebar Pagination Controls */}
            {landlordTotalPages > 1 && (
              <div className="p-2.5 bg-bg-subtle/60 border-t border-border flex items-center justify-between text-xs select-none">
                <span className="text-[11px] text-ink-muted font-medium">
                  Trang {safeLandlordPage}/{landlordTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLandlordPage((p) => Math.max(1, p - 1))}
                    disabled={safeLandlordPage === 1}
                    className="p-1 rounded-lg border border-border bg-white dark:bg-zinc-800 text-ink-muted hover:text-ink disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLandlordPage((p) => Math.min(landlordTotalPages, p + 1))}
                    disabled={safeLandlordPage === landlordTotalPages}
                    className="p-1 rounded-lg border border-border bg-white dark:bg-zinc-800 text-ink-muted hover:text-ink disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Main Panel (Manager Cards / Table) ───────────────────────── */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* Controls Bar */}
          <Card className="border-border rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs p-3.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <Input
                  placeholder="Tìm theo tên, SĐT, email hoặc mã quản lý..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-border text-xs focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Status Filter Pill Tabs */}
                <div className="flex items-center bg-bg-subtle/80 p-1 rounded-xl border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'all'
                        ? 'bg-white dark:bg-zinc-800 text-ink shadow-2xs font-bold'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      statusFilter === 'active'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 font-bold shadow-2xs'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Đã kích hoạt
                  </button>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-bg-subtle/80 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-2xs'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                    title="Xem dạng thẻ Grid"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-2xs'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                    title="Xem dạng Bảng"
                  >
                    <TableIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Breadcrumb Info & Bulk Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border text-xs text-ink-muted">
              <div>
                {currentLandlordObj ? (
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    Đang xem Quản lý của Chủ nhà:
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold border-indigo-200">
                      {currentLandlordObj.system_name || currentLandlordObj.name} {currentLandlordObj.code ? `[${currentLandlordObj.code}]` : ''}
                    </Badge>
                    <button type="button" onClick={() => setFilterLandlordId('')} className="text-indigo-600 underline ml-1 hover:text-indigo-700">
                      Xem tất cả
                    </button>
                  </span>
                ) : (
                  <span>
                    Hiển thị <strong>{filteredManagers.length > 0 ? (safeManagerPage - 1) * managerPageSize + 1 : 0} - {Math.min(safeManagerPage * managerPageSize, filteredManagers.length)}</strong> trong tổng số <strong>{filteredManagers.length}</strong> người quản lý
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {selectedIds.length > 0 && (
                  <Button onClick={handleBulkDelete} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-7 text-xs px-3 gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Xóa {selectedIds.length} mục đã chọn
                  </Button>
                )}

                {/* ── Top Pagination Controls on the exact same line ── */}
                {managerTotalPages > 1 && (
                  <Pagination
                    currentPage={safeManagerPage}
                    totalPages={managerTotalPages}
                    onPageChange={(p) => setManagerPage(p)}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex justify-center py-16 bg-white dark:bg-zinc-900 border border-border rounded-2xl">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : paginatedManagers.length === 0 ? (
            <div className="p-12 text-center text-ink-muted bg-white dark:bg-zinc-900 border border-border rounded-2xl space-y-2">
              <UserCog className="h-12 w-12 mx-auto text-indigo-300 dark:text-indigo-800" />
              <p className="font-bold text-ink">Không tìm thấy người quản lý nào</p>
              <p className="text-xs">
                {filterLandlordId ? 'Chủ nhà này chưa được phân công người quản lý nào.' : 'Thử thay đổi bộ lọc hoặc thêm người quản lý mới.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── GRID CARD VIEW ───────────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedManagers.map((m) => {
                const landlord = landlordList.find((l) => l.id === m.landlord_id);
                const assignedBuildings = buildingList.filter((b) => b.manager_ids?.includes(m.id));
                const isEmailActive = !!m.email;
                const isResending = resendingEmailId === m.id;

                return (
                  <Card
                    key={m.id}
                    className="border border-border/90 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all p-4 space-y-3.5 group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Avatar, Code, Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name} className="h-11 w-11 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-900 shrink-0" />
                          ) : (
                            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-100 to-slate-100 dark:from-indigo-950 dark:to-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-ink text-sm leading-tight truncate">{m.name}</h3>
                              {m.code && (
                                <span className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                                  {m.code}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink-muted mt-0.5">
                              {m.manager_type === 'company' ? (m.company_name || 'Công ty vận hành') : 'Cá nhân trực tiếp'}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isEmailActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-medium shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />Đã kích hoạt
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-medium text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shrink-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" />Chờ kích hoạt
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info Pills */}
                      <div className="grid grid-cols-1 gap-1.5 bg-bg-subtle/50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-border/50 text-xs">
                        {m.phone && (
                          <div className="flex items-center gap-2 text-ink">
                            <Phone className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <a href={`tel:${m.phone}`} className="font-mono font-bold hover:underline">
                              {m.phone}
                            </a>
                          </div>
                        )}
                        {m.email && (
                          <div className="flex items-center gap-2 text-ink-muted truncate">
                            <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <a href={`mailto:${m.email}`} className="hover:underline truncate">
                              {m.email}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Landlord Ownership Badge */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-ink-muted font-medium">Chủ nhà trực thuộc:</span>
                        {landlord ? (
                          <span className="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-xl text-indigo-800 dark:text-indigo-200 font-bold text-xs">
                            <User className="h-3.5 w-3.5 text-indigo-600" />
                            {landlord.system_name || landlord.name} {landlord.code ? `[${landlord.code}]` : ''}
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">—</span>
                        )}
                      </div>

                      {/* Assigned Buildings Pills */}
                      <div className="space-y-1 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted font-medium flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            Tòa phụ trách ({assignedBuildings.length})
                          </span>
                        </div>

                        {assignedBuildings.length === 0 ? (
                          <div className="text-[11px] text-ink-muted italic">Chưa phân công tòa nhà nào</div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                            {assignedBuildings.map((b) => (
                              <span
                                key={b.id}
                                className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                              >
                                {b.name} ({b.total_rooms ?? 0} phòng)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/80 mt-3">
                      {m.email ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isResending}
                          onClick={() => handleResendActivationEmail(m)}
                          className="h-7 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-2 rounded-lg gap-1 font-semibold"
                        >
                          {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Gửi lại email
                        </Button>
                      ) : (
                        <span className="text-[11px] text-ink-muted">Chưa có Email</span>
                      )}

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(m)}
                          className="h-8 text-xs text-ink hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl px-2.5 font-bold gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Sửa
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOne(m.id, m.name)}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl px-2.5 font-bold gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ── TABLE VIEW ───────────────────────────────────────────────────── */
            <Card className="border border-border rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-bg-subtle/80 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          onChange={handleSelectAll}
                          checked={selectedIds.length > 0 && selectedIds.length === filteredManagers.length}
                        />
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">Quản lý</th>
                      <th className="px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">Chủ nhà trực thuộc</th>
                      <th className="px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">SĐT / Email</th>
                      <th className="px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">Tòa phụ trách</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-ink">
                    {paginatedManagers.map((m) => {
                      const landlord = landlordList.find((l) => l.id === m.landlord_id);
                      const assignedBuildings = buildingList.filter((b) => b.manager_ids?.includes(m.id));

                      return (
                        <tr key={m.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                              checked={selectedIds.includes(m.id)}
                              onChange={(e) => handleSelect(m.id, e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt={m.name} className="h-9 w-9 rounded-full object-cover border border-border shrink-0" />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold shrink-0 border border-indigo-200">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-sm text-ink flex items-center gap-1.5">
                                  {m.name}
                                  {m.code && (
                                    <span className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-indigo-700 font-bold">
                                      {m.code}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-ink-muted">
                                  {m.manager_type === 'company' ? (m.company_name || 'Công ty') : 'Cá nhân'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {landlord ? (
                              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                {landlord.system_name || landlord.name}
                                {landlord.code && <span className="font-mono text-ink-muted font-normal ml-1">[{landlord.code}]</span>}
                              </div>
                            ) : (
                              <span className="text-ink-muted italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5 text-xs">
                              {m.phone && <div className="font-mono font-bold text-ink">{m.phone}</div>}
                              {m.email && <div className="text-ink-muted truncate max-w-[160px]">{m.email}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 text-emerald-800 font-bold text-xs px-2 py-0.5 rounded-lg">
                              {assignedBuildings.length} tòa
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-indigo-600 rounded-lg" onClick={() => openEdit(m)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg" onClick={() => handleDeleteOne(m.id, m.name)}>
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
            </Card>
          )}

          {/* Bottom spacing */}
        </div>
      </div>

      {/* Quick Landlord Create Dialog */}
      <Dialog open={isLandlordDialogOpen} onOpenChange={setIsLandlordDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl border border-border bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-ink font-bold">
              Tạo nhanh Chủ nhà / Nhóm đầu tư
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLandlord} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại chủ nhà</Label>
                <select
                  id="owner_type"
                  name="owner_type"
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:ring-indigo-500 mt-1.5"
                >
                  <option value="individual">Cá nhân</option>
                  <option value="company">Công ty</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ll_code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã chủ nhà</Label>
                <Input id="ll_code" name="code" placeholder="Ví dụ: TH01" className="rounded-xl border-border mt-1.5 focus-visible:ring-indigo-500" />
              </div>
            </div>
            <div>
              <Label htmlFor="ll_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên chủ nhà / Người đại diện <span className="text-red-500">*</span></Label>
              <Input id="ll_name" name="name" required placeholder="Ví dụ: Nguyễn Văn A" className="rounded-xl border-border mt-1.5 focus-visible:ring-indigo-500" />
            </div>
            <div>
              <Label htmlFor="ll_company_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên thương hiệu / Công ty</Label>
              <Input id="ll_company_name" name="company_name" placeholder="Ví dụ: HT Home" className="rounded-xl border-border mt-1.5 focus-visible:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ll_phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại</Label>
                <Input id="ll_phone" name="phone" placeholder="0912345678" className="rounded-xl border-border mt-1.5 focus-visible:ring-indigo-500" />
              </div>
              <div>
                <Label htmlFor="ll_address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
                <Input id="ll_address" name="address" placeholder="Hà Nội" className="rounded-xl border-border mt-1.5 focus-visible:ring-indigo-500" />
              </div>
            </div>
            <div>
              <Label htmlFor="ll_notes" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
              <Input id="ll_notes" name="notes" className="rounded-xl border-border mt-1.5 focus-visible:ring-indigo-500" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh chủ nhà</Label>
              <ImageUpload
                value={newLandlordAvatar}
                onChange={(url) => setNewLandlordAvatar(Array.isArray(url) ? url[0] : url || '')}
                bucket="avatars"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsLandlordDialogOpen(false)} className="rounded-xl">Hủy</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold" disabled={creatingLandlord}>
                {creatingLandlord ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu chủ nhà
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
