'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
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
  Eye, Search, CalendarDays, Calendar, CalendarRange, MapPin, Loader2, AlertCircle, Share2,
  User, Phone, Building, Briefcase, CalendarClock, MessageSquare,
  CheckCircle2, Handshake, FileSignature, Clock,
  PhoneCall, RefreshCw, X, SlidersHorizontal
} from 'lucide-react';
import { useAppointments, useProfiles } from '@/src/features/staff/hooks/useStaff';
import { useAuth } from '@/lib/auth/AuthContext';
import type { AppointmentWithRelations } from '@/src/features/staff/services/appointments';
import { formatRoomCode } from '@/lib/room-status';

/* ─── Status Styling & Labels ───────────────────────────────────────── */
const statusStyle: Record<string, { badge: string; text: string; bg: string }> = {
  Pending: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    text: 'Chờ duyệt',
    bg: 'border-l-4 border-l-amber-500 bg-amber-50/30',
  },
  Confirm: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    text: 'Đã xác nhận',
    bg: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
  },
  Viewed: {
    badge: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    text: 'Đã xem phòng',
    bg: 'border-l-4 border-l-sky-500 bg-sky-50/20',
  },
  Dealed: {
    badge: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    text: 'Đã chốt HĐ',
    bg: 'border-l-4 border-l-purple-500 bg-purple-50/20',
  },
  Cancel: {
    badge: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
    text: 'Đã hủy',
    bg: 'border-l-4 border-l-slate-300 bg-slate-50/50 opacity-75',
  },
};

/* ─── Helper: format date dd/mm/yyyy ────────────────────────────── */
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

/* ─── Helper: Get ISO Date String offset by N days ───────────────── */
function getISOOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().split('T')[0];
}

