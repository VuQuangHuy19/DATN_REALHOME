'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, MessageSquare, Phone, Mail, Edit, Trash2, Eye, Loader2, AlertCircle } from 'lucide-react';
import { useConsultations } from '@/lib/hooks/useConsultations';
import { useEmployees } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBConsultation } from '@/lib/supabase/types';

const statusConfig: Record<string, { label: string; color: string }> = {
  new:         { label: 'Mới',            color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang xử lý',    color: 'bg-yellow-100 text-yellow-700' },
  resolved:    { label: 'Đã giải quyết', color: 'bg-green-100 text-green-700' },
  closed:      { label: 'Đã đóng',       color: 'bg-slate-100 text-slate-600' },
};

const sourceLabels: Record<string, string> = {
  website: 'Website', phone: 'Điện thoại', email: 'Email', walk_in: 'Trực tiếp',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ConsultationsPage() {
  const { company } = useAuth();
  const { consultations: list, loading, error, add, update, remove } = useConsultations(company?.id);
  const { items: employees } = useEmployees(company?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewItem, setViewItem] = useState<DBConsultation | null>(null);
  const [editItem, setEditItem] = useState<DBConsultation | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = list.filter((c) => {
    const matchSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const assignedTo = fd.get('assignedTo') as string;
    const payload = {
      company_id: company?.id ?? '',
      full_name: fd.get('fullName') as string,
      phone: fd.get('phone') as string,
      email: (fd.get('email') as string) || undefined,
      message: fd.get('message') as string,
      status: fd.get('status') as DBConsultation['status'],
      source: fd.get('source') as DBConsultation['source'],
      assigned_to: assignedTo || undefined,
      assigned_to_name: employees.find((e) => e.id === assignedTo)?.name || undefined,
    };
    if (editItem) {
      await update(editItem.id, payload);
    } else {
      await add(payload);
    }
    setSaving(false);
    setIsFormOpen(false);
    setEditItem(null);
  };

  const counts = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = list.filter((c) => c.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Yêu cầu tư vấn</h1>
          <p className="text-slate-500">Quản lý các yêu cầu tư vấn từ khách hàng</p>
        </div>
        <Button onClick={() => { setEditItem(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Thêm yêu cầu
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Tất cả ({list.length})
        </button>
        {Object.entries(statusConfig).map(([s, cfg]) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {cfg.label} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Tìm theo tên, SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
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
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Khách hàng</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Nội dung</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Nguồn</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Phân công</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Ngày tạo</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => {
                    const sc = statusConfig[item.status];
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setViewItem(item);
                          setIsViewOpen(true);
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.full_name}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Phone className="h-3 w-3" />{item.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                          <p className="truncate text-sm">{item.message}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{sourceLabels[item.source] ?? item.source}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{item.assigned_to_name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewItem(item); setIsViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditItem(item); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); remove(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có yêu cầu tư vấn nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Chi tiết yêu cầu tư vấn</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Họ tên:</span> <span className="font-medium">{viewItem.full_name}</span></div>
                <div><span className="text-slate-500">SĐT:</span> {viewItem.phone}</div>
                <div><span className="text-slate-500">Email:</span> {viewItem.email ?? '—'}</div>
                <div><span className="text-slate-500">Nguồn:</span> {sourceLabels[viewItem.source] ?? viewItem.source}</div>
                <div><span className="text-slate-500">Trạng thái:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[viewItem.status].color}`}>{statusConfig[viewItem.status].label}</span></div>
                <div><span className="text-slate-500">Phân công:</span> {viewItem.assigned_to_name ?? '—'}</div>
                <div><span className="text-slate-500">Ngày tạo:</span> {formatDate(viewItem.created_at)}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Nội dung</p>
                <p className="text-sm text-slate-700">{viewItem.message}</p>
              </div>
              <div className="flex gap-2 pt-1">
                {(['in_progress', 'resolved', 'closed'] as const).filter((s) => s !== viewItem.status).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => { update(viewItem.id, { status: s }); setIsViewOpen(false); }}
                  >
                    {statusConfig[s].label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} yêu cầu tư vấn</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="fullName">Họ và tên <span className="text-red-500">*</span></Label>
                <Input id="fullName" name="fullName" defaultValue={editItem?.full_name} required />
              </div>
              <div>
                <Label htmlFor="phone">SĐT <span className="text-red-500">*</span></Label>
                <Input id="phone" name="phone" defaultValue={editItem?.phone} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} />
              </div>
              <div>
                <Label htmlFor="source">Nguồn</Label>
                <select id="source" name="source" defaultValue={editItem?.source ?? 'website'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status ?? 'new'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="message">Nội dung <span className="text-red-500">*</span></Label>
                <Input id="message" name="message" defaultValue={editItem?.message} required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="assignedTo">Phân công</Label>
                <select id="assignedTo" name="assignedTo" defaultValue={editItem?.assigned_to ?? ''} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.filter((e) => e.status === 'active').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
