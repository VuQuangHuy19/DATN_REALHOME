'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, Home, DollarSign, CalendarDays, Percent, FileText,
  CheckCircle, ShieldAlert, Clock, User, Phone, MapPin,
  ExternalLink, ArrowRight, Activity, Calendar
} from 'lucide-react';
import Link from 'next/link';

interface LandlordDashboardProps {
  stats: {
    totalBuildings: number;
    totalRooms: number;
    availableRooms: number;
    rentedRooms: number;
    recentAppointments: any[];
    monthlyRevenue: number;
    activeContractsCount: number;
    occupancyRate: number;
    buildingsList: any[];
    roomsList: any[];
    contractsList: any[];
    recentInvoices?: any[];
  };
}

/* ─── Room Status Styling ───────────────────────────────────────── */
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

const apptStatusStyle: Record<string, string> = {
  confirmed: 'bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] border-[hsl(142,45%,78%)]',
  pending: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] border-[hsl(38,72%,76%)]',
  completed: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border-[hsl(211,55%,76%)]',
  cancelled: 'bg-[hsl(4,72%,93%)] text-[hsl(4,60%,36%)] border-[hsl(4,55%,78%)]',
};

const apptStatusLabels: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  pending: 'Chờ duyệt',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export function LandlordDashboardView({ stats }: LandlordDashboardProps) {
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

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

  // Lọc phòng đang trống để hiển thị ở danh sách phòng trống cần cho thuê
  const vacantRooms = useMemo(() => {
    return (stats.roomsList || []).filter((room: any) => room.status === 'available');
  }, [stats.roomsList]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Tổng quan vận hành Chủ nhà
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Quản lý tài sản, doanh thu dòng tiền và tình trạng thuê phòng của bạn
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-700 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Chủ nhà
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tòa nhà */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tòa nhà sở hữu</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalBuildings}</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tổng số phòng */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tổng số phòng</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">{stats.totalRooms}</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted">
                <Home className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Số phòng đang trống */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Phòng đang trống</p>
              <p className="text-3xl font-bold font-heading text-amber-600 mt-1 tracking-tight">{stats.availableRooms}</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-650">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doanh thu thực nhận */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Doanh thu thực nhận (Chủ nhà)</p>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-2 truncate tabular-nums">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buildings list + Room Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sơ đồ trạng thái phòng */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <Home className="h-4.5 w-4.5 text-ink-muted" />
                Sơ đồ trạng thái phòng
              </CardTitle>
              {/* Legend */}
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
                                <div key={floor} className="flex items-start gap-4">
                                  <div className="w-14 text-[11px] font-bold text-ink-muted pt-2.5 flex-shrink-0 uppercase tracking-wide">
                                    Tầng {floor}
                                  </div>
                                  <div className="flex flex-wrap gap-2 flex-1">
                                    {floorRooms.map((room) => (
                                      <button
                                        key={room.id}
                                        onClick={() => handleRoomClick(room)}
                                        className={`w-16 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${roomStatusSafe(room.status).btn}`}
                                        title={`Phòng ${room.code} – ${statusLabels[room.status]}`}
                                      >
                                        <span className="text-[11px] font-mono tracking-tight leading-none">
                                          {room.code}
                                        </span>
                                        <span className="text-[9px] font-normal opacity-80 mt-0.5 leading-none tabular-nums">
                                          {(room.price / 1_000_000).toFixed(1)}M
                                        </span>
                                      </button>
                                    ))}
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

        {/* Danh sách Bất động sản lấp đầy */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-ink-muted" />
                Danh sách tòa nhà
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {stats.buildingsList.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-25" />
                  <p className="text-sm">Chưa có tòa nhà nào liên kết</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {stats.buildingsList.map((building) => {
                    const pct = building.totalRooms > 0
                      ? Math.round((building.rentedRooms / building.totalRooms) * 100)
                      : 0;
                    const barColor = pct >= 80
                      ? 'bg-emerald-600'
                      : pct >= 50
                      ? 'bg-accent'
                      : 'bg-amber-500';
                    return (
                      <div key={building.id} className="space-y-2.5 pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink text-sm truncate hover:text-accent transition-colors">
                              {building.name}
                            </p>
                            <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{building.area}</span>
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-ink tabular-nums">
                              {building.rentedRooms}/{building.totalRooms} phòng
                            </p>
                            <p className="text-xs text-accent font-bold font-mono mt-0.5 tabular-nums">
                              {formatCurrency(building.revenue)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-ink-muted">
                            <span>Lấp đầy: {pct}%</span>
                            <span>Trống: {building.totalRooms - building.rentedRooms} phòng</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vacant rooms list for Renting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Phòng trống cần cho thuê */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                Phòng trống cần cho thuê ({vacantRooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4">
              {vacantRooms.length === 0 ? (
                <div className="text-center py-8 text-ink-muted text-sm">
                  Tuyệt vời! Toàn bộ phòng thuộc tòa nhà của bạn đã được thuê hết.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[300px] overflow-y-auto pr-1">
                  {vacantRooms.map((room: any) => {
                    const bld = stats.buildingsList.find(b => b.code === room.building_id);
                    return (
                      <div key={room.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink text-sm">Phòng {room.code} (Tầng {room.floor})</p>
                          <p className="text-xs text-ink-muted truncate mt-0.5">
                            {bld?.name || 'Tòa nhà'} · {room.bedrooms} PN, {room.bathrooms} WC
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold font-mono text-accent tabular-nums">
                            {formatCurrency(room.price)}
                          </span>
                          <Link href={`/customer/properties/${bld?.id || room.building_id}`} target="_blank">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                              Xem trang khách
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lịch hẹn xem phòng */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-ink-muted" />
                Lịch hẹn xem phòng sắp tới
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4">
              {stats.recentAppointments.length === 0 ? (
                <div className="text-center py-8 text-ink-muted text-sm">
                  Chưa có lịch hẹn nào của khách hàng xem phòng của bạn.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.recentAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{apt.customer_name}</p>
                        <p className="text-xs text-ink-muted truncate max-w-[200px] mt-0.5">{apt.room_title}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-3">
                        <p className="text-xs font-mono text-ink tabular-nums">{apt.date} {apt.time}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${apptStatusStyle[apt.status] ?? 'bg-bg-subtle text-ink-muted border-border'}`}
                        >
                          {apptStatusLabels[apt.status] ?? apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lịch sử hóa đơn thanh toán */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-ink-muted" />
            Lịch sử hóa đơn &amp; Thanh toán phòng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!stats.recentInvoices || stats.recentInvoices.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm px-5">
              Chưa ghi nhận hóa đơn thanh toán nào phát sinh.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-subtle text-ink-muted font-bold uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Mã Hóa đơn</th>
                    <th className="px-5 py-3">Phòng</th>
                    <th className="px-5 py-3">Kỳ đóng phí</th>
                    <th className="px-5 py-3 text-right">Tổng tiền</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Ngày thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {stats.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-bg-subtle/55 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-ink-muted">{inv.invoice_code}</td>
                      <td className="px-5 py-3 font-semibold">Phòng {inv.rooms?.code || '—'}</td>
                      <td className="px-5 py-3 font-mono">{inv.period}</td>
                      <td className="px-5 py-3 font-mono font-bold text-accent text-right tabular-nums">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          inv.status === 'paid'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : inv.status === 'unpaid'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {inv.status === 'paid' ? 'Đã thu' : inv.status === 'unpaid' ? 'Chưa thu' : 'Quá hạn'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-ink-muted tabular-nums">
                        {inv.payment_date ? new Date(inv.payment_date).toLocaleDateString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Details Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-md border border-border shadow-xl rounded-2xl bg-white">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center justify-between text-ink font-bold font-heading">
              <span>Phòng {selectedRoom?.code}</span>
              {selectedRoom && (
                <span
                  className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${roomStatusSafe(selectedRoom.status).btn}`}
                >
                  {statusLabels[selectedRoom.status] || selectedRoom.status}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-5 pt-3 text-sm text-ink">
              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 bg-bg-subtle p-4 rounded-xl border border-border">
                {[
                  { label: 'Giá thuê', value: formatCurrency(selectedRoom.price), mono: true },
                  { label: 'Thiết kế', value: `${selectedRoom.bedrooms} PN, ${selectedRoom.bathrooms} WC` },
                  { label: 'Số người tối đa', value: `${selectedRoom.max_occupants} người` },
                  { label: 'Số xe tối đa', value: `${selectedRoom.max_vehicles_per_room} xe/phòng` },
                  { label: 'Ban công riêng', value: selectedRoom.has_private_balcony ? 'Có ban công' : 'Không' },
                  { label: 'HĐ tối thiểu', value: `${selectedRoom.min_contract_months} tháng` },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider block mb-0.5">
                      {label}
                    </span>
                    <span className={`font-semibold text-ink ${mono ? 'font-mono text-accent' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rented Contract Info */}
              {selectedRoom.status === 'rented' && selectedRoom.contract ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="font-bold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-[hsl(142,52%,42%)]" />
                    Khách thuê &amp; hợp đồng
                  </h4>
                  <div className="space-y-2 p-4 border border-border rounded-xl bg-[hsl(142,60%,97%)]">
                    {[
                      { icon: <User className="h-3.5 w-3.5" />, label: 'Khách thuê', value: selectedRoom.contract.party_b_name, bold: true },
                      selectedRoom.contract.party_b_phone && { icon: <Phone className="h-3.5 w-3.5" />, label: 'Số điện thoại', value: selectedRoom.contract.party_b_phone },
                      { icon: <FileText className="h-3.5 w-3.5" />, label: 'Số hợp đồng', value: selectedRoom.contract.contract_code, mono: true },
                      { icon: <Clock className="h-3.5 w-3.5" />, label: 'Thời hạn', value: `${new Date(selectedRoom.contract.start_date).toLocaleDateString('vi-VN')} – ${new Date(selectedRoom.contract.end_date).toLocaleDateString('vi-VN')}` },
                    ].filter(Boolean).map((row: any) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-ink-muted text-xs flex items-center gap-1">
                          {row.icon} {row.label}:
                        </span>
                        <span className={`text-ink ${row.bold ? 'font-bold' : 'font-medium'} ${row.mono ? 'font-mono text-ink-muted' : ''}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-[hsl(142,45%,84%)] flex items-center justify-between text-xs">
                      <span className="text-[hsl(142,52%,32%)] font-medium">Thời gian còn lại:</span>
                      <span className="font-mono font-bold text-[hsl(142,52%,32%)] tabular-nums">
                        {getDaysRemaining(selectedRoom.contract.end_date)} ngày
                      </span>
                    </div>
                  </div>
                </div>
              ) : selectedRoom.status === 'rented' ? (
                <div className="flex items-center gap-2 p-3 bg-[hsl(38,90%,96%)] border border-[hsl(38,72%,76%)] rounded-xl text-[hsl(38,72%,30%)] text-xs font-semibold">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <span>Phòng được đánh dấu &quot;Đã thuê&quot; nhưng hệ thống chưa có hợp đồng thuê hoạt động.</span>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