/* ─── Helper: Zalo share text ────────────────────────────────────── */
function buildShareText(item: AppointmentWithRelations): string {
  const date = new Date(item.date).toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const status = statusStyle[item.status]?.text || item.status;
  const bookingPartyText = item.assigned_to
    ? `Sale phụ trách: ${item.sale_name || '—'} (${item.sale_phone || '—'})`
    : `Đơn vị giới thiệu: ${item.company_name || '—'} (${item.company_phone || '—'})`;

  return [
    '📋 THÔNG TIN LỊCH HẸN XEM PHÒNG',
    '─────────────────────────',
    `👤 Khách hàng : ${item.customer_name}`,
    `📞 Số điện thoại: ${item.customer_phone ?? '—'}`,
    item.customer_email ? `📧 Email        : ${item.customer_email}` : null,
    `🏠 Bất động sản: ${formatRoomCode(item.room_title ?? '')}`,
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

type DatePreset = 'all' | 'yesterday' | 'today' | 'tomorrow' | 'next7' | 'next30' | 'custom';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  /* ── Smart Date Filter State ───────────────────────────────────── */
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [viewItem, setViewItem] = useState<AppointmentWithRelations | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const todayStr = useMemo(() => getISOOffset(0), []);
  const yesterdayStr = useMemo(() => getISOOffset(-1), []);
  const tomorrowStr = useMemo(() => getISOOffset(1), []);
  const next7Str = useMemo(() => getISOOffset(7), []);
  const next30Str = useMemo(() => getISOOffset(30), []);

  /* ── Date Preset Change Handler ────────────────────────────────── */
  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setFromDate('');
      setToDate('');
    }
  };

  /* ── Filtered List ────────────────────────────────────────────── */
  const filteredAppointments = useMemo(() => {
    return aptList
      .filter((a) => {
        // Search Filter
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const matchSearch =
            a.customer_name.toLowerCase().includes(q) ||
            (a.customer_phone ?? '').includes(q) ||
            (a.room_title ?? '').toLowerCase().includes(q) ||
            (a.building_address ?? '').toLowerCase().includes(q);
          if (!matchSearch) return false;
        }

        // Status Filter
        if (filterStatus !== 'all' && a.status !== filterStatus) {
          return false;
        }

        // Source Filter
        if (filterSource === 'sale' && !a.assigned_to) return false;
        if (filterSource === 'customer' && a.assigned_to) return false;

        // Smart Date Range Filter
        if (datePreset === 'yesterday') {
          if (a.date !== yesterdayStr) return false;
        } else if (datePreset === 'today') {
          if (a.date !== todayStr) return false;
        } else if (datePreset === 'tomorrow') {
          if (a.date !== tomorrowStr) return false;
        } else if (datePreset === 'next7') {
          if (a.date < todayStr || a.date > next7Str) return false;
        } else if (datePreset === 'next30') {
          if (a.date < todayStr || a.date > next30Str) return false;
        } else if (datePreset === 'custom') {
          if (fromDate && a.date < fromDate) return false;
          if (toDate && a.date > toDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aUp = a.date >= todayStr;
        const bUp = b.date >= todayStr;
        if (aUp !== bUp) return aUp ? -1 : 1;
        const dc = aUp ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
        if (dc !== 0) return dc;
        return aUp ? a.time.localeCompare(b.time) : b.time.localeCompare(a.time);
      });
  }, [
    aptList,
    searchQuery,
    filterStatus,
    filterSource,
    datePreset,
    todayStr,
    yesterdayStr,
    tomorrowStr,
    next7Str,
    next30Str,
    fromDate,
    toDate,
  ]);

  /* ── Dynamic KPI Stats (Calculated based on active Date Filter) ── */
  const statsSummary = useMemo(() => {
    let activeDateList = aptList;

    if (datePreset === 'yesterday') {
      activeDateList = aptList.filter((a) => a.date === yesterdayStr);
    } else if (datePreset === 'today') {
      activeDateList = aptList.filter((a) => a.date === todayStr);
    } else if (datePreset === 'tomorrow') {
      activeDateList = aptList.filter((a) => a.date === tomorrowStr);
    } else if (datePreset === 'next7') {
      activeDateList = aptList.filter((a) => a.date >= todayStr && a.date <= next7Str);
    } else if (datePreset === 'next30') {
      activeDateList = aptList.filter((a) => a.date >= todayStr && a.date <= next30Str);
    } else if (datePreset === 'custom') {
      activeDateList = aptList.filter((a) => (!fromDate || a.date >= fromDate) && (!toDate || a.date <= toDate));
    }

    const totalCount = activeDateList.filter((a) => a.status !== 'Cancel').length;
    const pendingCount = activeDateList.filter((a) => a.status === 'Pending').length;
    const confirmCount = activeDateList.filter((a) => a.status === 'Confirm').length;
    const dealedCount = activeDateList.filter((a) => a.status === 'Dealed').length;

    return { totalCount, pendingCount, confirmCount, dealedCount };
  }, [aptList, datePreset, todayStr, yesterdayStr, tomorrowStr, next7Str, next30Str, fromDate, toDate]);

  /* ── Label description of active date range ───────────────────── */
  const dateFilterLabel = useMemo(() => {
    switch (datePreset) {
      case 'yesterday': return `Hôm qua (${formatDateDisplay(yesterdayStr)})`;
      case 'today': return `Hôm nay (${formatDateDisplay(todayStr)})`;
      case 'tomorrow': return `Ngày mai (${formatDateDisplay(tomorrowStr)})`;
      case 'next7': return `7 ngày tới (${formatDateDisplay(todayStr)} - ${formatDateDisplay(next7Str)})`;
      case 'next30': return `30 ngày tới (${formatDateDisplay(todayStr)} - ${formatDateDisplay(next30Str)})`;
      case 'custom':
        if (fromDate && toDate) return `Từ ${formatDateDisplay(fromDate)} đến ${formatDateDisplay(toDate)}`;
        if (fromDate) return `Từ ngày ${formatDateDisplay(fromDate)}`;
        if (toDate) return `Đến ngày ${formatDateDisplay(toDate)}`;
        return 'Tùy chọn khoảng ngày';
      default: return 'Tất cả thời gian';
    }
  }, [datePreset, yesterdayStr, todayStr, tomorrowStr, next7Str, next30Str, fromDate, toDate]);

  /* ── Actions ─────────────────────────────────────────────────── */
  const handleStatusChange = async (
    id: string,
    status: AppointmentWithRelations['status'],
  ) => {
    try {
      await update(id, { status });
      toast.success(`Đã cập nhật: ${statusStyle[status]?.text || status}`);
      if (viewItem?.id === id) setViewItem((prev) => (prev ? { ...prev, status } : null));
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái lịch hẹn');
    }
  };

  const handleShare = (item: AppointmentWithRelations) => {
    const text = buildShareText(item);
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Đã copy thông tin lịch hẹn!', { description: 'Có thể dán vào Zalo ngay.', duration: 3000 }))
      .catch(() => toast.error('Trình duyệt không hỗ trợ copy tự động'));
  };

  const handleCreateContract = (item: AppointmentWithRelations) => {
    const params = new URLSearchParams();
    if (item.room_id) params.set('room_id', item.room_id);
    if (item.building_id) params.set('building_id', item.building_id);
    if (item.customer_name) params.set('customer_name', item.customer_name);
    if (item.customer_phone) params.set('customer_phone', item.customer_phone);
    if (item.customer_email) params.set('customer_email', item.customer_email);
    if (item.assigned_to) params.set('sales_agent_id', item.assigned_to);
    router.push(`${pathPrefix}/contracts/create?${params.toString()}`);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-8 max-w-full overflow-x-hidden">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-ink tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-emerald-600 shrink-0" />
            <span>Lịch Hẹn Xem Phòng</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Quản lý &amp; xác nhận nhanh yêu cầu xem phòng từ Sale hoặc Khách hàng
          </p>
        </div>

        <Button
          onClick={() => {
            setDatePreset('all');
            setFromDate('');
            setToDate('');
            setShowCustomPicker(false);
            setSearchQuery('');
            setFilterStatus('all');
            setFilterSource('all');
          }}
          variant="outline"
          size="sm"
          className="self-start sm:self-auto text-xs font-bold gap-1.5 border-border hover:bg-bg-subtle text-ink rounded-xl"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Xóa tất cả bộ lọc</span>
        </Button>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Dynamic KPI Summary Cards (Auto-updates according to Date Filter) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl border bg-white border-border hover:border-emerald-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink-muted">
              Lịch Lọc ({statsSummary.totalCount})
            </span>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono mt-1 text-ink">{statsSummary.totalCount}</p>
          <p className="text-[10px] mt-0.5 truncate text-emerald-700 font-semibold">
            {dateFilterLabel}
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('Pending')}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'Pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]'
              : 'bg-white border-border hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${filterStatus === 'Pending' ? 'text-amber-100' : 'text-ink-muted'}`}>
              Chờ duyệt ⏳
            </span>
            <Clock className={`h-4 w-4 ${filterStatus === 'Pending' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono mt-1">{statsSummary.pendingCount}</p>
          <p className={`text-[10px] mt-0.5 truncate ${filterStatus === 'Pending' ? 'text-amber-100' : 'text-amber-600 font-medium'}`}>
            Cần xác nhận sớm
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('Confirm')}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'Confirm'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]'
              : 'bg-white border-border hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${filterStatus === 'Confirm' ? 'text-emerald-100' : 'text-ink-muted'}`}>
              Đã xác nhận ✅
            </span>
            <CheckCircle2 className={`h-4 w-4 ${filterStatus === 'Confirm' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono mt-1">{statsSummary.confirmCount}</p>
          <p className={`text-[10px] mt-0.5 truncate ${filterStatus === 'Confirm' ? 'text-emerald-100' : 'text-emerald-600 font-semibold'}`}>
            Sẵn sàng đón khách
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('Dealed')}
          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'Dealed'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]'
              : 'bg-white border-border hover:border-purple-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${filterStatus === 'Dealed' ? 'text-purple-100' : 'text-ink-muted'}`}>
              Đã chốt HĐ 🤝
            </span>
            <Handshake className={`h-4 w-4 ${filterStatus === 'Dealed' ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono mt-1">{statsSummary.dealedCount}</p>
          <p className={`text-[10px] mt-0.5 truncate ${filterStatus === 'Dealed' ? 'text-purple-100' : 'text-purple-600 font-medium'}`}>
            Ký hợp đồng thành công
          </p>
        </div>
      </div>

      {/* ── ULTRA-COMPACT UNIFIED FILTER BAR (THANH LỌC SIÊU GỌN 2 DÒNG) ── */}
      <Card className="border-border shadow-2xs rounded-2xl bg-white overflow-hidden p-3 sm:p-3.5 space-y-2.5">
        {/* Row 1: Search + Date Pickers + Nguồn đặt */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
            <Input
              placeholder="Tìm tên khách hàng, SĐT, căn hộ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-9 rounded-xl border-border text-xs focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Date Inputs (Từ ngày -> Đến ngày) */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase px-1 shrink-0">Lịch:</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('custom');
              }}
              className="h-7.5 text-xs bg-white border-border rounded-lg w-28 font-mono px-1.5"
            />
            <span className="text-xs font-bold text-slate-400">➔</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('custom');
              }}
              className="h-7.5 text-xs bg-white border-border rounded-lg w-28 font-mono px-1.5"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setDatePreset('all');
                }}
                className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Xóa khoảng ngày"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Source Dropdown */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-8.5 rounded-xl border border-border bg-white px-2.5 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer shrink-0"
          >
            <option value="all">🌐 Tất cả nguồn</option>
            <option value="sale">💼 Sale đặt</option>
            <option value="customer">👤 Khách đặt</option>
          </select>
        </div>

        {/* Row 2: Combined Scrollable Pills (Date Presets + Divider + Status Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 text-xs select-none scrollbar-none border-t border-border/50">
          <span className="font-bold text-slate-500 text-[11px] shrink-0">Thời gian:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'yesterday', label: 'Hôm qua' },
            { id: 'today', label: '🔥 Hôm nay' },
            { id: 'tomorrow', label: 'Ngày mai' },
            { id: 'next7', label: '7 ngày tới' },
            { id: 'next30', label: '30 ngày tới' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                const p = preset.id as DatePreset;
                setDatePreset(p);
                if (p === 'yesterday') { setFromDate(yesterdayStr); setToDate(yesterdayStr); }
                else if (p === 'today') { setFromDate(todayStr); setToDate(todayStr); }
                else if (p === 'tomorrow') { setFromDate(tomorrowStr); setToDate(tomorrowStr); }
                else if (p === 'next7') { setFromDate(todayStr); setToDate(next7Str); }
                else if (p === 'next30') { setFromDate(todayStr); setToDate(next30Str); }
                else { setFromDate(''); setToDate(''); }
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                datePreset === preset.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-bg-subtle text-ink-muted border-border hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <span className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

          <span className="font-bold text-slate-500 text-[11px] shrink-0">Trạng thái:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'Pending', label: '⏳ Chờ duyệt' },
            { id: 'Confirm', label: '✅ Đã duyệt' },
            { id: 'Viewed', label: '👁️ Đã xem' },
            { id: 'Dealed', label: '🤝 Đã chốt' },
            { id: 'Cancel', label: '❌ Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-bg-subtle text-ink-muted border-border hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── APPOINTMENT CARDS LIST (Mobile-First Responsive Layout) ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-border shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-ink-muted">Đang tải danh sách lịch hẹn...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="py-16 text-center text-ink-muted bg-white rounded-2xl border border-dashed border-border p-6 space-y-2">
          <CalendarDays className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-ink">Không có lịch hẹn nào trong thời gian này</p>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            Bấm &quot;Bỏ lọc thời gian&quot; hoặc chọn &quot;30 ngày tới&quot; để xem các lịch hẹn khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredAppointments.map((item) => {
            const isToday = item.date === todayStr;
            const statusConfig = statusStyle[item.status] || {
              badge: 'bg-bg-subtle text-ink-muted border-border',
              text: item.status,
              bg: 'border-l-4 border-l-slate-300',
            };

            return (
              <div
                key={item.id}
                className={`group relative p-4 rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5 ${statusConfig.bg}`}
              >
                {/* Header: Date & Time + Status Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink font-mono tabular-nums">
                      <CalendarClock className={`h-4 w-4 shrink-0 ${isToday ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                      <span>{formatDateDisplay(item.date)}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-extrabold">{item.time}</span>
                    </div>
                    {isToday && (
                      <span className="inline-block text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        🔥 Lịch Hôm Nay
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-lg shrink-0 ${statusConfig.badge}`}>
                    {statusConfig.text}
                  </Badge>
                </div>

                {/* Property & Customer Info */}
                <div className="space-y-2">
                  {/* Property */}
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-ink group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{formatRoomCode(item.room_title ?? '')}</span>
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1 line-clamp-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{item.building_address || 'Chưa cập nhật địa chỉ'}</span>
                    </p>
                  </div>

                  {/* Customer Card */}
                  <div className="p-2.5 rounded-xl bg-bg-base/60 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        {item.customer_name}
                      </span>
                      <span className="font-mono text-emerald-700 font-bold">{item.customer_phone}</span>
                    </div>

                    {/* Booking Party info */}
                    <div className="text-[11px] text-ink-muted pt-1 border-t border-border/40 flex items-center justify-between">
                      {item.assigned_to ? (
                        <span className="flex items-center gap-1 font-semibold text-slate-700 truncate">
                          <Briefcase className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Sale: <strong>{item.sale_name || 'Sale'}</strong> ({item.sale_phone || 'N/A'})</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold text-sky-700 truncate">
                          <User className="h-3 w-3 text-sky-600 shrink-0" />
                          <span>Khách đặt trực tiếp</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 4 QUICK ACTION 1-TAP BUTTONS FOR LANDLORD (MOBILE FIRST) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-border/60">
                  {/* Button 1: Call Phone */}
                  {item.customer_phone ? (
                    <a
                      href={`tel:${item.customer_phone}`}
                      className="flex items-center justify-center gap-1 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer active:scale-95 text-center"
                      title="Gọi điện ngay cho khách"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Gọi điện</span>
                    </a>
                  ) : (
                    <Button disabled variant="outline" size="sm" className="text-xs text-slate-300">
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* Button 2: Copy Zalo */}
                  <button
                    onClick={() => handleShare(item)}
                    className="flex items-center justify-center gap-1 p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all cursor-pointer active:scale-95 text-center"
                    title="Copy thông tin gửi Zalo"
                  >
                    <Share2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    <span>Chát Zalo</span>
                  </button>

                  {/* Button 3: One-Tap Confirm Status */}
                  <button
                    onClick={() => handleStatusChange(item.id, item.status === 'Confirm' ? 'Viewed' : 'Confirm')}
                    className={`flex items-center justify-center gap-1 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 text-center ${
                      item.status === 'Confirm'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                    title={item.status === 'Confirm' ? 'Đã xác nhận - Bấm để chuyển Đã xem phòng' : 'Bấm để Xác nhận lịch hẹn'}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.status === 'Confirm' ? 'Đã duyệt' : 'Xác nhận'}</span>
                  </button>

                  {/* Button 4: Create Deposit Contract */}
                  <button
                    onClick={() => handleCreateContract(item)}
                    className="flex items-center justify-center gap-1 p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-extrabold transition-all cursor-pointer active:scale-95 text-center"
                    title="Chốt hợp đồng đặt cọc phòng này ngay"
                  >
                    <FileSignature className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span>Đặt cọc</span>
                  </button>
                </div>

                {/* Additional View Detail Button */}
                <button
                  onClick={() => { setViewItem(item); setIsViewOpen(true); }}
                  className="w-full text-center text-[11px] font-bold text-ink-muted hover:text-emerald-700 py-1 hover:underline cursor-pointer flex items-center justify-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>Xem chi tiết ghi chú &amp; phân công Sale</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Dialog Modal ────────────────────────────────────── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl border border-border shadow-xl rounded-2xl bg-white p-5">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-ink font-bold font-heading text-base">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              <span>Thông tin chi tiết lịch hẹn</span>
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Customer + Property Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-bg-subtle p-3.5 border border-border rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Khách hàng</span>
                  <div className="font-bold text-ink text-sm">{viewItem.customer_name}</div>
                  <div className="text-ink-muted font-mono text-xs flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" /> {viewItem.customer_phone || '—'}
                  </div>
                  {viewItem.customer_email && (
                    <div className="text-ink-muted text-[11px]">{viewItem.customer_email}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Bất động sản</span>
                  <div className="font-extrabold text-emerald-700 text-sm">{formatRoomCode(viewItem.room_title ?? '')}</div>
                  <div className="text-ink-muted text-xs flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {viewItem.building_address || '—'}
                  </div>
                </div>

                <div className="border-t border-border pt-2.5 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Ngày hẹn xem</span>
                    <div className="font-mono font-bold text-ink mt-0.5">{formatDateDisplay(viewItem.date)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Giờ hẹn xem</span>
                    <div className="font-mono font-bold text-emerald-700 mt-0.5">{viewItem.time}</div>
                  </div>
                </div>
              </div>

              {/* Booking Party */}
              <div className="border border-border rounded-xl p-3.5 bg-white space-y-2">
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block">Người đặt lịch hẹn</span>
                {viewItem.assigned_to ? (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-ink">{viewItem.sale_name}</div>
                      <div className="text-xs text-ink-muted font-mono">{viewItem.sale_phone || 'Chưa có SĐT'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-50 text-sky-700 shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-ink">{viewItem.company_name || 'Khách trực tiếp'}</div>
                      <div className="text-xs text-ink-muted">Đặt trực tiếp từ trang web</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border border-border rounded-xl p-3.5 bg-white space-y-1.5">
                <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> Ghi chú lịch hẹn
                </span>
                <p className="text-ink leading-relaxed text-xs bg-bg-subtle p-2.5 rounded-lg border border-border whitespace-pre-wrap">
                  {viewItem.notes || 'Không có ghi chú thêm.'}
                </p>
              </div>

              {/* Assign Sale */}
              <div className="border border-border rounded-xl p-3.5 bg-white space-y-1.5">
                <Label className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                  Phân công Sale phụ trách đón khách
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
                  className="w-full h-9.5 rounded-xl border border-border bg-white px-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">-- Chưa phân công --</option>
                  {assignableProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Status Change Actions */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  Đổi Trạng Thái Lịch Hẹn
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {(['Pending', 'Confirm', 'Viewed', 'Dealed', 'Cancel'] as const).map((s) => (
                    <Button
                      key={s}
                      variant={viewItem.status === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(viewItem.id, s)}
                      className={`text-xs rounded-xl ${
                        viewItem.status === s
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'border-border bg-white text-ink hover:bg-emerald-50'
                      }`}
                    >
                      {statusStyle[s]?.text || s}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  onClick={() => handleShare(viewItem)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-sky-700 border-sky-300 hover:bg-sky-50 gap-1.5 rounded-xl"
                >
                  <Share2 className="h-4 w-4 text-sky-600" />
                  <span>Copy tin nhắn Zalo</span>
                </Button>
                <Button
                  onClick={() => {
                    setIsViewOpen(false);
                    handleCreateContract(viewItem);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs gap-1.5 rounded-xl shadow-md"
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
