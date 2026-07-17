'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ClipboardList, Eye, Loader2 } from 'lucide-react';
import { useActivityLogs } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBActivityLog } from '@/lib/supabase/types';

const actionConfig: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Tạo mới',    color: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Cập nhật',   color: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Xóa',        color: 'bg-red-100 text-red-700' },
  LOGIN:  { label: 'Đăng nhập',  color: 'bg-bg-subtle text-ink' },
  LOGOUT: { label: 'Đăng xuất',  color: 'bg-bg-subtle text-ink-muted' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ActivityLogsPage() {
  const { company } = useAuth();
  const { logs, loading } = useActivityLogs(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [viewItem, setViewItem] = useState<DBActivityLog | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.detail ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Nhật ký hoạt động</h1>
        <p className="text-ink-muted">Theo dõi toàn bộ hành động của người dùng trong hệ thống</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${actionFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-bg-subtle text-ink-muted hover:bg-border-subtle'}`}
          >
            Tất cả
          </button>
          {Object.keys(actionConfig).map((action) => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${actionFilter === action ? 'bg-slate-800 text-white' : 'bg-bg-subtle text-ink-muted hover:bg-border-subtle'}`}
            >
              {actionConfig[action].label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            placeholder="Tìm người dùng, đối tượng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table min-w-[700px]">
                <thead className="bg-bg-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Thời gian</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Người dùng</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Hành động</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Đối tượng</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Nội dung</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">IP</th>
                    <th className="px-4 py-3 text-right font-medium text-ink-muted">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((log) => {
                    const ac = actionConfig[log.action] || { label: log.action, color: 'bg-bg-subtle text-ink-muted' };
                    return (
                      <tr key={log.id} className="hover:bg-bg-subtle dark:hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all cursor-pointer" onClick={() => { setViewItem(log); setIsViewOpen(true); }}>
                        <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{formatDate(log.created_at)}</td>
                        <td className="px-4 py-3 font-medium text-ink">{log.user_name}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ac.color}`}>{ac.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-ink font-medium">{log.entity_label}</div>
                          <div className="text-xs text-ink-muted">{log.entity}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted max-w-xs">
                          <p className="truncate text-sm">{log.detail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted font-mono">{log.ip_address}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setViewItem(log); setIsViewOpen(true); }}
                            className="text-ink-muted hover:text-ink-muted transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((log) => {
                  const ac = actionConfig[log.action] || { label: log.action, color: 'bg-bg-subtle text-ink-muted' };
                  return (
                    <div
                      key={log.id}
                      onClick={() => {
                        setViewItem(log);
                        setIsViewOpen(true);
                      }}
                      className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-ink text-sm">{log.user_name}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ac.color}`}>{ac.label}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                        <div className="col-span-2">
                          <span className="font-medium text-ink-muted">Đối tượng:</span>{' '}
                          <span className="text-ink font-semibold">{log.entity_label}</span>{' '}
                          <span className="text-xs text-ink-muted">({log.entity})</span>
                        </div>
                        <div>
                          <span className="font-medium text-ink-muted">Thời gian:</span>{' '}
                          <span className="text-ink font-mono">{formatDate(log.created_at)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-ink-muted">IP:</span>{' '}
                          <span className="text-ink font-mono">{log.ip_address}</span>
                        </div>
                      </div>

                      <div className="text-xs text-ink bg-bg-subtle/50 p-2.5 rounded-lg border border-border/50">
                        <p className="line-clamp-2">{log.detail}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-accent font-semibold">Bấm để xem chi tiết</span>
                        <button
                          onClick={() => { setViewItem(log); setIsViewOpen(true); }}
                          className="text-ink-muted hover:text-ink-muted transition-colors p-1"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-10 text-ink-muted">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Không tìm thấy nhật ký hoạt động</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Chi tiết nhật ký</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-4 bg-bg-subtle rounded-lg">
                <div><p className="text-ink-muted text-xs">Người dùng</p><p className="font-medium text-ink">{viewItem.user_name}</p></div>
                <div><p className="text-ink-muted text-xs">Hành động</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${(actionConfig[viewItem.action] || {}).color}`}>
                    {(actionConfig[viewItem.action] || { label: viewItem.action }).label}
                  </span>
                </div>
                <div><p className="text-ink-muted text-xs">Đối tượng</p><p className="font-medium text-ink">{viewItem.entity}</p></div>
                <div><p className="text-ink-muted text-xs">ID</p><p className="font-mono text-xs text-ink-muted">{viewItem.entity_id}</p></div>
                <div className="col-span-2"><p className="text-ink-muted text-xs">Tên đối tượng</p><p className="font-medium text-ink">{viewItem.entity_label}</p></div>
                <div className="col-span-2"><p className="text-ink-muted text-xs">Nội dung</p><p className="text-ink">{viewItem.detail}</p></div>
                <div><p className="text-ink-muted text-xs">IP</p><p className="font-mono text-xs text-ink-muted">{viewItem.ip_address}</p></div>
                <div><p className="text-ink-muted text-xs">Thời gian</p><p className="text-ink-muted text-xs">{formatDate(viewItem.created_at)}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
