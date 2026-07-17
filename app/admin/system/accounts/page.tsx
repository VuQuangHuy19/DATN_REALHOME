'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Lock, Unlock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { getProfiles } from '@/src/features/staff/services/profiles';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Database } from '@/lib/supabase/types';

type DBProfile = Database['public']['Tables']['profiles']['Row'];

const roleLabels: Record<string, string> = {
  super_admin:   'Super Admin',
  company_admin: 'Quản trị viên',
  manager:       'Quản lý',
  sales_agent:   'Nhân viên',
  landlord:      'Chủ nhà',
};

const roleColors: Record<string, string> = {
  super_admin:   'bg-red-100 text-red-700',
  company_admin: 'bg-purple-100 text-purple-700',
  manager:       'bg-blue-100 text-blue-700',
  sales_agent:   'bg-bg-subtle text-ink',
  landlord:      'bg-emerald-100 text-emerald-700',
};

export default function AccountsPage() {
  const { company } = useAuth();
  const [profiles, setProfiles] = useState<DBProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewItem, setViewItem] = useState<DBProfile | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    getProfiles(company.id)
      .then((data) => { setProfiles(data); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [company?.id]);

  const filtered = profiles.filter((p) =>
    (p.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone ?? '').includes(searchQuery) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Quản lý Tài khoản</h1>
          <p className="text-ink-muted">Quản lý tài khoản người dùng, vai trò và quyền hạn</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input placeholder="Tìm theo tên, SĐT hoặc vai trò..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink-muted" /></div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-bg-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Họ tên</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Số điện thoại</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Vai trò</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-medium text-ink-muted">Ngày tạo</th>
                    <th className="px-4 py-3 text-right font-medium text-ink-muted">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-bg-subtle dark:hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setViewItem(item);
                        setIsViewOpen(true);
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-ink">{item.full_name ?? '(chưa đặt tên)'}</td>
                      <td className="px-4 py-3 text-ink-muted">{item.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[item.role] ?? 'bg-bg-subtle text-ink-muted'}`}>
                          {roleLabels[item.role] ?? item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.is_active ? 'default' : 'destructive'}>
                          {item.is_active ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{item.created_at.split('T')[0]}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" title={item.is_active ? 'Khóa tài khoản' : 'Mở khóa'}>
                            {item.is_active ? <Lock className="h-4 w-4 text-orange-500" /> : <Unlock className="h-4 w-4 text-green-500" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setViewItem(item);
                      setIsViewOpen(true);
                    }}
                    className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink text-sm">{item.full_name ?? '(chưa đặt tên)'}</span>
                      <Badge variant={item.is_active ? 'default' : 'destructive'}>
                        {item.is_active ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      <div>
                        <span className="font-medium text-ink-muted">SĐT:</span>{' '}
                        <span className="text-ink font-mono">{item.phone ?? '—'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Ngày tạo:</span>{' '}
                        <span className="text-ink font-mono">{item.created_at.split('T')[0]}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-ink-muted">Vai trò:</span>{' '}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${roleColors[item.role] ?? 'bg-bg-subtle text-ink-muted'}`}>
                          {roleLabels[item.role] ?? item.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-accent font-semibold">Bấm để xem chi tiết</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title={item.is_active ? 'Khóa tài khoản' : 'Mở khóa'}>
                          {item.is_active ? <Lock className="h-4 w-4 text-orange-500" /> : <Unlock className="h-4 w-4 text-green-500" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-10 text-ink-muted">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có tài khoản nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Chi tiết tài khoản</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-ink-muted">Họ tên:</span> <span className="font-medium">{viewItem.full_name ?? '—'}</span></div>
                <div><span className="text-ink-muted">SĐT:</span> {viewItem.phone ?? '—'}</div>
                <div><span className="text-ink-muted">Vai trò:</span>
                  <span className={`inline-flex ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[viewItem.role] ?? 'bg-bg-subtle text-ink-muted'}`}>
                    {roleLabels[viewItem.role] ?? viewItem.role}
                  </span>
                </div>
                <div><span className="text-ink-muted">Trạng thái:</span> <Badge variant={viewItem.is_active ? 'default' : 'destructive'}>{viewItem.is_active ? 'Hoạt động' : 'Đã khóa'}</Badge></div>
                <div><span className="text-ink-muted">Ngày tạo:</span> {viewItem.created_at.split('T')[0]}</div>
                <div><span className="text-ink-muted">Cập nhật:</span> {viewItem.updated_at.split('T')[0]}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
