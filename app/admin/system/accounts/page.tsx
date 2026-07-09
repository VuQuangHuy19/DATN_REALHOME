'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Lock, Unlock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { getProfiles } from '@/lib/supabase/repositories/profiles';
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
  sales_agent:   'bg-slate-100 text-slate-700',
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
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Tài khoản</h1>
          <p className="text-slate-500">Quản lý tài khoản người dùng, vai trò và quyền hạn</p>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Tìm theo tên, SĐT hoặc vai trò..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Họ tên</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Số điện thoại</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Vai trò</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Ngày tạo</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setViewItem(item);
                        setIsViewOpen(true);
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{item.full_name ?? '(chưa đặt tên)'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[item.role] ?? 'bg-slate-100 text-slate-600'}`}>
                          {roleLabels[item.role] ?? item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.is_active ? 'default' : 'destructive'}>
                          {item.is_active ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.created_at.split('T')[0]}</td>
                      <td className="px-4 py-3 text-right">
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
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
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
                <div><span className="text-slate-500">Họ tên:</span> <span className="font-medium">{viewItem.full_name ?? '—'}</span></div>
                <div><span className="text-slate-500">SĐT:</span> {viewItem.phone ?? '—'}</div>
                <div><span className="text-slate-500">Vai trò:</span>
                  <span className={`inline-flex ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[viewItem.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {roleLabels[viewItem.role] ?? viewItem.role}
                  </span>
                </div>
                <div><span className="text-slate-500">Trạng thái:</span> <Badge variant={viewItem.is_active ? 'default' : 'destructive'}>{viewItem.is_active ? 'Hoạt động' : 'Đã khóa'}</Badge></div>
                <div><span className="text-slate-500">Ngày tạo:</span> {viewItem.created_at.split('T')[0]}</div>
                <div><span className="text-slate-500">Cập nhật:</span> {viewItem.updated_at.split('T')[0]}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
