'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, Home, DollarSign, CalendarDays, Percent, FileText,
  CheckCircle, ShieldAlert, Clock, User, Phone, MapPin,
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

/* ─── Appointment Status ─────────────────────────────────────────── */
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

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Tổng quan vận hành
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Hệ thống báo cáo và quản lý trực quan dành cho Chủ nhà
          </p>
        </div>
        <div className="flex items-center gap-2 bg-accent-soft border border-accent/20 px-4 py-2 rounded-xl text-accent text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          Vai trò Chủ nhà
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rooms */}
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[108px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tổng số phòng</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1.5 tracking-tight tabular-nums">
                {stats.totalRooms}
              </p>
              <p className="text-xs text-ink-muted mt-1 font-medium">
                Phân bố tại {stats.totalBuildings} BĐS
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted group-hover:text-ink transition-colors">
                <Home className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[108px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Tỷ lệ lấp đầy</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1.5 tracking-tight tabular-nums">
                {stats.occupancyRate}%
              </p>
              <p className="text-xs text-ink-muted mt-1 font-medium">
                {stats.rentedRooms} phòng đã thuê
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted group-hover:text-ink transition-colors">
                <Percent className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[108px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Doanh thu tháng này</p>
              <p className="text-2xl font-bold font-heading text-accent mt-1.5 tracking-tight truncate max-w-[180px] tabular-nums">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-xs text-ink-muted mt-1 font-medium">Từ các hóa đơn đã thanh toán</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-accent-soft text-accent">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Contracts */}
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[108px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Hợp đồng hiệu lực</p>
              <p className="text-3xl font-bold font-heading text-ink mt-1.5 tracking-tight tabular-nums">
                {stats.activeContractsCount}
              </p>
              <p className="text-xs text-ink-muted mt-1 font-medium">Đang mang lại thu nhập</p>
            </div>
            <div className="flex justify-end mt-2">
              <div className="p-1.5 rounded-md bg-bg-subtle text-ink-muted group-hover:text-ink transition-colors">
                <FileText className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Body: Buildings List + Room Map ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Buildings List */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <Building2 className="h-4 w-4 text-ink-muted" />
                Danh sách Bất động sản
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
                      ? 'bg-[hsl(142,52%,42%)]'
                      : pct >= 50
                      ? 'bg-accent'
                      : 'bg-[hsl(38,72%,46%)]';
                    return (
                      <div key={building.id} className="space-y-2.5 pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink text-sm truncate hover:text-accent transition-colors">
                              <Link href="/landlord/buildings">{building.name}</Link>
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

        {/* Room Status Grid */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <Home className="h-4 w-4 text-ink-muted" />
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
                    const buildingRooms = stats.roomsList.filter((r) => r.building_id === building.id);
                    const floors = Array.from(new Set(buildingRooms.map((r) => r.floor))).sort((a, b) => b - a);
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
                            Tòa nhà này chưa được lập phòng nào.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {floors.map((floor) => {
                              const floorRooms = buildingRooms
                                .filter((r) => r.floor === floor)
                                .sort((a, b) => a.code.localeCompare(b.code));
                              return (
                                <div key={floor} className="flex items-start gap-4">
                                  <div className="w-14 text-[11px] font-bold text-ink-muted pt-2.5 flex-shrink-0 uppercase tracking-wide">
                                    T.{floor}
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
      </div>

      {/* ── Bottom Grid: Appointments + Contracts ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appointments */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-ink-muted" />
                Lịch xem phòng sắp tới
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4">
              {stats.recentAppointments.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-sm">
                  Chưa có lịch hẹn nào của khách hàng
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.recentAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{apt.customer_name}</p>
                        <p className="text-xs text-ink-muted truncate max-w-[180px] mt-0.5">{apt.room_title}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-3">
                        <p className="text-xs font-mono text-ink tabular-nums">{apt.date} {apt.time}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${apptStatusStyle[apt.status] ?? 'bg-bg-subtle text-ink-muted border-border'}`}
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

        {/* Contracts Table */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-ink-muted" />
                Hợp đồng đang hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.contractsList.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-sm px-5">
                  Hiện chưa có hợp đồng thuê nào đang hoạt động
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-bg-subtle text-ink-muted font-bold uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Mã HĐ</th>
                        <th className="px-4 py-3">Khách thuê</th>
                        <th className="px-4 py-3 text-right">Giá thuê</th>
                        <th className="px-4 py-3">Thời hạn</th>
                        <th className="px-4 py-3 text-right">Còn lại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-ink">
                      {stats.contractsList.slice(0, 5).map((contract) => {
                        const daysLeft = getDaysRemaining(contract.end_date);
                        return (
                          <tr key={contract.id} className="hover:bg-bg-subtle/60 transition-colors">
                            <td className="px-4 py-3.5 font-mono font-bold text-ink-muted text-[11px]">
                              {contract.contract_code}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-ink">{contract.party_b_name}</td>
                            <td className="px-4 py-3.5 font-mono font-bold text-accent text-right tabular-nums">
                              {formatCurrency(contract.rent_price)}
                            </td>
                            <td className="px-4 py-3.5 text-ink-muted font-mono text-[11px] tabular-nums">
                              {new Date(contract.start_date).toLocaleDateString('vi-VN')}
                              {' – '}
                              {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {daysLeft === 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(4,72%,93%)] text-[hsl(4,60%,36%)] border border-[hsl(4,55%,78%)]">
                                  Hết hạn
                                </span>
                              ) : (
                                <span className={`font-mono font-semibold tabular-nums ${daysLeft <= 30 ? 'text-[hsl(4,60%,45%)]' : 'text-ink'}`}>
                                  {daysLeft}d
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Room Details Dialog ──────────────────────────────────────── */}
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
                  <span>Phòng đánh dấu "Đã thuê" nhưng hệ thống chưa liên kết hợp đồng thuê active.</span>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
