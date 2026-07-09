'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProfiles } from '@/lib/supabase/repositories/profiles';
import { toast } from 'sonner';
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
import { Eye, Search, CalendarDays, Loader2, AlertCircle, Pencil, Share2, Trash2, CheckCircle2 } from 'lucide-react';
import { useAppointments } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBAppointment } from '@/lib/supabase/types';

const STATUS_LIST = ['Pending', 'Confirm', 'Viewed', 'Dealed', 'Cancel'] as const;
type AppStatus = typeof STATUS_LIST[number];

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

function buildShareText(item: DBAppointment): string {
  const date = new Date(item.date).toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const status = statusLabels[item.status] || item.status;

  return [
    '📋 THÔNG TIN LỊCH HẸN XEM PHÒNG',
    '─────────────────────────',
    `👤 Khách hàng : ${item.customer_name}`,
    `📞 Số điện thoại: ${item.customer_phone ?? '—'}`,
    item.customer_email ? `📧 Email        : ${item.customer_email}` : null,
    `🔑 Mã chủ nhà  : ${item.landlord_code ?? '—'}`,
    `🏠 Bất động sản: ${item.room_title ?? '—'}`,
    item.area ? `📍 Khu vực      : ${item.area}` : null,
    `📅 Ngày xem    : ${date}`,
    `⏰ Giờ xem     : ${item.time}`,
    `🔖 Trạng thái  : ${status}`,
    item.notes ? `📝 Ghi chú      : ${item.notes}` : null,
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

export default function CustomersAppointmentsPage() {
  const { company, role, user } = useAuth();
  const { items: aptList, loading, error, update } = useAppointments(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (company?.id) {
      getProfiles(company.id).then(setProfiles).catch(console.error);
    }
  }, [company?.id]);

  const isSale = role === 'sales_agent';

  const visibleAppointments = useMemo(() => {
    if (isSale && user?.id) {
      return aptList.filter((a) => a.assigned_to === user.id || a.created_by === user.id);
    }
    return aptList;
  }, [aptList, isSale, user?.id]);

  const assignableProfiles = useMemo(() => {
    return profiles.filter((p) => p.role !== 'landlord');
  }, [profiles]);

  const getAssigneeName = (assignedToId: string | null) => {
    if (!assignedToId) return 'Chưa phân công';
    const prof = profiles.find((p) => p.id === assignedToId);
    return prof?.full_name || prof?.email || 'Chưa phân công';
  };

  const handleAssigneeChange = async (id: string, assignedToId: string) => {
    const prof = profiles.find(p => p.id === assignedToId);
    const assignedToName = prof?.full_name || prof?.email || null;
    await update(id, {
      assigned_to: assignedToId || null,
      assigned_to_name: assignedToName,
    });
    if (viewItem && viewItem.id === id) {
      setViewItem({
        ...viewItem,
        assigned_to: assignedToId || null,
        assigned_to_name: assignedToName,
      });
    }
    toast.success('Đã cập nhật nhân viên phụ trách');
  };

  // View detail dialog
  const [viewItem, setViewItem] = useState<DBAppointment | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Quick edit status dialog
  const [editItem, setEditItem] = useState<DBAppointment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUpdating, setEditUpdating] = useState(false);

  const filtered = visibleAppointments.filter((a) => {
    const matchesSearch = a.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.customer_phone ?? '').includes(searchQuery);
    const matchesDate = !filterDate || a.date === filterDate;
    const matchesStatus = !filterStatus || a.status === filterStatus;
    return matchesSearch && matchesDate && matchesStatus;
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
      // Cả hai đều sắp diễn ra: ngày gần nhất lên trước (tăng dần)
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    } else {
      // Cả hai đều đã qua: ngày gần nhất ở quá khứ lên trước (giảm dần)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    }
  });

  const openView = (item: DBAppointment) => { setViewItem(item); setIsViewOpen(true); };
  const openEdit = (item: DBAppointment) => { setEditItem(item); setIsEditOpen(true); };

  const handleStatusChange = async (id: string, status: DBAppointment['status']) => {
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Lịch hẹn</h1>
        <p className="text-slate-500">Quản lý yêu cầu đặt lịch và lịch hẹn khách hàng</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {isSale && (
        <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg flex items-center gap-1.5 border border-indigo-100">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-indigo-500" /> Chỉ hiển thị Lịch hẹn được phân công cho bạn hoặc do bạn tạo
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm theo tên khách hàng hoặc SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44" />
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Khách hàng</th>
                    <th className="px-6 py-3.5 text-left">Mã chủ nhà</th>
                    <th className="px-6 py-3.5 text-left">Bất động sản</th>
                    <th className="px-6 py-3.5 text-left">Ngày</th>
                    <th className="px-6 py-3.5 text-left">Giờ</th>
                    <th className="px-6 py-3.5 text-left">Khu vực</th>
                    <th className="px-6 py-3.5 text-left">Sale phụ trách</th>
                    <th className="px-6 py-3.5 text-left">Trạng thái</th>
                    <th className="px-6 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {sortedAndFiltered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => openView(item)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{item.customer_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        {item.landlord_code ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-50 border border-amber-200 text-amber-700">
                            {item.landlord_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">{item.landlord_name ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{item.room_title ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-650">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 text-slate-600">{item.time}</td>
                      <td className="px-6 py-4">
                        {item.area ? <Badge variant="outline">{item.area}</Badge> : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-650 bg-slate-100 px-2.5 py-1 rounded-full border">
                          {getAssigneeName(item.assigned_to)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[item.status] || 'bg-slate-100 text-slate-700'}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-slate-100"
                            onClick={() => openView(item)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                            onClick={() => openEdit(item)}
                            title="Chỉnh sửa trạng thái"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-slate-100"
                            onClick={() => handleShare(item)}
                            title="Copy thông tin gửi chủ nhà"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-slate-100"
                            onClick={() => handleStatusChange(item.id, 'Cancel')}
                            title="Hủy lịch hẹn"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-white">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-35" />
                  Không tìm thấy lịch hẹn nào
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              Chi tiết lịch hẹn
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 border border-slate-200 rounded-lg">
                <div><span className="text-slate-500">Khách hàng:</span> <span className="font-semibold text-slate-800">{viewItem.customer_name}</span></div>
                <div><span className="text-slate-500">SĐT:</span> <span className="font-medium">{viewItem.customer_phone}</span></div>
                <div><span className="text-slate-500">Email:</span> {viewItem.customer_email || '—'}</div>
                <div><span className="text-slate-500">BĐS:</span> <span className="font-semibold text-indigo-600">{viewItem.room_title || '—'}</span></div>
                <div><span className="text-slate-500">Ngày:</span> {formatDate(viewItem.date)}</div>
                <div><span className="text-slate-500">Giờ:</span> {viewItem.time}</div>
                <div><span className="text-slate-500">Khu vực:</span> {viewItem.area ? <Badge variant="outline">{viewItem.area}</Badge> : '—'}</div>
                <div>
                  <span className="text-slate-500">Trạng thái:</span>{' '}
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[viewItem.status] || 'bg-slate-100 text-slate-700'}`}>
                    {statusLabels[viewItem.status] || viewItem.status}
                  </span>
                </div>
              </div>
              <div className="text-sm border rounded-lg p-3 bg-white">
                <span className="text-slate-500 block mb-1 font-semibold">Ghi chú:</span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{viewItem.notes || 'Không có ghi chú thêm.'}</p>
              </div>

              {!isSale ? (
                <div className="space-y-1.5 border rounded-lg p-3 bg-white">
                  <Label className="text-xs font-semibold text-slate-500">Phân công Sale phụ trách</Label>
                  <select
                    value={viewItem.assigned_to || ''}
                    onChange={(e) => handleAssigneeChange(viewItem.id, e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {assignableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-sm border rounded-lg p-3 bg-slate-50">
                  <span className="text-slate-500 block mb-1 font-semibold">Sale phụ trách:</span>
                  <p className="font-semibold text-slate-850">{getAssigneeName(viewItem.assigned_to)}</p>
                </div>
              )}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold text-slate-500">Cập nhật trạng thái lịch hẹn</Label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_LIST.filter((s) => s !== viewItem.status).map((s) => (
                    <Button
                      key={s} variant="outline" size="sm"
                      onClick={() => { handleStatusChange(viewItem.id, s); setIsViewOpen(false); }}
                      className="text-xs"
                    >
                      {statusLabels[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Edit Status Dialog */}
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
                          <span className={`inline-block w-2.5 h-2.5 rounded-full border ${statusColors[s]?.replace('text-', 'border-').split(' ')[0] || ''} ${statusColors[s]?.split(' ')[0] || 'bg-slate-200'}`} />
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
