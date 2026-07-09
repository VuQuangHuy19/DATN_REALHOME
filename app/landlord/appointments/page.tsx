'use client';

import { useState } from 'react';
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
  User, Phone, Building, Briefcase, CalendarClock, MessageSquare
} from 'lucide-react';
import { useAppointments } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import type { AppointmentWithRelations } from '@/lib/supabase/repositories/appointments';

const statusColors: Record<string, string> = {
  Confirm: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  Dealed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Cancel: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  Pending: 'Chờ duyệt',
  Confirm: 'Xác nhận',
  Viewed: 'Đã xem phòng',
  Dealed: 'Đã chốt thành công',
  Cancel: 'Đã hủy',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

function buildShareText(item: AppointmentWithRelations): string {
  const date = new Date(item.date).toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const status = statusLabels[item.status] || item.status;
  
  let bookingPartyText = '';
  if (item.assigned_to) {
    bookingPartyText = `Sale phụ trách: ${item.sale_name || '—'} (${item.sale_phone || '—'})`;
  } else {
    bookingPartyText = `Đơn vị giới thiệu: ${item.company_name || '—'} (${item.company_phone || '—'})`;
  }

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

export default function LandlordAppointmentsPage() {
  const { company } = useAuth();
  const { items: aptList, loading, error, update } = useAppointments(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('all'); // 'all', 'sale', 'customer'

  const [viewItem, setViewItem] = useState<AppointmentWithRelations | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filtered = aptList.filter((a) => {
    const matchesSearch = a.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.customer_phone ?? '').includes(searchQuery) ||
      (a.room_title ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !filterDate || a.date === filterDate;
    const matchesStatus = !filterStatus || a.status === filterStatus;
    
    let matchesSource = true;
    if (filterSource === 'sale') {
      matchesSource = !!a.assigned_to;
    } else if (filterSource === 'customer') {
      matchesSource = !a.assigned_to;
    }
    
    return matchesSearch && matchesDate && matchesStatus && matchesSource;
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

  const handleStatusChange = async (id: string, status: AppointmentWithRelations['status']) => {
    try {
      await update(id, { status });
      toast.success(`Đã cập nhật trạng thái lịch hẹn thành: ${statusLabels[status]}`);
      if (viewItem?.id === id) {
        setViewItem(prev => prev ? { ...prev, status } : null);
      }
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái lịch hẹn');
    }
  };

  const handleShare = (item: AppointmentWithRelations) => {
    const text = buildShareText(item);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Đã copy thông tin lịch hẹn!', {
        description: 'Bạn có thể gửi thông tin này qua Zalo.',
        duration: 3000,
      });
    }).catch(() => {
      toast.error('Trình duyệt không hỗ trợ copy tự động');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Lịch hẹn xem phòng</h1>
          <p className="text-slate-500">Xem và xác nhận lịch hẹn của Sale hoặc Khách hàng trực tiếp gửi đến các tòa nhà của bạn</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Bộ lọc */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500">Tìm kiếm</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tên khách, SĐT, căn hộ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500">Ngày hẹn</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500">Nguồn đặt lịch</Label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
            >
              <option value="all">Tất cả nguồn đặt</option>
              <option value="sale">Đặt bởi Sale (Nhân viên)</option>
              <option value="customer">Đặt bởi Khách (Trực tiếp từ Web)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500">Trạng thái</Label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ duyệt</option>
              <option value="Confirm">Xác nhận</option>
              <option value="Viewed">Đã xem phòng</option>
              <option value="Dealed">Đã chốt thành công</option>
              <option value="Cancel">Đã hủy</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Khách hàng</th>
                    <th className="px-6 py-3.5 text-left">Bất động sản</th>
                    <th className="px-6 py-3.5 text-left">Thời gian</th>
                    <th className="px-6 py-3.5 text-left">Người đặt lịch</th>
                    <th className="px-6 py-3.5 text-left">Trạng thái</th>
                    <th className="px-6 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 bg-white">
                  {sortedAndFiltered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => { setViewItem(item); setIsViewOpen(true); }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{item.customer_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-emerald-700">{item.room_title ?? '—'}</div>
                        <div className="text-xs text-slate-450 truncate max-w-[200px]" title={item.building_address || ''}>
                          {item.building_address || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-750 flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-slate-450" /> {formatDate(item.date)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Giờ xem: {item.time}</div>
                      </td>
                      <td className="px-6 py-4">
                        {item.assigned_to ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" variant="outline">
                              <Briefcase className="h-3 w-3 mr-1" /> Sale đặt lịch
                            </Badge>
                            <div className="text-xs font-semibold text-slate-800">{item.sale_name}</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50" variant="outline">
                              <User className="h-3 w-3 mr-1" /> Khách đặt trực tiếp
                            </Badge>
                            <div className="text-xs font-semibold text-slate-800">{item.company_name || 'Hệ thống'}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[item.status] || 'bg-slate-100 text-slate-700'}`}>
                            {statusLabels[item.status] || item.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-650 hover:text-indigo-800 hover:bg-slate-100"
                            onClick={() => { setViewItem(item); setIsViewOpen(true); }}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-slate-100"
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
                <div className="text-center py-16 text-slate-400 bg-white">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-35" />
                  <p className="text-sm font-semibold text-slate-500">Không tìm thấy lịch hẹn nào</p>
                  <p className="text-xs text-slate-400 mt-1">Các yêu cầu đặt lịch hẹn của Sale hoặc Khách sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hộp thoại chi tiết */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 font-bold">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              Thông tin chi tiết lịch hẹn
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-5 pt-3">
              {/* Box thông tin lịch hẹn */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 border border-slate-200 rounded-lg">
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs block uppercase font-semibold">Khách hàng</span>
                  <div className="font-bold text-slate-850 text-base">{viewItem.customer_name}</div>
                  <div className="text-slate-600 font-medium flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" /> {viewItem.customer_phone || '—'}</div>
                  {viewItem.customer_email && <div className="text-slate-500 text-xs">{viewItem.customer_email}</div>}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-xs block uppercase font-semibold">Căn hộ / Phòng</span>
                  <div className="font-bold text-emerald-700 text-base">{viewItem.room_title || '—'}</div>
                  <div className="text-slate-600 font-medium flex items-center gap-1"><Building className="h-3.5 w-3.5 text-slate-400" /> {viewItem.building_address || '—'}</div>
                </div>

                <div className="border-t border-slate-200 pt-3 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 text-xs block uppercase font-semibold">Ngày hẹn xem</span>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">{formatDate(viewItem.date)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block uppercase font-semibold">Giờ hẹn xem</span>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">{viewItem.time}</div>
                  </div>
                </div>
              </div>

              {/* Box thông tin người đặt lịch (Sale vs Khách hàng) */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-3">
                <span className="text-slate-500 text-xs block uppercase font-bold tracking-wide">Người đặt lịch hẹn</span>
                {viewItem.assigned_to ? (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {viewItem.sale_name}
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]" variant="outline">Nhân viên môi giới (Sale)</Badge>
                      </div>
                      {viewItem.sale_phone && (
                        <div className="text-sm text-slate-650 flex items-center gap-1.5 font-medium">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {viewItem.sale_phone}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {viewItem.company_name || 'Hệ thống website'}
                        <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]" variant="outline">Khách hàng đặt trực tiếp</Badge>
                      </div>
                      {viewItem.company_phone && (
                        <div className="text-sm text-slate-650 flex items-center gap-1.5 font-medium">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {viewItem.company_phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-2">
                <span className="text-slate-500 text-xs block uppercase font-bold tracking-wide flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-slate-400" /> Ghi chú lịch hẹn
                </span>
                <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">
                  {viewItem.notes || 'Không có ghi chú thêm.'}
                </p>
              </div>

              {/* Hành động cập nhật nhanh trạng thái */}
              <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs font-semibold uppercase">Trạng thái:</span>
                  <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold border ${statusColors[viewItem.status] || 'bg-slate-100 text-slate-700'}`}>
                    {statusLabels[viewItem.status] || viewItem.status}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {(['Pending', 'Confirm', 'Viewed', 'Cancel'] as const)
                    .filter((s) => s !== viewItem.status)
                    .map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(viewItem.id, s)}
                        className="text-xs hover:bg-slate-100"
                      >
                        Xác nhận {statusLabels[s]}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
