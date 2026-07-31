'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Eye, Search, CalendarDays, Loader2, AlertCircle, Share2,
  User, Phone, Building, Briefcase, CalendarClock, MessageSquare,
  CheckCircle2, Trash2, Handshake, FileSignature
} from 'lucide-react';
import { getAreaColorClass } from '@/lib/utils/colors';
import { useAppointments, useProfiles } from '@/src/features/staff/hooks/useStaff';;
import { useAuth } from '@/lib/auth/AuthContext';
import type { AppointmentWithRelations } from '@/src/features/staff/services/appointments';

/* ─── Status Styling ─────────────────────────────────────────────── */
const statusStyle: Record<string, string> = {
  Confirm: 'bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] border border-[hsl(142,45%,78%)]',
  Pending: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] border border-[hsl(38,72%,76%)]',
  Viewed:  'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]',
  Dealed:  'bg-[hsl(262,60%,92%)] text-[hsl(262,50%,32%)] border border-[hsl(262,48%,78%)]',
  Cancel:  'bg-[hsl(4,72%,93%)]  text-[hsl(4,60%,36%)]  border border-[hsl(4,55%,78%)]',
};

const statusLabels: Record<string, string> = {
  Pending: 'Chờ duyệt',
  Confirm: 'Đã xác nhận',
  Viewed:  'Đã xem phòng',
  Dealed:  'Đã chốt',
  Cancel:  'Đã hủy',
};

/* ─── Helper: format date dd/mm/yyyy ────────────────────────────── */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

