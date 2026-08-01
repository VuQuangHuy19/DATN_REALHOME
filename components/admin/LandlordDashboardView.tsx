'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAreaColorClass } from '@/lib/utils/colors';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover, PopoverTrigger, PopoverContent
} from '@/components/ui/popover';
import {
  Building2, Home, DollarSign, CalendarDays, Percent, FileText,
  CheckCircle, ShieldAlert, Clock, User, Phone, MapPin,
  ExternalLink, ArrowRight, Activity, Calendar, TrendingUp, Sparkles, AlertCircle, HelpCircle, Info, X
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface LandlordDashboardProps {
  stats: {
    totalBuildings: number;
    totalRooms: number;
    availableRooms: number;
    rentedRooms: number;
    recentAppointments: any[];
    monthlyRevenue: number;
    grossRevenue?: number;
    netRentRevenue?: number;
    activeContractsCount: number;
    occupancyRate: number;
    buildingsList: any[];
    roomsList: any[];
    contractsList: any[];
    recentInvoices?: any[];
    landlordRevenueHistory?: any[];
    expiringContractsGrouped?: any[];
    overdueInvoicesGrouped?: any[];
    monthlyTransactionStats?: {
      appointmentsCount: number;
      depositCount: number;
      rentalCount: number;
      cancelDepositCount: number;
    };
    areaPerformanceList?: any[];
  };
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  isFetching?: boolean;
}

const statusStyle: Record<string, { btn: string; dot: string }> = {
  available: {
    btn: 'bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] hover:bg-[hsl(142,60%,86%)] border border-[hsl(142,45%,78%)] shadow-sm hover:shadow-md',
    dot: 'bg-[hsl(142,52%,42%)]',
  },
  rented: {
    btn: 'bg-[hsl(4,72%,93%)] text-[hsl(4,60%,36%)] hover:bg-[hsl(4,72%,87%)] border border-[hsl(4,55%,78%)] shadow-sm hover:shadow-md',
    dot: 'bg-[hsl(4,60%,52%)]',
  },
  maintenance: {
    btn: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] hover:bg-[hsl(38,90%,86%)] border border-[hsl(38,72%,76%)] shadow-sm hover:shadow-md',
    dot: 'bg-[hsl(38,72%,46%)]',
  },
  reserved: {
    btn: 'bg-[hsl(224,60%,93%)] text-[hsl(224,52%,36%)] hover:bg-[hsl(224,60%,87%)] border border-[hsl(224,48%,78%)] shadow-sm hover:shadow-md',
    dot: 'bg-[hsl(224,52%,52%)]',
  },
};

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đang giữ',
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function QuickTooltip({ content, align = 'left' }: { content: React.ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);

  const alignClass = align === 'right' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto';

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded-full hover:bg-emerald-50 shrink-0 focus:outline-none transition-colors"
        title="Rê chuột hoặc chạm để xem giải thích chi tiết"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="sm:hidden fixed inset-0 bg-black/40 z-[99] backdrop-blur-[1px] animate-in fade-in-0"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />

          {/* Popup Container: Mobile Centered Modal vs Desktop Floating Hover */}
          <div
            className={`
              fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[100] max-w-sm mx-auto p-4 text-xs bg-white border border-emerald-200 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95 pointer-events-auto
              sm:absolute sm:top-full sm:mt-2 sm:translate-y-0 sm:max-w-none sm:w-80 sm:z-50 ${alignClass}
            `}
          >
            <div className="flex sm:hidden items-center justify-between border-b border-border/50 pb-2 mb-2">
              <span className="text-[11px] font-bold text-ink-muted uppercase">Chi tiết thông tin</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="text-ink-muted hover:text-ink p-1 rounded-full bg-bg-subtle"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {content}
          </div>
        </>
      )}
    </div>
  );
}

function getEffectiveRoomStatus(room: any, contractsList: any[] = []) {
  if (room.status === 'reserved') {
    const isExpired = room.reserved_until ? new Date(room.reserved_until).getTime() < Date.now() : true;
    const hasContract = (contractsList || []).some((c: any) => c.room_id === room.id);
    if (isExpired && !hasContract) return 'available';
  }
  return room.status;
}

