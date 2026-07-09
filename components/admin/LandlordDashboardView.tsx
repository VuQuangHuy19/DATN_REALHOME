'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, Home, DollarSign, CalendarDays, Users, TrendingUp,
  Percent, FileText, CheckCircle, ShieldAlert, Clock, User, Phone, MapPin, Eye,
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

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100',
  rented: 'bg-red-500 hover:bg-red-600 text-white shadow-red-100',
  maintenance: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100',
  reserved: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-100',
};

const statusLabels: Record<string, string> = {
  available: 'Còn trống',
  rented: 'Đã thuê',
  maintenance: 'Bảo trì',
  reserved: 'Đang giữ',
};

const appointmentStatusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const appointmentStatusLabels: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  pending: 'Chờ duyệt',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export function LandlordDashboardView({ stats }: LandlordDashboardProps) {
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleRoomClick = (room: any) => {
    // Find active contract for this room if rented
    const contract = stats.contractsList.find((c) => c.room_id === room.id);
    setSelectedRoom({ ...room, contract });
    setIsRoomDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Tổng quan vận hành</h1>
          <p className="text-slate-500 mt-1">Hệ thống báo cáo và quản lý trực quan dành cho Chủ nhà</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-800 text-sm font-semibold shadow-sm">
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium px-2 py-0.5 rounded-md">Vai trò</Badge>
          <span>Chủ nhà</span>
        </div>
      </div>

      {/* Stats Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rooms */}
        <Card className="border-slate-100 shadow-sm bg-white/70 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng số phòng</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{stats.totalRooms}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Phân bố tại {stats.totalBuildings} BĐS</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <Home className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card className="border-slate-100 shadow-sm bg-white/70 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ lệ lấp đầy</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{stats.occupancyRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs text-slate-500 font-medium">{stats.rentedRooms} phòng đã thuê</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                <Percent className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="border-slate-100 shadow-sm bg-white/70 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doanh thu tháng này</p>
                <p className="text-2xl font-black text-slate-800 mt-2 truncate max-w-[180px]">
                  {formatCurrency(stats.monthlyRevenue)}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">Từ các hóa đơn đã thanh toán</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 shadow-inner">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Contracts */}
        <Card className="border-slate-100 shadow-sm bg-white/70 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hợp đồng hiệu lực</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{stats.activeContractsCount}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Đang mang lại thu nhập</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Buildings List (Occupancy & Revenue) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-500" />
                Danh sách Bất động sản
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {stats.buildingsList.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có tòa nhà nào liên kết</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {stats.buildingsList.map((building) => {
                    const pct = building.totalRooms > 0 ? Math.round((building.rentedRooms / building.totalRooms) * 100) : 0;
                    return (
                      <div key={building.id} className="space-y-2.5 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm hover:underline hover:text-blue-600 transition-colors">
                              <Link href={`/admin/realhome/buildings`}>{building.name}</Link>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {building.area}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-slate-700">{building.rentedRooms}/{building.totalRooms} phòng đã thuê</p>
                            <p className="text-xs text-emerald-600 font-bold mt-0.5">{formatCurrency(building.revenue)}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
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

        {/* Right Section: Visual Room Status Grid grouped by Building */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Home className="h-5 w-5 text-slate-500" />
                Sơ đồ trạng thái phòng
              </CardTitle>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded ${statusColors[status].split(' ')[0]}`} />
                    <span className="text-slate-500 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {stats.buildingsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">Chưa có dữ liệu phòng để hiển thị sơ đồ</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {stats.buildingsList.map((building) => {
                    const buildingRooms = stats.roomsList.filter((r) => r.building_id === building.id);
                    // Group rooms by Floor
                    const floors = Array.from(new Set(buildingRooms.map((r) => r.floor))).sort((a, b) => b - a);

                    return (
                      <div key={building.id} className="space-y-4">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            {building.name} ({buildingRooms.length} phòng)
                          </h3>
                        </div>

                        {buildingRooms.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2 italic">Tòa nhà này chưa được lập phòng nào.</p>
                        ) : (
                          <div className="space-y-3">
                            {floors.map((floor) => {
                              const floorRooms = buildingRooms
                                .filter((r) => r.floor === floor)
                                .sort((a, b) => a.code.localeCompare(b.code));
                              return (
                                <div key={floor} className="flex items-start gap-4">
                                  <div className="w-14 text-xs font-bold text-slate-400 pt-2 flex-shrink-0">
                                    Tầng {floor}
                                  </div>
                                  <div className="flex flex-wrap gap-2.5 flex-1">
                                    {floorRooms.map((room) => (
                                      <button
                                        key={room.id}
                                        onClick={() => handleRoomClick(room)}
                                        className={`w-16 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                          statusColors[room.status] || 'bg-slate-200'
                                        }`}
                                        title={`Phòng ${room.code} - ${statusLabels[room.status]}`}
                                      >
                                        <span className="text-[11px] font-mono tracking-tight">{room.code}</span>
                                        <span className="text-[9px] font-normal opacity-90 mt-0.5 leading-none">
                                          {formatCurrency(room.price / 1000000).replace(' ₫', '')}M
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

      {/* Bottom Grid for Secondary Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appointments List */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-slate-500" />
                Lịch xem phòng sắp tới
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentAppointments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Chưa có lịch hẹn nào của khách hàng</div>
              ) : (
                <div className="space-y-4 divide-y divide-slate-50">
                  {stats.recentAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between pt-3 first:pt-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{apt.customer_name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{apt.room_title}</p>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <p className="text-xs font-semibold text-slate-700">{apt.date} {apt.time}</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 border font-medium px-2 py-0.5 rounded text-[10px] ${
                            appointmentStatusColors[apt.status] ?? 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {appointmentStatusLabels[apt.status] ?? apt.status}
                        </Badge>
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
          <Card className="border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-slate-500" />
                Hợp đồng đang hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.contractsList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Hiện chưa có hợp đồng thuê nào đang hoạt động</div>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Mã HĐ</th>
                        <th className="px-4 py-3">Khách thuê</th>
                        <th className="px-4 py-3">Giá thuê</th>
                        <th className="px-4 py-3">Thời hạn</th>
                        <th className="px-4 py-3 text-right">Còn lại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {stats.contractsList.slice(0, 5).map((contract) => {
                        const daysLeft = getDaysRemaining(contract.end_date);
                        return (
                          <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3.5 font-mono font-bold text-slate-500">{contract.contract_code}</td>
                            <td className="px-4 py-3.5 font-medium">{contract.party_b_name}</td>
                            <td className="px-4 py-3.5 font-bold text-slate-800">{formatCurrency(contract.rent_price)}</td>
                            <td className="px-4 py-3.5 text-slate-400">
                              {new Date(contract.start_date).toLocaleDateString('vi-VN')} - {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold">
                              {daysLeft === 0 ? (
                                <Badge variant="destructive" className="px-2 py-0.5 rounded text-[10px]">Hết hạn</Badge>
                              ) : (
                                <span className={daysLeft <= 30 ? 'text-rose-500' : 'text-slate-600'}>
                                  {daysLeft} ngày
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

      {/* Room Details Dialog (Click on Room to view details) */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-md border-0 shadow-lg rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center justify-between">
              <span>Phòng {selectedRoom?.code}</span>
              <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold ${
                statusColors[selectedRoom?.status]?.split(' ')[0] || 'bg-slate-200'
              } text-white`}>
                {statusLabels[selectedRoom?.status] || selectedRoom?.status}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-5 pt-3 text-sm text-slate-600">
              {/* Properties Specs Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Giá thuê</span>
                  <span className="font-extrabold text-slate-800 text-base">{formatCurrency(selectedRoom.price)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Thiết kế</span>
                  <span className="font-semibold text-slate-700">{selectedRoom.bedrooms} PN, {selectedRoom.bathrooms} WC</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Số người tối đa</span>
                  <span className="font-semibold text-slate-700">{selectedRoom.max_occupants} người</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Số xe tối đa</span>
                  <span className="font-semibold text-slate-700">{selectedRoom.max_vehicles_per_room} xe/phòng</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Ban công riêng</span>
                  <span className="font-semibold text-slate-700">{selectedRoom.has_private_balcony ? 'Có ban công' : 'Không'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Hợp đồng tối thiểu</span>
                  <span className="font-semibold text-slate-700">{selectedRoom.min_contract_months} tháng</span>
                </div>
              </div>

              {/* Rented Contract Information */}
              {selectedRoom.status === 'rented' && selectedRoom.contract ? (
                <div className="space-y-3.5 border-t pt-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Thông tin khách thuê & hợp đồng
                  </h4>
                  <div className="space-y-2 p-4 border border-slate-100 rounded-2xl text-slate-600 bg-emerald-50/20">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs flex items-center gap-1"><User className="h-3.5 w-3.5" /> Khách thuê:</span>
                      <span className="font-bold text-slate-800">{selectedRoom.contract.party_b_name}</span>
                    </div>
                    {selectedRoom.contract.party_b_phone && (
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-slate-400 text-xs flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Số điện thoại:</span>
                        <span className="font-semibold text-slate-700">{selectedRoom.contract.party_b_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-slate-400 text-xs flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Số hợp đồng:</span>
                      <span className="font-mono font-bold text-slate-500">{selectedRoom.contract.contract_code}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Thời hạn:</span>
                      <span className="font-medium text-slate-700">
                        {new Date(selectedRoom.contract.start_date).toLocaleDateString('vi-VN')} - {new Date(selectedRoom.contract.end_date).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-medium">Thời gian còn lại:</span>
                      <Badge className="bg-emerald-600 text-white border-0 font-bold px-2 py-0.5 rounded-md">
                        {getDaysRemaining(selectedRoom.contract.end_date)} ngày
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : selectedRoom.status === 'rented' ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <span>Phòng đã đánh dấu là &quot;Đã thuê&quot; nhưng hệ thống chưa liên kết hợp đồng thuê active.</span>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
