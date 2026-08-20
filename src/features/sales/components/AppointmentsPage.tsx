'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { getAreaColorClass } from '@/lib/utils/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, Search, CalendarDays, Loader2, AlertCircle, Pencil, Share2, Trash2, CheckCircle2, Handshake, FileSignature, ShieldCheck, Clock } from 'lucide-react';
import { useAppointments, useProfiles } from '@/features/staff/hooks/useStaff';
import { useAuth } from '@/lib/auth/AuthContext';
import { ShowingActionDrawer } from '@/components/showing/ShowingActionDrawer';
import { ShowingTimelineView } from '@/components/showing/ShowingTimelineView';
import type { DBAppointment } from '@/lib/supabase/types';

const STATUS_LIST = ['Pending', 'Confirm', 'Viewed', 'Dealed', 'Cancel'] as const;
type AppStatus = typeof STATUS_LIST[number];

function buildShareText(item: DBAppointment): string {
  const date = new Date(item.date).toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const statusLabelsLocal: Record<string, string> = {
    Pending: 'Chờ duyệt', Confirm: 'Xác nhận', Viewed: 'Đã xem phòng',
    Dealed: 'Đã chốt thành công', Cancel: 'Đã hủy',
  };
  const status = statusLabelsLocal[item.status] || item.status;
  
  let addressPart = item.building_address || '';
  let cleanNotes = item.notes || '';

  if (item.notes && item.notes.includes(' — ')) {
    const parts = item.notes.split(' — ');
    cleanNotes = parts[0];
    if (!addressPart && parts[1]) {
      addressPart = parts[1];
    }
  }

  const fullAddress = addressPart
    ? `${addressPart}${item.area ? ' - ' + item.area : ''}`
    : item.area ?? '—';

  return [
    '📋 THÔNG TIN LỊCH HẸN XEM PHÒNG',
    '─────────────────────────',
    `👤 Khách hàng : ${item.customer_name}`,
    `📞 Số điện thoại: ${item.customer_phone ?? '—'}`,
    item.customer_email ? `📧 Email        : ${item.customer_email}` : null,
    `🔑 Mã chủ nhà  : ${item.landlord_code ?? '—'}`,
    `🏠 Bất động sản: ${item.room_title ?? '—'} '-' ${item.building_address}`,
    `📍 Khu vực      : ${fullAddress}`,
    `📅 Ngày xem    : ${date}`,
    `⏰ Giờ xem     : ${item.time}`,
    `🔖 Trạng thái  : ${status}`,
    cleanNotes ? `📝 Ghi chú      : ${cleanNotes}` : null,
    '─────────────────────────',
    'Vui lòng chuẩn bị và liên hệ lại với khách hàng trước buổi xem. Cảm ơn!',
  ].filter(Boolean).join('\n');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

const statusColors: Record<string, string> = {
  Confirm: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  Dealed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Cancel: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  Pending: 'Đang Chờ',
  Confirm: 'Xác nhận',
  Viewed: 'Đã Xem Phòng',
  Dealed: 'Đã chốt thành công',
  Cancel: 'Đã Hủy',
};

export function AppointmentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const { company, role, user, profile } = useAuth();
  const { items: aptList, loading, error, update } = useAppointments(company?.id);
  const { items: profiles } = useProfiles(company?.id);

  const isSale = role === 'sales_agent';

  const visibleAppointments = useMemo(() => {
    if (isSale) {
      const myId = user?.id || profile?.id;
      if (!myId) return [];
      return aptList.filter((a) => a.assigned_to === myId || a.created_by === myId || !a.assigned_to);
    }
    return aptList;
  }, [aptList, isSale, user?.id, profile?.id]);

  const assignableProfiles = useMemo(() => {
    return profiles.filter((p) => p.role !== 'landlord');
  }, [profiles]);
  const formatYMD = (d: Date) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const default7DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatYMD(d);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState<string>(todayStr);
  const [filterToDate, setFilterToDate] = useState<string>(default7DaysStr);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [viewTab, setViewTab] = useState<'timeline' | 'table'>('timeline');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (apt: DBAppointment) => {
    if (!user?.id) return;
    const userName = profile?.full_name || user.email || 'Sale';
    setClaimingId(apt.id);
    const toastId = toast.loading('Đang xử lý nhận lịch hẹn...');
    try {
      const res = await fetch('/api/appointments/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apt.id,
          userId: user.id,
          userName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Nhận lịch hẹn thất bại', { id: toastId, duration: 4000 });
      } else {
        toast.success(`🎉 Nhận chăm sóc khách ${apt.customer_name} thành công!`, { id: toastId, duration: 4000 });
        await update(apt.id, { assigned_to: user.id, assigned_to_name: userName });
      }
    } catch (err: any) {
      toast.error('Lỗi khi nhận lịch hẹn: ' + err.message, { id: toastId });
    } finally {
      setClaimingId(null);
    }
  };

  const [viewItem, setViewItem] = useState<DBAppointment | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editItem, setEditItem] = useState<DBAppointment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUpdating, setEditUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  let displayAddress = '—';
  let displayNotes = 'Không có ghi chú thêm.';
  if (viewItem) {
    let addressPart = viewItem.building_address || '';
    displayNotes = viewItem.notes || 'Không có ghi chú thêm.';

    if (viewItem.notes && viewItem.notes.includes(' — ')) {
      const parts = viewItem.notes.split(' — ');
      displayNotes = parts[0] || 'Không có ghi chú thêm.';
      if (!addressPart && parts[1]) {
        addressPart = parts[1];
      }
    }
    displayAddress = addressPart
      ? `${addressPart}${viewItem.area ? ' ' + viewItem.area : ''}`
      : viewItem.area ?? '—';
  }

  const filtered = visibleAppointments.filter((a) => {
    const matchesSearch = a.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.customer_phone ?? '').includes(searchQuery);
    const matchesFromDate = !filterFromDate || a.date >= filterFromDate;
    const matchesToDate = !filterToDate || a.date <= filterToDate;
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesAssignee = !filterAssignee
      ? true
      : filterAssignee === 'unassigned'
        ? !a.assigned_to
        : a.assigned_to === filterAssignee;
    return matchesSearch && matchesFromDate && matchesToDate && matchesStatus && matchesAssignee;
  });

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = localDate.toISOString().split('T')[0];

    const aIsUpcoming = a.date >= todayStr;
    const bIsUpcoming = b.date >= todayStr;

    if (aIsUpcoming && !bIsUpcoming) return -1;
    if (!aIsUpcoming && bIsUpcoming) return 1;

    if (aIsUpcoming && bIsUpcoming) {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    } else {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    }
  });

  const openView = (item: DBAppointment) => { setViewItem(item); setIsViewOpen(true); };
  const openEdit = (item: DBAppointment) => { setEditItem(item); setIsEditOpen(true); };

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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} lịch hẹn đã chọn không? Thao tác này không thể hoàn tác.`)) return;
    try {
      await Promise.all(selectedIds.map(id => handleStatusChange(id, 'Cancel')));
      setSelectedIds([]);
      toast.success(`Đã hủy ${selectedIds.length} lịch hẹn.`);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi hủy lịch hẹn.');
    }
  };

  const handleStatusChange = async (id: string, status: DBAppointment['status']) => {
    if (status === 'Cancel') {
      if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) return;
    }
    await update(id, { status });
  };

  const handleQuickStatus = async (status: AppStatus) => {
    if (!editItem) return;
    setEditUpdating(true);
    try {
      await update(editItem.id, { status });
      toast.success(`Đã cập nhật: ${statusLabels[status]}`);
      setIsEditOpen(false);
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setEditUpdating(false);
    }
  };

  const handleShare = (item: DBAppointment) => {
    const text = buildShareText(item);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Đã copy thông tin lịch hẹn!', {
        description: 'Paste vào Zalo để gửi cho chủ nhà.',
        duration: 3000,
      });
    }).catch(() => {
      toast.error('Trình duyệt không hỗ trợ copy tự động');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Lịch hẹn</h1>
          <p className="text-slate-500">Quản lý yêu cầu đặt lịch và lộ trình dẫn khách hàng</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setViewTab('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewTab === 'timeline'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>⏰ Lịch trình Dẫn khách</span>
          </button>
          <button
            onClick={() => setViewTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewTab === 'table'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>📋 Danh sách Chi tiết</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {viewTab === 'timeline' ? (
        <ShowingTimelineView
          appointments={sortedAndFiltered}
          onOpenDetail={openView}
          onClaim={handleClaim}
        />
      ) : (

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm theo tên khách hàng hoặc SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 p-1 rounded-lg">
              <Input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className="w-34 h-8 text-xs font-mono font-bold cursor-pointer" />
              <span className="text-slate-500 font-bold px-0.5">đến</span>
              <Input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className="w-34 h-8 text-xs font-mono font-bold cursor-pointer" />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ duyệt</option>
              <option value="Confirm">Xác nhận</option>
              <option value="Viewed">Đã xem phòng</option>
              <option value="Dealed">Đã chốt thành công</option>
              <option value="Cancel">Đã hủy</option>
            </select>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
            >
              <option value="">Tất cả nhân viên</option>
              <option value="unassigned">Chưa phân công</option>
              {assignableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
            {selectedIds.length > 0 && (
              <Button onClick={handleBulkDelete} size="sm" className="bg-red-500 hover:bg-red-600 text-white rounded-lg whitespace-nowrap h-10">
                <Trash2 className="h-4 w-4 mr-2" /> Hủy {selectedIds.length} lịch hẹn
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-subtle rounded-lg">
              <table className="w-full text-sm border-collapse hidden md:table min-w-[900px]">
                <thead className="bg-bg-subtle border-b border-border-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                        onChange={handleSelectAll}
                        checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khách hàng</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã chủ nhà</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã tòa nhà</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Bất động sản</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Ngày</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Giờ</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khu vực</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Sale phụ trách</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-ink">
                  {sortedAndFiltered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                        openView(item);
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
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{item.customer_name}</div>
                        <div className="text-xs text-ink-muted font-mono mt-0.5">{item.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {item.landlord_code ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-bg-subtle border border-border-subtle text-ink-muted">
                            {item.landlord_code}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-xs">{item.landlord_name ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {item.building_id ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-bg-subtle border border-border-subtle text-ink-muted">
                            {item.building_id}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">{item.room_title ?? '—'}</td>
                      <td className="px-6 py-4 text-ink-muted font-mono">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 text-ink-muted font-mono">{item.time}</td>
                      <td className="px-6 py-4">
                        {item.area ? <Badge variant="outline" className={`border-border-subtle text-ink-muted ${getAreaColorClass(item.area)}`}>{item.area}</Badge> : '—'}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {!item.assigned_to ? (
                          <Button
                            size="sm"
                            onClick={() => handleClaim(item)}
                            disabled={claimingId === item.id}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm gap-1 animate-pulse"
                          >
                            {claimingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '✋ Nhận Ngay'}
                          </Button>
                        ) : isSale ? (
                          <span className="text-xs font-semibold text-ink-muted bg-bg-subtle px-2.5 py-1 rounded-full border border-border-subtle">
                            {item.assigned_to_name || 'Sale'}
                          </span>
                        ) : (
                          <select
                            value={item.assigned_to ?? ''}
                            onChange={async (e) => {
                              const newAssignVal = e.target.value || null;
                              const toastId = toast.loading('Đang phân công...');
                              try {
                                const prof = profiles.find(p => p.id === newAssignVal);
                                const assignedToName = prof?.full_name || prof?.email || null;
                                await update(item.id, { 
                                  assigned_to: newAssignVal,
                                  assigned_to_name: assignedToName 
                                });
                                toast.success('Phân công thành công!', { id: toastId });
                              } catch (err) {
                                toast.error('Lỗi phân công!', { id: toastId });
                              }
                            }}
                            className="text-xs font-semibold text-ink bg-white border border-border-subtle rounded-md px-2 py-1 max-w-[150px] outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="">-- Chưa phân công --</option>
                            {assignableProfiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.full_name || p.email}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 max-w-[280px]">
                          <div className="flex flex-wrap gap-1.5">
                            {(['Pending', 'Confirm', 'Viewed', 'Cancel'] as const).map((s) => {
                              const isCurrent = item.status === s;
                              return (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(item.id, s)}
                                  className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                                    isCurrent
                                      ? statusColors[s] || 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-white text-ink-muted border-border-subtle hover:text-ink hover:bg-bg-subtle'
                                  }`}
                                >
                                  {statusLabels[s] || s}
                                </button>
                              );
                            })}
                          </div>
                          {(item as any).result_status && (
                            <span className="text-[10px] font-bold tracking-tight text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block w-max mt-0.5">
                              {(item as any).result_status === 'deposit_pending'
                                ? '🎉 Chốt cọc'
                                : (item as any).result_status === 'interested'
                                ? '🌟 Khách thích'
                                : (item as any).result_status === 'rejected'
                                ? '❌ Khách không ưng'
                                : '🚫 Bùng'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            onClick={() => {
                              const params = new URLSearchParams();
                              if (item.room_id) params.set('room_id', item.room_id);
                              if (item.building_id) params.set('building_id', item.building_id);
                              if (item.customer_name) params.set('customer_name', item.customer_name);
                              if (item.customer_phone) params.set('customer_phone', item.customer_phone);
                              if (item.customer_email) params.set('customer_email', item.customer_email);
                              if (item.assigned_to) params.set('sales_agent_id', item.assigned_to);
                              router.push(`${pathPrefix}/contracts/create?${params.toString()}`);
                            }}
                            title="Đặt cọc ngay"
                          >
                            <FileSignature className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle"
                            onClick={() => openView(item)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle"
                            onClick={() => handleShare(item)}
                            title="Copy thông tin gửi chủ nhà"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10"
                            onClick={() => handleStatusChange(item.id, 'Cancel')}
                            title="Hủy"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card List View (Responsive UI/UX cho Điện thoại) */}
              <div className="block md:hidden divide-y divide-border-subtle bg-white dark:bg-zinc-900">
                {sortedAndFiltered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openView(item)}
                    className="p-4 space-y-3 hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                  >
                    {/* Top Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">{item.customer_name}</span>
                        {item.area && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.2 ${getAreaColorClass(item.area)}`}>
                            {item.area}
                          </Badge>
                        )}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColors[item.status] || 'bg-slate-100 text-slate-700'}`}>
                        {statusLabels[item.status] || item.status}
                      </span>
                    </div>

                    {/* Property & Customer info */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-bg-subtle/60 p-2.5 rounded-xl">
                      <div>
                        <span className="text-ink-muted block text-[10px]">SĐT Khách:</span>
                        <span className="font-mono font-semibold text-accent">{item.customer_phone}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[10px]">Thời gian xem:</span>
                        <span className="font-mono font-semibold text-indigo-600">{formatDate(item.date)} ({item.time})</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-ink-muted block text-[10px]">Bất động sản:</span>
                        <span className="font-semibold text-ink">{item.room_title || item.building_address || '—'}</span>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-border-subtle/60" onClick={(e) => e.stopPropagation()}>
                      {!item.assigned_to ? (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(item)}
                          disabled={claimingId === item.id}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-7 px-3 rounded-lg shadow-sm gap-1 animate-pulse"
                        >
                          {claimingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✋ Nhận Ngay'}
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-ink-muted bg-bg-subtle px-2 py-0.5 rounded-full border border-border-subtle">
                          {item.assigned_to_name || 'Sale'}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-lg font-bold gap-1"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (item.room_id) params.set('room_id', item.room_id);
                            if (item.building_id) params.set('building_id', item.building_id);
                            if (item.customer_name) params.set('customer_name', item.customer_name);
                            if (item.customer_phone) params.set('customer_phone', item.customer_phone);
                            if (item.customer_email) params.set('customer_email', item.customer_email);
                            if (item.assigned_to) params.set('sales_agent_id', item.assigned_to);
                            router.push(`${pathPrefix}/contracts/create?${params.toString()}`);
                          }}
                        >
                          <FileSignature className="h-3.5 w-3.5" /> Chốt Cọc
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-ink hover:text-accent"
                          onClick={() => handleShare(item)}
                          title="Copy thông tin"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedAndFiltered.length === 0 && (
                  <div className="text-center py-12 text-ink-muted bg-white text-xs">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-35" />
                    Không tìm thấy lịch hẹn nào
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 shrink-0" />
              <span className="truncate">Chi tiết lịch hẹn & Quy trình dẫn khách</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
              <div className="md:col-span-5 space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                  <div className="col-span-2 flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-900 text-sm">{viewItem.customer_name}</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[viewItem.status] || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabels[viewItem.status] || viewItem.status}
                    </span>
                  </div>
                  <div><span className="text-slate-400 block">SĐT:</span> <span className="font-mono font-semibold text-slate-800">{viewItem.customer_phone}</span></div>
                  <div><span className="text-slate-400 block">Email:</span> <span className="font-medium truncate block">{viewItem.customer_email || '—'}</span></div>
                  <div><span className="text-slate-400 block">BĐS:</span> <span className="font-semibold text-indigo-600">{viewItem.room_title || '—'}</span></div>
                  <div><span className="text-slate-400 block">Mã chủ nhà:</span> <span className="font-mono font-semibold text-amber-700">{viewItem.landlord_code || '—'}</span></div>
                  <div><span className="text-slate-400 block">Ngày hẹn:</span> <span className="font-mono font-medium">{formatDate(viewItem.date)}</span></div>
                  <div><span className="text-slate-400 block">Giờ hẹn:</span> <span className="font-mono font-medium">{viewItem.time}</span></div>
                  <div className="col-span-2"><span className="text-slate-400 block">Địa chỉ:</span> <span className="font-semibold text-slate-700 block">{displayAddress}</span></div>
                </div>

                {displayNotes && (
                  <div className="text-xs border rounded-xl p-3 bg-white space-y-1">
                    <span className="text-slate-400 font-semibold block">Ghi chú:</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{displayNotes}</p>
                  </div>
                )}

                {!viewItem.assigned_to && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
                    <div>
                      <span className="font-bold text-amber-900 text-xs block">⚠️ Lịch hẹn chưa có Sale phụ trách</span>
                      <span className="text-[11px] text-amber-700">Bấm nhận ngay để chăm sóc khách hàng này.</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await handleClaim(viewItem);
                        setIsViewOpen(false);
                      }}
                      disabled={claimingId === viewItem.id}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs h-8 px-3 rounded-lg shadow-sm shrink-0 gap-1 animate-pulse"
                    >
                      {claimingId === viewItem.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '✋ Nhận Ngay'}
                    </Button>
                  </div>
                )}

                <div className="space-y-1.5 border rounded-xl p-3 bg-white">
                  <Label className="text-xs font-semibold text-slate-500">Phân công Sale phụ trách</Label>
                  <select
                    value={viewItem.assigned_to || ''}
                    onChange={async (e) => {
                      const profileId = e.target.value;
                      const profileName = assignableProfiles.find(p => p.id === profileId)?.full_name || null;
                      await update(viewItem.id, { 
                        assigned_to: profileId || null, 
                        assigned_to_name: profileName 
                      });
                      toast.success('Đã phân công Sale phụ trách!');
                    }}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {assignableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-slate-500">Cập nhật trạng thái lịch hẹn</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['Pending', 'Confirm', 'Viewed', 'Dealed', 'Cancel'] as const).filter((s) => s !== viewItem.status).map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => { handleStatusChange(viewItem.id, s); setIsViewOpen(false); }}
                        className="text-xs h-7 px-2.5"
                      >
                        {statusLabels[s]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-1.5 rounded-xl shadow-md"
                    onClick={() => {
                      setIsViewOpen(false);
                      const params = new URLSearchParams();
                      if (viewItem.room_id) params.set('room_id', viewItem.room_id);
                      if (viewItem.building_id) params.set('building_id', viewItem.building_id);
                      if (viewItem.customer_name) params.set('customer_name', viewItem.customer_name);
                      if (viewItem.customer_phone) params.set('customer_phone', viewItem.customer_phone);
                      if (viewItem.customer_email) params.set('customer_email', viewItem.customer_email);
                      if (viewItem.assigned_to) params.set('sales_agent_id', viewItem.assigned_to);
                      router.push(`${pathPrefix}/contracts/create?${params.toString()}`);
                    }}
                  >
                    <Handshake className="h-4 w-4" />
                    <span>Lập Hợp Đồng Đặt Cọc Ngay</span>
                  </Button>
                </div>
              </div>

              <div className="md:col-span-7">
                <ShowingActionDrawer
                  appointment={viewItem as any}
                  onRefresh={() => {
                    update(viewItem.id, {});
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-slate-600" />
              Cập nhật trạng thái nhanh
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <p className="font-semibold text-slate-800">{editItem.customer_name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{editItem.room_title ?? '—'} · {formatDate(editItem.date)} {editItem.time}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chọn trạng thái mới</Label>
                <div className="grid grid-cols-1 gap-2">
                  {STATUS_LIST.map((s) => {
                    const isCurrent = editItem.status === s;
                    return (
                      <button
                        key={s}
                        disabled={isCurrent || editUpdating}
                        onClick={() => handleQuickStatus(s)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                          ${isCurrent
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 cursor-default'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColors[s]?.split(' ')[0] || 'bg-slate-200'}`} />
                          {statusLabels[s]}
                        </span>
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-xs text-indigo-500">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Hiện tại
                          </span>
                        )}
                        {editUpdating && !isCurrent && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                      </button>
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