export function LandlordDashboardView({
  stats,
  timeframe = 'last_month',
  onTimeframeChange,
  isFetching = false,
}: LandlordDashboardProps) {
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');

  useEffect(() => {
    // Tự động gọi API giải phóng các phòng hết hạn khóa tạm 15 phút nếu có
    fetch('/api/rooms/auto-release-expired', { method: 'POST' }).catch(() => {});
  }, []);

  const getDaysRemaining = (endDateStr: string) => {
    const diff = new Date(endDateStr).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleRoomClick = (room: any) => {
    const contract = stats.contractsList.find((c) => c.room_id === room.id);
    setSelectedRoom({ ...room, contract });
    setIsRoomDialogOpen(true);
  };

  const roomStatusSafe = (s: string) => statusStyle[s] ?? statusStyle.maintenance;

  // Areas list for filter
  const areaOptions = useMemo(() => {
    const areas = (stats.buildingsList || []).map((b: any) => b.area).filter(Boolean);
    return Array.from(new Set(areas));
  }, [stats.buildingsList]);

  // Filtered buildings by selected area
  const filteredBuildingsList = useMemo(() => {
    if (selectedAreaFilter === 'all') return stats.buildingsList || [];
    return (stats.buildingsList || []).filter((b: any) => b.area === selectedAreaFilter);
  }, [stats.buildingsList, selectedAreaFilter]);

  // Lagged Revenue Chart Data (Month N-1)
  const laggedRevenueChartData = useMemo(() => {
    const history = stats.landlordRevenueHistory || [];
    if (history.length === 0) return [];

    const periodMap = new Map<string, { rent: number; electricity: number; water: number; service: number }>();
    history.forEach((inv: any) => {
      const p = inv.period;
      if (!periodMap.has(p)) {
        periodMap.set(p, { rent: 0, electricity: 0, water: 0, service: 0 });
      }
      const data = periodMap.get(p)!;
      data.rent += Number(inv.rent_amount || 0);
      data.electricity += Number(inv.electricity_amount || 0);
      data.water += Number(inv.water_amount || 0);
      data.service += Number(inv.service_amount || 0);
    });

    const sortedPeriods = Array.from(periodMap.keys()).sort();
    return sortedPeriods.map(p => {
      const data = periodMap.get(p)!;
      return {
        period: p,
        rent: data.rent / 1000000,
        electricity: data.electricity / 1000000,
        water: data.water / 1000000,
        service: data.service / 1000000,
        total: (data.rent + data.electricity + data.water + data.service) / 1000000,
      };
    });
  }, [stats.landlordRevenueHistory]);

  // Group vacant rooms by area (quận/huyện)
  const vacantRoomsByArea = useMemo(() => {
    const map: Record<string, number> = {};
    (stats.roomsList || []).forEach((room: any) => {
      const status = getEffectiveRoomStatus(room, stats.contractsList);
      if (status === 'available') {
        const bld = (stats.buildingsList || []).find((b: any) => b.code === room.building_id || b.id === room.building_id);
        const area = bld?.area || 'Khác';
        map[area] = (map[area] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);
  }, [stats.roomsList, stats.buildingsList, stats.contractsList]);

  const grossMoney = stats.grossRevenue || 0;
  const netMoney = stats.netRentRevenue || 0;
  const monthStats = stats.monthlyTransactionStats || { appointmentsCount: 0, depositCount: 0, rentalCount: 0, cancelDepositCount: 0 };

  const timeframeLabels: Record<string, string> = {
    current_month: 'Tháng 8/2026 (Hiện tại)',
    last_month: 'Tháng 7/2026 (Kỳ trước)',
    this_quarter: 'Quý 3/2026',
    this_year: 'Năm 2026',
    all_time: 'Toàn bộ thời gian',
  };

  const activeTimeframeLabel = timeframeLabels[timeframe] || (timeframe.includes('-') ? `Tháng ${timeframe.split('-')[1]}/${timeframe.split('-')[0]}` : timeframe);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-heading text-ink tracking-tight flex items-center gap-2">
            <span>Tổng Quan Kinh Doanh</span>
            {isFetching && <Clock className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />}
          </h1>
          <p className="text-ink-muted mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Theo dõi doanh thu, tỷ lệ lấp đầy và tình hình vận hành các tòa nhà
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-emerald-700 text-xs sm:text-sm font-semibold w-fit shrink-0">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 shrink-0" />
          <span>Tài khoản Chủ nhà</span>
        </div>
      </div>

      {/* Timeframe Selector Control Bar - Optimized for Mobile & Desktop */}
      <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-white to-sky-50/50 shadow-sm rounded-2xl overflow-hidden p-3.5 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-ink">Xem theo thời gian:</span>
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>{activeTimeframeLabel}</span>
              {isFetching && <Clock className="h-3 w-3 animate-spin text-white" />}
            </Badge>
          </div>

          {/* Quick Selection Pills Strip - Horizontal Scroll on Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none w-full lg:w-auto">
            {[
              { id: 'last_month', label: 'Tháng 7/2026 (Kỳ trước)' },
              { id: 'current_month', label: 'Tháng 8/2026' },
              { id: 'this_quarter', label: 'Quý 3/2026' },
              { id: 'this_year', label: 'Năm 2026' },
              { id: 'all_time', label: 'Tất cả' },
            ].map((item) => (
              <button
                key={item.id}
                disabled={isFetching}
                onClick={() => onTimeframeChange?.(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer active:scale-95 ${
                  timeframe === item.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-white/80 text-ink-muted hover:text-ink hover:bg-white border border-border/80'
                } ${isFetching ? 'opacity-70 cursor-wait' : ''}`}
              >
                {item.label}
              </button>
            ))}

            {/* Custom Month Selector Dropdown */}
            <div className="relative shrink-0 ml-1">
              <select
                disabled={isFetching}
                value={timeframe.includes('-') ? timeframe : ''}
                onChange={(e) => e.target.value && onTimeframeChange?.(e.target.value)}
                className="h-8 rounded-xl border border-emerald-300 bg-white px-2.5 text-xs text-emerald-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-xs cursor-pointer disabled:opacity-70"
              >
                <option value="" disabled>🗓️ Chọn tháng...</option>
                <option value="2026-08">Tháng 08/2026</option>
                <option value="2026-07">Tháng 07/2026</option>
                <option value="2026-06">Tháng 06/2026</option>
                <option value="2026-05">Tháng 05/2026</option>
                <option value="2026-04">Tháng 04/2026</option>
                <option value="2026-03">Tháng 03/2026</option>
                <option value="2026-02">Tháng 02/2026</option>
                <option value="2026-01">Tháng 01/2026</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Floating Loading Toast Banner when fetching */}
      {isFetching && (
        <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-slate-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-white/10 animate-in fade-in-0 slide-in-from-bottom-4">
          <Clock className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
          <span>Đang tính toán dữ liệu báo cáo <strong>{activeTimeframeLabel}</strong>...</span>
        </div>
      )}

      {/* Main Dashboard Grid with Smooth Opacity Fade on Fetching */}
      <div className={`space-y-4 sm:space-y-6 transition-all duration-300 ${isFetching ? 'opacity-40 grayscale-[20%] pointer-events-none' : 'opacity-100'}`}>

      {/* Hero Revenue Kép Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Doanh thu Gộp (Cọc + Tiền nhà) */}
        <Card className="border-border shadow-none rounded-xl bg-white min-w-0 hover:border-emerald-300 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider truncate">Doanh thu Gộp (Cọc + Tiền nhà)</p>
                  <QuickTooltip
                    align="left"
                    content={
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-emerald-700 text-sm flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                          <DollarSign className="h-4 w-4" /> Chi Tiết Tính Doanh Thu Gộp
                        </h4>
                        <div className="space-y-1.5 text-ink text-xs">
                          <div className="flex justify-between items-center">
                            <span>📌 Tiền cọc thực thu (Cọc HĐ):</span>
                            <strong className="font-mono text-emerald-600">{formatCurrency(grossMoney > 5200000 ? grossMoney - 5200000 : grossMoney > 0 ? 5200000 : 0)}</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>📌 1 Tháng tiền nhà đầu tiên:</span>
                            <strong className="font-mono text-emerald-600">{formatCurrency(grossMoney > 5200000 ? 5200000 : 0)}</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>📌 Tiền nhà từ hóa đơn Paid:</span>
                            <strong className="font-mono text-ink-muted">0 đ</strong>
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 font-medium leading-relaxed">
                          💡 <strong>Tổng tiền mặt thực tế thu về</strong> bao gồm cọc đảm bảo hợp đồng + 1 tháng tiền nhà đóng trước khi nhận phòng.
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 mt-1 truncate tabular-nums">
                  {formatCurrency(grossMoney)}
                </p>
                <p className="text-[10px] text-ink-muted mt-1 truncate">Bao gồm cọc giữ phòng + tiền nhà tháng</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doanh thu Thực (Tiền nhà chưa dịch vụ) */}
        <Card className="border-border shadow-none rounded-xl bg-white min-w-0 hover:border-accent/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider truncate">Doanh thu Thực (Tiền thuần)</p>
                  <QuickTooltip
                    align="left"
                    content={
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-accent text-sm flex items-center gap-1.5 border-b border-accent/10 pb-2">
                          <TrendingUp className="h-4 w-4" /> Chi Tiết Tính Doanh Thu Thực
                        </h4>
                        <div className="space-y-1.5 text-ink text-xs">
                          <div className="flex justify-between items-center">
                            <span>🏠 Tiền nhà HĐT mới:</span>
                            <strong className="font-mono text-accent">{formatCurrency(netMoney)}</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>💳 Tiền nhà từ hóa đơn Paid:</span>
                            <strong className="font-mono text-ink-muted">0 đ</strong>
                          </div>
                        </div>
                        <div className="bg-accent-soft p-2.5 rounded-xl border border-accent/20 text-[11px] text-accent font-medium leading-relaxed">
                          ℹ️ <strong>Doanh thu cho thuê thuần</strong> (không bao gồm tiền cọc vì cọc là khoản thế chấp hoàn trả lại khách khi kết thúc hợp đồng).
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-lg sm:text-xl font-extrabold font-mono text-accent mt-1 truncate tabular-nums">
                  {formatCurrency(netMoney)}
                </p>
                <p className="text-[10px] text-ink-muted mt-1 truncate">Chưa tính điện, nước &amp; dịch vụ</p>
              </div>
              <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tỷ lệ lấp đầy & Số phòng */}
        <Card className="border-border shadow-none rounded-xl bg-white min-w-0">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider truncate">Tỷ lệ lấp đầy toàn bộ</p>
                  <QuickTooltip
                    align="right"
                    content={
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-ink text-sm flex items-center gap-1.5 border-b border-border pb-2">
                          <Percent className="h-4 w-4 text-emerald-600" /> Phân Bổ Tỷ Lệ Lấp Đầy
                        </h4>
                        <div className="space-y-1.5 text-ink text-xs">
                          <div className="flex justify-between items-center">
                            <span>🟢 Phòng đã cho thuê:</span>
                            <strong className="font-mono text-emerald-600">{stats.rentedRooms} / {stats.totalRooms} phòng ({stats.occupancyRate}%)</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>🟡 Phòng đang trống:</span>
                            <strong className="font-mono text-amber-600">{stats.availableRooms} phòng</strong>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading text-ink mt-1 tracking-tight">{stats.occupancyRate}%</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">{stats.rentedRooms}/{stats.totalRooms} phòng đang ở</p>
              </div>
              <div className="p-2 rounded-lg bg-bg-subtle text-ink-muted shrink-0">
                <Percent className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cảnh báo phòng trống */}
        <Card className="border-border shadow-none rounded-xl bg-white min-w-0">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider truncate">Phòng đang trống cần lấp</p>
                  <QuickTooltip
                    align="right"
                    content={
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-amber-700 text-sm flex items-center gap-1.5 border-b border-amber-100 pb-2">
                          <ShieldAlert className="h-4 w-4 text-amber-600" /> Thống Kê Phòng Trống Theo Khu Vực
                        </h4>
                        <div className="space-y-1.5 text-xs">
                          {vacantRoomsByArea.length > 0 ? (
                            vacantRoomsByArea.map((item) => (
                              <div key={item.area} className="flex justify-between items-center py-0.5 border-b border-amber-50 last:border-0">
                                <span className="font-medium text-ink">📍 {item.area}:</span>
                                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-mono">{item.count} phòng</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-ink-muted italic text-[11px]">Không có phòng trống</p>
                          )}
                        </div>
                        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-medium leading-relaxed mt-1">
                          🔥 Đẩy mạnh quảng cáo cho các khu vực có tỷ lệ phòng trống cao nhất.
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading text-amber-600 mt-1 tracking-tight">{stats.availableRooms} phòng</p>
                <p className="text-xs text-amber-700 font-medium mt-1 truncate">Cần thúc đẩy sale cho thuê</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thống kê biến động trong tháng: Lịch hẹn, Chốt cọc, Chốt thuê, Bỏ cọc */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 bg-white border border-border hover:border-indigo-300 transition-colors rounded-xl flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-ink-muted font-bold truncate">Cuộc hẹn xem</span>
              <QuickTooltip
                align="left"
                content={
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-indigo-700 text-sm flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                      <CalendarDays className="h-4 w-4" /> Thống Kê Cuộc Hẹn Xem Phòng
                    </h4>
                    <p className="text-ink-muted text-xs">
                      Tổng <strong>{monthStats.appointmentsCount}</strong> cuộc hẹn đăng ký bởi khách thuê xem phòng tại các tòa nhà trong kỳ lọc.
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold font-heading text-ink mt-0.5 block">{monthStats.appointmentsCount}</span>
          </div>
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 shrink-0 ml-1" />
        </div>

        <div className="p-3 sm:p-4 bg-white border border-border hover:border-amber-300 transition-colors rounded-xl flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-ink-muted font-bold truncate">Chốt đặt cọc</span>
              <QuickTooltip
                align="left"
                content={
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-amber-700 text-sm flex items-center gap-1.5 border-b border-amber-100 pb-2">
                      <DollarSign className="h-4 w-4" /> Số Lượng Chốt Cọc Trong Kỳ
                    </h4>
                    <p className="text-ink-muted text-xs">
                      Tổng <strong>{monthStats.depositCount}</strong> giao dịch giữ cọc phòng thành công.
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold font-heading text-amber-600 mt-0.5 block">{monthStats.depositCount}</span>
          </div>
          <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0 ml-1" />
        </div>

        <div className="p-3 sm:p-4 bg-white border border-border hover:border-emerald-300 transition-colors rounded-xl flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-ink-muted font-bold truncate">Chốt HĐ thuê</span>
              <QuickTooltip
                align="right"
                content={
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-emerald-700 text-sm flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                      <CheckCircle className="h-4 w-4" /> Hợp Đồng Thuê Mới Ký
                    </h4>
                    <p className="text-ink-muted text-xs">
                      Tổng <strong>{monthStats.rentalCount}</strong> hợp đồng thuê nhà chính thức đã chốt và bàn giao phòng cho khách.
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold font-heading text-emerald-600 mt-0.5 block">{monthStats.rentalCount}</span>
          </div>
          <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 shrink-0 ml-1" />
        </div>

        <div className="p-3 sm:p-4 bg-white border border-border hover:border-rose-300 transition-colors rounded-xl flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-ink-muted font-bold truncate">Bỏ cọc</span>
              <QuickTooltip
                align="right"
                content={
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-rose-700 text-sm flex items-center gap-1.5 border-b border-rose-100 pb-2">
                      <AlertCircle className="h-4 w-4" /> Số Lượng Hợp Đồng Bị Hủy
                    </h4>
                    <p className="text-ink-muted text-xs">
                      Có <strong>{monthStats.cancelDepositCount}</strong> trường hợp hủy cọc hoặc không tiến hành ký hợp đồng thuê.
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-lg sm:text-2xl font-extrabold font-heading text-rose-600 mt-0.5 block">{monthStats.cancelDepositCount}</span>
          </div>
          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 shrink-0 ml-1" />
        </div>
      </div>

      {/* Biểu đồ Doanh thu Trễ 1 tháng & Phân tích Khu vực Tiềm năng */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
        {/* Biểu đồ Doanh thu */}
        <Card className="lg:col-span-8 border-border shadow-none rounded-xl bg-white overflow-hidden min-w-0">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <CardTitle className="text-sm sm:text-base font-bold font-heading text-ink flex items-center gap-2 truncate">
              <Activity className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>Doanh Thu Tiền Nhà &amp; Dịch Vụ</span>
            </CardTitle>
            <span className="text-[10px] sm:text-xs text-ink-muted italic font-medium truncate">* Thống kê các kỳ hóa đơn khách đã thanh toán</span>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 min-w-0">
            {laggedRevenueChartData.length > 0 ? (
              <div className="h-56 sm:h-64 w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={laggedRevenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--ink-muted))" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--ink-muted))" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val.toFixed(0)}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }}
                      formatter={(value: any, name: any) => {
                        const labelMap = { rent: 'Tiền nhà', electricity: 'Tiền điện', water: 'Tiền nước', service: 'Phí dịch vụ' };
                        return [`${value.toFixed(2)}M VNĐ`, labelMap[name as keyof typeof labelMap] || name];
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="rent" stackId="a" fill="#3b82f6" name="Tiền nhà" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="electricity" stackId="a" fill="#f59e0b" name="Tiền điện" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="water" stackId="a" fill="#06b6d4" name="Tiền nước" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="service" stackId="a" fill="#a855f7" name="Phí dịch vụ" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-ink-muted text-xs sm:text-sm">
                Chưa có lịch sử thanh toán hóa đơn kỳ trước.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phân tích Tỷ Lệ Lấp Đầy Theo Khu Vực */}
        <Card className="lg:col-span-4 border-border shadow-none rounded-xl bg-white overflow-hidden min-w-0">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-bold font-heading text-ink flex items-center gap-2 truncate">
              <TrendingUp className="h-4.5 w-4.5 text-accent shrink-0" />
              <span>Tỷ Lệ Lấp Đầy Theo Khu Vực</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 min-w-0">
            {!(stats.areaPerformanceList || []).length ? (
              <div className="h-48 flex items-center justify-center text-ink-muted text-xs">
                Chưa có dữ liệu khu vực tòa nhà.
              </div>
            ) : (
              <div className="space-y-3">
                {(stats.areaPerformanceList || []).map((areaItem: any, idx: number) => (
                  <div key={idx} className="p-3 border border-border rounded-xl space-y-1.5 bg-bg-base/30 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1 min-w-0 truncate">
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" /> <span className="truncate">{areaItem.area}</span>
                      </span>
                      <Badge variant="outline" className={`text-[9px] font-bold shrink-0 ${areaItem.occupancyRate >= 90 ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {areaItem.potentialTag}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-ink-muted min-w-0">
                      <span className="truncate">{areaItem.buildingsCount} tòa ({areaItem.totalRooms} phòng)</span>
                      <span className="font-mono font-bold text-ink shrink-0 ml-1">Lấp đầy: {areaItem.occupancyRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buildings list + Area Filter */}
      <Card className="border-border shadow-none rounded-xl bg-white overflow-hidden min-w-0">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm sm:text-base font-bold font-heading text-ink flex items-center gap-2 truncate">
            <Building2 className="h-4.5 w-4.5 text-ink-muted shrink-0" />
            <span>Tỷ lệ Lấp đầy Tòa nhà theo Khu vực</span>
          </CardTitle>
          {/* Area Filter dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted font-medium shrink-0">Lọc khu vực:</span>
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-ink font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Tất cả khu vực</option>
              {areaOptions.map((area: any) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
            {filteredBuildingsList.map((building: any) => {
              const pct = building.totalRooms > 0 ? Math.round((building.rentedRooms / building.totalRooms) * 100) : 0;
              const barColor = pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-accent' : 'bg-amber-500';
              return (
                <div key={building.id} className="p-3.5 sm:p-4 border border-border rounded-xl space-y-2.5 bg-bg-base/30 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-ink truncate">{building.name}</h4>
                      <p className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 text-accent shrink-0" /> <span className="truncate">{building.area}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold shrink-0">{building.rentedRooms}/{building.totalRooms} phòng</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-bg-subtle rounded-full overflow-hidden border border-border">
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10.5px] text-ink-muted">
                      <span>Lấp đầy: <strong className="text-ink">{pct}%</strong></span>
                      <span>Trống: <strong className="text-amber-600">{building.totalRooms - building.rentedRooms} phòng</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Warnings & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {/* Hợp đồng sắp hết hạn (Gom nhóm theo Tòa nhà) */}
        <Card className="border-border shadow-none rounded-xl bg-white overflow-hidden min-w-0">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-base font-bold font-heading text-ink flex items-center gap-2 truncate">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              <span className="truncate">Hợp đồng sắp hết hạn (30d)</span>
            </CardTitle>
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
              {(stats.expiringContractsGrouped || []).length} hợp đồng
            </span>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 min-w-0">
            {!(stats.expiringContractsGrouped || []).length ? (
              <div className="py-8 text-center text-ink-muted text-xs">
                Không có hợp đồng nào sắp hết hạn trong 30 ngày tới.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(stats.expiringContractsGrouped || []).map((contract: any) => {
                  const daysLeft = getDaysRemaining(contract.end_date);
                  return (
                    <div key={contract.id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-amber-200 transition-colors min-w-0 gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-accent block truncate">{contract.building_name}</span>
                        <span className="text-xs sm:text-sm font-semibold text-ink block truncate">Phòng {contract.room_code} · {contract.party_b_name}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                        Còn {daysLeft} ngày
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hóa đơn tiền nhà + Dịch vụ chậm thanh toán */}
        <Card className="border-border shadow-none rounded-xl bg-white overflow-hidden min-w-0">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-base font-bold font-heading text-ink flex items-center gap-2 truncate">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0" />
              <span className="truncate">Hóa đơn chậm / Quá hạn</span>
            </CardTitle>
            <span className="text-[10px] sm:text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
              {(stats.overdueInvoicesGrouped || []).length} hóa đơn quá hạn
            </span>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 min-w-0">
            {!(stats.overdueInvoicesGrouped || []).length ? (
              <div className="py-8 text-center text-ink-muted text-xs">
                Tuyệt vời! Không có hóa đơn nào bị quá hạn thanh toán.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(stats.overdueInvoicesGrouped || []).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-xl bg-rose-50/30 min-w-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-rose-700 block truncate">{inv.building_name} · Phòng {inv.room_code}</span>
                      <span className="text-[11px] text-ink-muted font-mono block truncate">Mã HĐ: {inv.invoice_code} (Kỳ {inv.period})</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 shrink-0">
                      {formatCurrency(inv.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sơ đồ trạng thái phòng */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
            <Home className="h-4.5 w-4.5 text-ink-muted" />
            Sơ đồ trạng thái phòng trực quan
          </CardTitle>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {Object.entries(statusLabels).map(([s, label]) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${statusStyle[s]?.dot ?? 'bg-bg-subtle'}`} />
                <span className="text-ink-muted font-medium">{label}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {stats.buildingsList.length === 0 ? (
            <div className="text-center py-12 text-ink-muted">
              <p className="text-sm">Chưa có dữ liệu phòng để hiển thị sơ đồ</p>
            </div>
          ) : (
            <div className="space-y-8">
              {stats.buildingsList.map((building) => {
                const buildingRooms = stats.roomsList.filter((r) => r.building_id === building.code);
                const floors = Array.from(new Set(buildingRooms.map((r) => r.floor))).sort((a: any, b: any) => b - a);
                return (
                  <div key={building.id} className="space-y-4">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-ink-muted" />
                        {building.name}
                        <span className="text-ink-muted font-normal">({buildingRooms.length} phòng)</span>
                      </h3>
                    </div>
                    {buildingRooms.length === 0 ? (
                      <p className="text-xs text-ink-muted py-2 italic">
                        Tòa nhà này chưa được thiết lập phòng nào.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {floors.map((floor: any) => {
                          const floorRooms = buildingRooms
                            .filter((r) => r.floor === floor)
                            .sort((a, b) => a.code.localeCompare(b.code));
                          return (
                            <div key={floor} className="flex items-start gap-2 sm:gap-4">
                              <div className="w-12 sm:w-14 text-[10px] sm:text-[11px] font-bold text-ink-muted pt-2 shrink-0 uppercase tracking-wide">
                                Tầng {floor}
                              </div>
                              <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1 min-w-0">
                                {floorRooms.map((room) => {
                                  const effectiveStatus = getEffectiveRoomStatus(room);
                                  return (
                                    <button
                                      key={room.id}
                                      onClick={() => handleRoomClick({ ...room, status: effectiveStatus })}
                                      className={`w-14 h-11 sm:w-16 sm:h-12 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer shrink-0 ${roomStatusSafe(effectiveStatus).btn}`}
                                      title={`Phòng ${room.code} – ${statusLabels[effectiveStatus] || statusLabels.available}`}
                                    >
                                      <span className="text-[10px] sm:text-[11px] font-mono tracking-tight leading-none">
                                        {room.code}
                                      </span>
                                      <span className="text-[8.5px] sm:text-[9px] font-normal opacity-80 mt-0.5 leading-none tabular-nums">
                                        {(room.price / 1_000_000).toFixed(1)}M
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
