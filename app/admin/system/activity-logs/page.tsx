'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Search,
  ClipboardList,
  Eye,
  Loader2,
  Activity,
  PlusCircle,
  Edit3,
  Trash2,
  LogIn,
  LogOut,
  User,
  ShieldAlert,
  Globe,
  Clock,
  Filter,
} from 'lucide-react';
import { useActivityLogs } from '@/src/lib/hooks/useNotifications';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBActivityLog } from '@/lib/supabase/types';
import Pagination from '@/components/Pagination';

const actionConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  CREATE: { label: 'Tạo mới', icon: PlusCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  UPDATE: { label: 'Cập nhật', icon: Edit3, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  DELETE: { label: 'Xóa dữ liệu', icon: Trash2, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  LOGIN: { label: 'Đăng nhập', icon: LogIn, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  LOGOUT: { label: 'Đăng xuất', icon: LogOut, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const entityLabels: Record<string, string> = {
  building: 'Tòa nhà',
  room: 'Phòng',
  lead: 'Khách hàng CRM',
  appointment: 'Lịch hẹn xem phòng',
  contract: 'Hợp đồng thuê',
  deposit_contract: 'Hợp đồng đặt cọc',
  invoice: 'Hóa đơn thanh toán',
  service: 'Chỉ số dịch vụ',
  user: 'Tài khoản người dùng',
  employee: 'Hồ sơ nhân viên',
  kyc: 'Định danh KYC',
  role: 'Vai trò & Phân quyền',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ActivityLogsPage() {
  const { company } = useAuth();
  const { logs, loading } = useActivityLogs(company?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [viewItem, setViewItem] = useState<DBActivityLog | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.entity) set.add(log.entity);
    });
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const userName = (log.user_name || '').toLowerCase();
      const entity = (log.entity || '').toLowerCase();
      const entityLabel = (log.entity_label || '').toLowerCase();
      const detail = (log.detail || '').toLowerCase();
      const ip = (log.ip_address || '').toLowerCase();
      const term = searchQuery.toLowerCase();

      const matchSearch =
        userName.includes(term) ||
        entity.includes(term) ||
        entityLabel.includes(term) ||
        detail.includes(term) ||
        ip.includes(term);

      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const matchEntity = entityFilter === 'all' || log.entity === entityFilter;

      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, searchQuery, actionFilter, entityFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Metrics
  const totalCount = logs.length;
  const createCount = useMemo(() => logs.filter((l) => l.action === 'CREATE').length, [logs]);
  const updateCount = useMemo(() => logs.filter((l) => l.action === 'UPDATE').length, [logs]);
  const deleteCount = useMemo(() => logs.filter((l) => l.action === 'DELETE').length, [logs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-accent" /> Nhật ký Hoạt động Hệ thống
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Theo dõi chi tiết lịch sử tác vụ, thay đổi dữ liệu, đăng nhập và bảo mật của toàn bộ người dùng trong hệ thống.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-ink-muted">TỔNG SỐ NHẬT KÝ</p>
              <p className="text-2xl font-extrabold text-ink mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-600">TẠO MỚI (CREATE)</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{createCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <PlusCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-blue-600">CẬP NHẬT (UPDATE)</p>
              <p className="text-2xl font-extrabold text-blue-700 mt-1">{updateCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Edit3 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-red-600">THAO TÁC XÓA (DELETE)</p>
              <p className="text-2xl font-extrabold text-red-700 mt-1">{deleteCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border border-border bg-white shadow-xs p-6 space-y-4">
        {/* Toolbar & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                placeholder="Tìm theo người dùng, đối tượng, IP, chi tiết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl h-10 border-border bg-bg-base/30 text-xs"
              />
            </div>

            {/* Dòng hiển thị tổng số nhật ký ở Toolbar Trên */}
            {filtered.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 shrink-0 font-medium shadow-2xs">
                <span>Hiển thị</span>
                <strong className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {(currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, filtered.length)}
                </strong>
                <span>trong tổng số</span>
                <strong className="font-extrabold text-indigo-700 dark:text-indigo-300">
                  {filtered.length}
                </strong>
                <span>nhật ký</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Action Segmented Filter */}
            <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActionFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  actionFilter === 'all'
                    ? 'bg-white shadow-xs text-accent'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('CREATE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  actionFilter === 'CREATE'
                    ? 'bg-white shadow-xs text-emerald-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Tạo mới
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('UPDATE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  actionFilter === 'UPDATE'
                    ? 'bg-white shadow-xs text-blue-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Cập nhật
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('DELETE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  actionFilter === 'DELETE'
                    ? 'bg-white shadow-xs text-red-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('LOGIN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  actionFilter === 'LOGIN'
                    ? 'bg-white shadow-xs text-indigo-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Đăng nhập
              </button>
            </div>

            {/* Entity Dropdown */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent shrink-0"
            >
              <option value="all">Tất cả đối tượng</option>
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {entityLabels[ent] || ent}
                </option>
              ))}
            </select>

            {/* Page Size Select */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-accent cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent shrink-0"
            >
              <option value={10}>10 dòng / trang</option>
              <option value={20}>20 dòng / trang</option>
              <option value={50}>50 dòng / trang</option>
            </select>

            {/* Pagination Controls ở Toolbar Phía Trên */}
            {filtered.length > 0 && (
              <div className="shrink-0 ml-1">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-ink-muted font-medium">Đang tải nhật ký hoạt động...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-border rounded-xl bg-bg-base/30">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-ink-muted opacity-40" />
            <p className="text-sm font-bold text-ink">Không tìm thấy nhật ký hoạt động phù hợp</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-sm border-collapse min-w-[700px]">
                <thead className="bg-bg-subtle/80 border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">
                      Thời gian thực thi
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">
                      Người thực hiện
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-ink-muted uppercase">
                      Hành động
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">
                      Đối tượng tác động
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase">
                      Nội dung chi tiết
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-ink-muted uppercase">
                      Địa chỉ IP
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-ink-muted uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {paginatedLogs.map((log) => {
                    const ac = actionConfig[log.action] || {
                      label: log.action,
                      icon: Activity,
                      color: 'text-slate-700',
                      bg: 'bg-slate-100',
                      border: 'border-slate-200',
                    };
                    const ActionIcon = ac.icon;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-accent/5 transition-all cursor-pointer group"
                        onClick={() => {
                          setViewItem(log);
                          setIsViewOpen(true);
                        }}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-ink-muted font-mono">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                            {formatDate(log.created_at)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-extrabold flex items-center justify-center shrink-0 text-xs">
                              {(log.user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-ink text-sm">
                              {log.user_name || 'Hệ thống'}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <Badge
                            variant="outline"
                            className={`font-bold text-xs gap-1 ${ac.bg} ${ac.color} ${ac.border}`}
                          >
                            <ActionIcon className="h-3 w-3" /> {ac.label}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5">
                          <p className="font-bold text-ink text-sm">{log.entity_label || '—'}</p>
                          <p className="text-[11px] text-ink-muted font-mono">
                            {entityLabels[log.entity] || log.entity}
                          </p>
                        </td>

                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="text-xs text-ink-muted line-clamp-1">{log.detail || '—'}</p>
                        </td>

                        <td className="px-5 py-3.5 text-center text-xs font-mono text-ink-muted">
                          <span className="inline-flex items-center gap-1 bg-bg-base px-2 py-0.5 rounded-md border border-border">
                            <Globe className="h-3 w-3 text-ink-muted" /> {log.ip_address || '127.0.0.1'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewItem(log);
                              setIsViewOpen(true);
                            }}
                            className="h-9 px-3 rounded-xl border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Xem chi tiết nhật ký"
                          >
                            <Eye className="h-4.5 w-4.5 shrink-0" />
                            <span>Xem</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 font-heading font-extrabold text-base text-ink">
              <ClipboardList className="h-5 w-5 text-accent" /> Chi tiết nhật ký hoạt động
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-3 text-sm text-ink">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-base border border-border">
                <div className="w-10 h-10 rounded-xl bg-accent text-white font-extrabold flex items-center justify-center text-base">
                  {(viewItem.user_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-ink">{viewItem.user_name}</h4>
                  <p className="text-xs text-ink-muted font-mono">IP: {viewItem.ip_address || '127.0.0.1'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Hành động:</span>
                  <Badge
                    variant="outline"
                    className={`font-bold text-xs ${
                      (actionConfig[viewItem.action] || {}).bg || 'bg-slate-100'
                    } ${(actionConfig[viewItem.action] || {}).color || 'text-slate-700'}`}
                  >
                    {(actionConfig[viewItem.action] || { label: viewItem.action }).label}
                  </Badge>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Phân loại đối tượng:</span>
                  <span className="font-bold text-ink">
                    {entityLabels[viewItem.entity] || viewItem.entity}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Tên nhãn đối tượng:</span>
                  <span className="font-bold text-ink">{viewItem.entity_label || '—'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-ink-muted font-medium">Mã ID đối tượng:</span>
                  <span className="font-mono text-ink text-[11px]">{viewItem.entity_id || '—'}</span>
                </div>

                <div className="py-1 border-b border-border space-y-1">
                  <span className="text-ink-muted font-medium">Nội dung chi tiết:</span>
                  <p className="p-2.5 rounded-xl bg-bg-base border border-border text-ink font-medium leading-relaxed">
                    {viewItem.detail || 'Không có mô tả chi tiết'}
                  </p>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-ink-muted font-medium">Thời gian tạo:</span>
                  <span className="font-mono text-ink">{formatDate(viewItem.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