/* ─── Helper: Zalo share text ────────────────────────────────────── */
function buildShareText(item: AppointmentWithRelations): string {
  const date = new Date(item.date).toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const status = statusLabels[item.status] || item.status;
  const bookingPartyText = item.assigned_to
    ? `Sale phụ trách: ${item.sale_name || '—'} (${item.sale_phone || '—'})`
    : `Đơn vị giới thiệu: ${item.company_name || '—'} (${item.company_phone || '—'})`;

  return [
    '📋 THÔNG TIN LỊCH HẸN XEM PHÒNG',
    '─────────────────────────',
    `👤 Khách hàng : ${item.customer_name}`,
    `📞 Số điện thoại: ${item.customer_phone ?? '—'}`,
    item.customer_email ? `📧 Email        : ${item.customer_email}` : null,
    `🏠 Bất động sản: ${item.room_title ?? '—'}`,
    item.building_address ? `📍 Địa chỉ      : ${item.building_address}` : null,
    `📅 Ngày xem    : ${date}`,
    `⏰ Giờ xem     : ${item.time}`,
    `🔖 Trạng thái  : ${status}`,
    `🔗 ${bookingPartyText}`,
    item.notes ? `📝 Ghi chú      : ${item.notes}` : null,
    '─────────────────────────',
    'Chủ nhà vui lòng chuẩn bị đón khách xem phòng. Xin cảm ơn!',
  ].filter(Boolean).join('\n');
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function LandlordAppointmentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const { company } = useAuth();
  const { items: aptList, loading, error, update } = useAppointments(company?.id);
  const { items: profiles } = useProfiles(company?.id);

  const assignableProfiles = useMemo(
    () => profiles.filter((p) => p.role !== 'landlord'),
    [profiles],
  );

  const [searchQuery, setSearchQuery]   = useState('');
  const [filterDate, setFilterDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [viewItem, setViewItem]   = useState<AppointmentWithRelations | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  /* ── Filtering & sorting ─────────────────────────────────────── */
  const sortedAndFiltered = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const todayStr = new Date(now.getTime() - offset * 60_000)
      .toISOString()
      .split('T')[0];

    return aptList
      .filter((a) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          a.customer_name.toLowerCase().includes(q) ||
          (a.customer_phone ?? '').includes(q) ||
          (a.room_title ?? '').toLowerCase().includes(q);
        const matchDate   = !filterDate   || a.date === filterDate;
        const matchStatus = !filterStatus || a.status === filterStatus;
        const matchSource =
          filterSource === 'all'      ? true :
          filterSource === 'sale'     ? !!a.assigned_to :
          filterSource === 'customer' ? !a.assigned_to : true;
        return matchSearch && matchDate && matchStatus && matchSource;
      })
      .sort((a, b) => {
        const aUp = a.date >= todayStr;
        const bUp = b.date >= todayStr;
        if (aUp !== bUp) return aUp ? -1 : 1;
        const dc = aUp ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
        if (dc !== 0) return dc;
        return aUp ? a.time.localeCompare(b.time) : b.time.localeCompare(a.time);
      });
  }, [aptList, searchQuery, filterDate, filterStatus, filterSource]);

  /* ── Actions ─────────────────────────────────────────────────── */
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedAndFiltered.map(item => item.id));
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
    if (!window.confirm(`Bạn có chắc chắn muốn hủy ${selectedIds.length} lịch hẹn đã chọn không?`)) return;
    try {
      await Promise.all(selectedIds.map(id => update(id, { status: 'Cancel' })));
      setSelectedIds([]);
      toast.success(`Đã hủy ${selectedIds.length} lịch hẹn.`);
    } catch {
      toast.error('Lỗi khi hủy lịch hẹn.');
    }
  };

  const handleStatusChange = async (
    id: string,
    status: AppointmentWithRelations['status'],
  ) => {
    try {
      await update(id, { status });
      toast.success(`Đã cập nhật: ${statusLabels[status]}`);
      if (viewItem?.id === id) setViewItem((prev) => prev ? { ...prev, status } : null);
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái lịch hẹn');
    }
  };

  const handleShare = (item: AppointmentWithRelations) => {
    const text = buildShareText(item);
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Đã copy thông tin lịch hẹn!', { description: 'Bạn có thể gửi qua Zalo.', duration: 3000 }))
      .catch(() => toast.error('Trình duyệt không hỗ trợ copy tự động'));
  };

  /* ─── Status pill helper ──────────────────────────────────────── */
  const StatusPill = ({ status }: { status: string }) => (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[status] ?? 'bg-bg-subtle text-ink-muted border border-border'}`}>
      {statusLabels[status] ?? status}
    </span>
  );

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Quản lý Lịch hẹn xem phòng
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Xem và xác nhận lịch hẹn của Sale hoặc Khách hàng gửi đến các tòa nhà của bạn
          </p>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[hsl(4,72%,96%)] border border-[hsl(4,55%,80%)] rounded-lg text-[hsl(4,60%,36%)] text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardContent className="pt-5 pb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Search */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              Tìm kiếm
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                placeholder="Tên khách, SĐT, căn hộ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-border rounded-lg focus-visible:ring-accent/40"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              Ngày hẹn
            </Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 border-border rounded-lg focus-visible:ring-accent/40"
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              Nguồn đặt lịch
            </Label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="all">Tất cả nguồn đặt</option>
              <option value="sale">Đặt bởi Sale (Nhân viên)</option>
              <option value="customer">Đặt bởi Khách (Trực tiếp)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5 flex gap-2">
            <div className="flex-1">
              <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Trạng thái
              </Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="">Tất cả</option>
                <option value="Pending">Chờ duyệt</option>
                <option value="Confirm">Đã xác nhận</option>
                <option value="Viewed">Đã xem phòng</option>
                <option value="Dealed">Đã chốt</option>
                <option value="Cancel">Đã hủy</option>
              </select>
            </div>
            {selectedIds.length > 0 && (
              <Button onClick={handleBulkDelete} size="icon" className="bg-red-500 hover:bg-red-600 text-white rounded-lg h-10 w-10 flex-shrink-0" title="Hủy các lịch đã chọn">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Appointments Table ────────────────────────────────────── */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-4 py-3.5 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                        onChange={handleSelectAll}
                        checked={selectedIds.length > 0 && selectedIds.length === sortedAndFiltered.length}
                      />
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Bất động sản
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Người đặt lịch
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink bg-white">
                  {sortedAndFiltered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-bg-subtle/60 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                        setViewItem(item); setIsViewOpen(true); 
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
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{item.customer_name}</div>
                        <div className="text-xs text-ink-muted font-mono mt-0.5 tabular-nums">
                          {item.customer_phone}
                        </div>
                      </td>

                      {/* Property */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-accent text-sm">{item.room_title ?? '—'}</div>
                        <div
                          className="text-xs text-ink-muted truncate max-w-[200px] mt-0.5"
                          title={item.building_address || ''}
                        >
                          {item.building_address || '—'}
                        </div>
                      </td>

                      {/* Date/Time */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink flex items-center gap-1.5 tabular-nums">
                          <CalendarClock className="h-3.5 w-3.5 text-ink-muted flex-shrink-0" />
                          <span className="font-mono text-sm">{formatDate(item.date)}</span>

                        </div>
                        <div className="text-xs text-ink-muted mt-0.5 font-mono tabular-nums">
                          {item.time}
                        </div>
                      </td>

                      {/* Booking Party */}
                      <td className="px-5 py-4">
                        {item.assigned_to ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] border border-[hsl(142,45%,78%)]">
                              <Briefcase className="h-3 w-3" /> Sale đặt lịch
                            </span>
                            <div className="text-xs font-semibold text-ink">{item.sale_name}</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]">
                              <User className="h-3 w-3" /> Khách trực tiếp
                            </span>
                            <div className="text-xs font-semibold text-ink">{item.company_name || 'Hệ thống'}</div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <StatusPill status={item.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                            className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-lg"
                            onClick={() => { setViewItem(item); setIsViewOpen(true); }}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-accent hover:text-accent hover:bg-accent-soft rounded-lg"
                            onClick={() => handleShare(item)}
                            title="Copy gửi Zalo"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedAndFiltered.length === 0 && (
                <div className="text-center py-16 text-ink-muted bg-white">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-ink">Không tìm thấy lịch hẹn nào</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Các yêu cầu đặt lịch hẹn của Sale hoặc Khách sẽ hiển thị tại đây.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl border border-border shadow-xl rounded-2xl bg-white">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-ink font-bold font-heading">
              <CalendarDays className="h-5 w-5 text-accent" />
              Thông tin chi tiết lịch hẹn
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-5 pt-2">
              {/* Customer + Property Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-bg-subtle p-4 border border-border rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Khách hàng</span>
                  <div className="font-bold text-ink text-base">{viewItem.customer_name}</div>
                  <div className="text-ink-muted font-mono text-sm flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {viewItem.customer_phone || '—'}
                  </div>
                  {viewItem.customer_email && (
                    <div className="text-ink-muted text-xs">{viewItem.customer_email}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Căn hộ / Phòng</span>
                  <div><span className="text-slate-500">Khu vực:</span> {viewItem.area ? <Badge variant="outline" className={getAreaColorClass(viewItem.area)}>{viewItem.area}</Badge> : '—'}</div>
                  <div className="font-bold text-accent text-base">{viewItem.room_title || '—'}</div>
                  <div className="text-ink-muted text-sm flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" /> {viewItem.building_address || '—'}
                  </div>
                </div>
                <div className="border-t border-border pt-3 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Ngày hẹn xem</span>
                    <div className="font-mono font-semibold text-ink mt-0.5 tabular-nums">{formatDate(viewItem.date)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Giờ hẹn xem</span>
                    <div className="font-mono font-semibold text-ink mt-0.5 tabular-nums">{viewItem.time}</div>
                  </div>
                </div>
              </div>

              {/* Booking Party */}
              <div className="border border-border rounded-xl p-4 bg-white space-y-3">
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Người đặt lịch hẹn</span>
                {viewItem.assigned_to ? (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] flex-shrink-0">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-ink flex items-center gap-2 flex-wrap">
                        {viewItem.sale_name}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] border border-[hsl(142,45%,78%)]">
                          Nhân viên Sale
                        </span>
                      </div>
                      {viewItem.sale_phone && (
                        <div className="text-sm text-ink-muted font-mono flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {viewItem.sale_phone}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] flex-shrink-0">
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-ink flex items-center gap-2 flex-wrap">
                        {viewItem.company_name || 'Hệ thống website'}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]">
                          Khách đặt trực tiếp
                        </span>
                      </div>
                      {viewItem.company_phone && (
                        <div className="text-sm text-ink-muted font-mono flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {viewItem.company_phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border border-border rounded-xl p-4 bg-white space-y-2">
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Ghi chú lịch hẹn
                </span>
                <p className="text-ink leading-relaxed text-sm bg-bg-subtle p-2.5 rounded-lg border border-border whitespace-pre-wrap">
                  {viewItem.notes || 'Không có ghi chú thêm.'}
                </p>
              </div>

              {/* Assign Sale */}
              <div className="border border-border rounded-xl p-4 bg-white space-y-2">
                <Label className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  Phân công Sale phụ trách
                </Label>
                <select
                  value={viewItem.assigned_to || ''}
                  onChange={async (e) => {
                    const profileId = e.target.value;
                    const profileName = assignableProfiles.find((p) => p.id === profileId)?.full_name || null;
                    try {
                      await update(viewItem.id, { assigned_to: profileId || null, assigned_to_name: profileName });
                      toast.success('Đã phân công Sale phụ trách!');
                      setIsViewOpen(false);
                    } catch {
                      toast.error('Lỗi khi phân công Sale');
                    }
                  }}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">-- Chưa phân công --</option>
                  {assignableProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Quick-Change — clearly labeled as allowed exception action */}
              <div className="rounded-xl border border-accent/25 bg-accent-soft/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">
                    Hành động được phép — Xác nhận lịch hẹn
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-muted font-semibold">Trạng thái hiện tại:</span>
                  <StatusPill status={viewItem.status} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['Pending', 'Confirm', 'Viewed', 'Dealed', 'Cancel'] as const)
                    .filter((s) => s !== viewItem.status)
                    .map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(viewItem.id, s)}
                        className="text-xs border-border hover:bg-bg-subtle hover:border-accent/40 text-ink"
                      >
                        {statusLabels[s]}
                      </Button>
                    ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(viewItem)}
                    className="text-xs text-accent hover:bg-accent-soft gap-1.5 ml-auto"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Copy Zalo
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-lg shadow-sm"
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
