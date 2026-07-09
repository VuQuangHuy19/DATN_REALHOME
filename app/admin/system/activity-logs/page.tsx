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
  LOGIN:  { label: 'Đăng nhập',  color: 'bg-slate-100 text-slate-700' },
  LOGOUT: { label: 'Đăng xuất',  color: 'bg-slate-100 text-slate-600' },
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
        <h1 className="text-2xl font-bold text-slate-800">Nhật ký hoạt động</h1>
        <p className="text-slate-500">Theo dõi toàn bộ hành động của người dùng trong hệ thống</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${actionFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tất cả
          </button>
          {Object.keys(actionConfig).map((action) => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${actionFilter === action ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {actionConfig[action].label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Thời gian</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Người dùng</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Hành động</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Đối tượng</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Nội dung</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">IP</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((log) => {
                    const ac = actionConfig[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{log.user_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ac.color}`}>{ac.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700 font-medium">{log.entity_label}</div>
                          <div className="text-xs text-slate-400">{log.entity}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">
                          <p className="truncate text-sm">{log.detail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ip_address}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { setViewItem(log); setIsViewOpen(true); }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
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
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg">
                <div><p className="text-slate-400 text-xs">Người dùng</p><p className="font-medium text-slate-800">{viewItem.user_name}</p></div>
                <div><p className="text-slate-400 text-xs">Hành động</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${(actionConfig[viewItem.action] || {}).color}`}>
                    {(actionConfig[viewItem.action] || { label: viewItem.action }).label}
                  </span>
                </div>
                <div><p className="text-slate-400 text-xs">Đối tượng</p><p className="font-medium text-slate-800">{viewItem.entity}</p></div>
                <div><p className="text-slate-400 text-xs">ID</p><p className="font-mono text-xs text-slate-600">{viewItem.entity_id}</p></div>
                <div className="col-span-2"><p className="text-slate-400 text-xs">Tên đối tượng</p><p className="font-medium text-slate-800">{viewItem.entity_label}</p></div>
                <div className="col-span-2"><p className="text-slate-400 text-xs">Nội dung</p><p className="text-slate-700">{viewItem.detail}</p></div>
                <div><p className="text-slate-400 text-xs">IP</p><p className="font-mono text-xs text-slate-600">{viewItem.ip_address}</p></div>
                <div><p className="text-slate-400 text-xs">Thời gian</p><p className="text-slate-600 text-xs">{formatDate(viewItem.created_at)}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
