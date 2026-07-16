'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, Building2, Edit, Trash2, Lock, Unlock,
  Users, MapPin, Mail, Phone, Eye, Loader2, RotateCw,
  Globe,
} from 'lucide-react';
import { useCompanies } from '@/lib/hooks/useCompanies';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';

/* ─── Badge helpers ──────────────────────────────────────────────── */
const planStyle: Record<string, string> = {
  starter:      'bg-bg-subtle text-ink border border-border',
  professional: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]',
  enterprise:   'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] border border-[hsl(38,72%,76%)]',
};
const planLabel: Record<string, string> = {
  starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
};

const statusStyle: Record<string, string> = {
  active:    'bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] border border-[hsl(142,45%,78%)]',
  trial:     'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] border border-[hsl(38,72%,76%)]',
  suspended: 'bg-[hsl(4,72%,93%)] text-[hsl(4,60%,36%)] border border-[hsl(4,55%,78%)]',
};
const statusLabel: Record<string, string> = {
  active: 'Hoạt động', trial: 'Dùng thử', suspended: 'Tạm khóa',
};

/* ─── Trial days remaining (safe: only when field is set) ─────────── */
function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/* ─── Date formatter ─────────────────────────────────────────────── */
function formatDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}

/* ─── Plan filter pills ──────────────────────────────────────────── */
const PLAN_FILTERS = ['all', 'starter', 'professional', 'enterprise'] as const;

export default function SuperAdminCompaniesPage() {
  const { companies, loading, error, refetch, add, update, remove } = useCompanies();

  const [searchQuery, setSearchQuery]   = useState('');
  const [planFilter, setPlanFilter]     = useState<string>('all');
  const [editItem, setEditItem]         = useState<any | null>(null);
  const [viewItem, setViewItem]         = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [isViewOpen, setIsViewOpen]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [logoUrl, setLogoUrl]           = useState<string | null>(null);

  const filtered = companies.filter((c: any) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.owner_email && c.owner_email.toLowerCase().includes(q)) ||
      (c.owner_name && c.owner_name.toLowerCase().includes(q));
    const matchPlan = planFilter === 'all' || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const toggleStatus = async (id: string) => {
    const target = companies.find((c: any) => c.id === id);
    if (target) {
      await update(id, { status: target.status === 'active' ? 'suspended' : 'active' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa công ty này?')) await remove(id);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name       = fd.get('name') as string;
    const code       = fd.get('code') as string;
    const plan       = fd.get('plan') as string;
    const status     = fd.get('status') as string;
    const owner_name  = fd.get('ownerName') as string;
    const owner_email = fd.get('ownerEmail') as string;
    const phone       = fd.get('phone') as string;
    const address     = fd.get('address') as string;
    const jwt_duration = parseInt(fd.get('jwt_duration') as string) || 10;

    if (!name || !phone || !owner_email || !owner_name || !address || !code) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    setSubmitting(true);
    try {
      if (editItem) {
        await update(editItem.id, {
          name, code, logo_url: logoUrl,
          plan: plan as any, status: status as any,
          owner_name, owner_email, phone, address,
          total_users: editItem.total_users || 0,
          total_properties: editItem.total_properties || 0,
          trial_ends_at: editItem.trial_ends_at || null,
          jwt_duration,
        });
        toast.success('Cập nhật công ty thành công!');
      } else {
        const res = await fetch('/api/onboarding/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, code, logo_url: logoUrl, plan, owner_name, owner_email, phone, address, jwt_duration, status: 'pending' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể tạo công ty');
        if (data.emailSent) {
          toast.success('Đã khởi tạo công ty và gửi email kích hoạt!');
        } else {
          toast.success('Công ty đã được tạo!', { description: data.emailError || 'Email kích hoạt chưa gửi được.' });
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
      return;
    } finally {
      setSubmitting(false);
    }
    setIsFormOpen(false); setEditItem(null); setLogoUrl(null);
  };

  const openAdd  = () => { setEditItem(null); setLogoUrl(null); setIsFormOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setLogoUrl(item.logo_url || null); setIsFormOpen(true); };
  const openView = (item: any) => { setViewItem(item); setIsViewOpen(true); };

  /* ── Status pill helper ─────────────────────────────────────────── */
  const StatusPill = ({ item }: { item: any }) => {
    const days = trialDaysLeft(item.trial_ends_at);
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[item.status] ?? statusStyle.trial}`}>
        {statusLabel[item.status] ?? item.status}
        {item.status === 'trial' && days !== null && (
          <span className="font-mono font-bold">({days}d)</span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Quản lý Công ty
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Tất cả công ty trên nền tảng RealHome
            <span className="ml-2 text-[11px] font-mono text-ink-muted bg-bg-subtle border border-border px-2 py-0.5 rounded-full">
              {companies.length} công ty
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={loading}
            title="Làm mới"
            className="border-border text-ink-muted hover:text-ink"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openAdd} className="bg-accent hover:bg-accent/90 text-white gap-2">
            <Plus className="h-4 w-4" />
            Thêm công ty
          </Button>
        </div>
      </div>

      {/* Plan Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {PLAN_FILTERS.map((p) => (
          <button
            key={p}
            onClick={() => setPlanFilter(p)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              planFilter === p
                ? 'bg-ink text-white'
                : 'bg-bg-subtle text-ink-muted hover:bg-border hover:text-ink border border-border'
            }`}
          >
            {p === 'all' ? `Tất cả (${companies.length})` : planLabel[p]}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardContent className="p-4 pb-3">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder="Tìm công ty, email, mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-border rounded-lg focus-visible:ring-accent/40"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table min-w-[760px]">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Công ty</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Chủ sở hữu</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Gói</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-ink-muted uppercase tracking-wider">Users</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-ink-muted uppercase tracking-wider">BĐS</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Ngày tạo</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item: any) => (
                    <tr
                      key={item.id}
                      className="hover:bg-bg-subtle/60 transition-colors cursor-pointer"
                      onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; openView(item); }}
                    >
                      {/* Company */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-bg-subtle border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.logo_url ? (
                              <Image src={item.logo_url} alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
                            ) : (
                              <Building2 className="h-4 w-4 text-ink-muted" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-ink flex items-center gap-1.5">
                              {item.name}
                              {item.code && (
                                <span className="text-[10px] font-mono text-ink-muted bg-bg-subtle border border-border px-1.5 py-0 rounded">
                                  {item.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-3.5">
                        <div className="text-ink font-medium text-sm">{item.owner_name}</div>
                        <div className="text-xs text-ink-muted mt-0.5">{item.owner_email}</div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${planStyle[item.plan] ?? planStyle.starter}`}>
                          {planLabel[item.plan] ?? item.plan}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusPill item={item} />
                      </td>

                      {/* Users */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-ink-muted" />
                          <span className="font-semibold text-ink tabular-nums">{item.total_users || 0}</span>
                        </div>
                      </td>

                      {/* Properties */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-ink-muted" />
                          <span className="font-semibold text-ink tabular-nums">{item.total_properties || 0}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-ink-muted font-mono tabular-nums">
                        {formatDate(item.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-lg"
                            onClick={() => openView(item)} title="Xem chi tiết">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-lg"
                            onClick={() => openEdit(item)} title="Chỉnh sửa">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                            title={item.status === 'suspended' ? 'Mở khóa' : 'Khóa'}
                            onClick={() => toggleStatus(item.id)}>
                            {item.status === 'suspended'
                              ? <Unlock className="h-4 w-4 text-[hsl(142,52%,42%)]" />
                              : <Lock className="h-4 w-4 text-[hsl(4,60%,45%)]" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(4,60%,45%)] hover:bg-[hsl(4,72%,96%)] rounded-lg"
                            onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => openView(item)}
                    className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-bg-subtle border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.logo_url ? (
                            <Image src={item.logo_url} alt="Logo" width={36} height={36} className="object-cover" />
                          ) : (
                            <Building2 className="h-4 w-4 text-ink-muted" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-ink text-sm block">{item.name}</span>
                          <span className="text-[10px] font-mono text-ink-muted bg-bg-subtle border border-border px-1.5 py-0.5 rounded inline-block mt-0.5">{item.code || '—'}</span>
                        </div>
                      </div>
                      <StatusPill item={item} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      <div>
                        <span className="font-medium text-ink-muted">Chủ sở hữu:</span>{' '}
                        <span className="text-ink font-semibold">{item.owner_name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Gói:</span>{' '}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${planStyle[item.plan] ?? planStyle.starter}`}>
                          {planLabel[item.plan] ?? item.plan}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Users / BĐS:</span>{' '}
                        <span className="text-ink font-semibold font-mono">{item.total_users || 0} / {item.total_properties || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium text-ink-muted">Ngày tạo:</span>{' '}
                        <span className="text-ink font-mono">{formatDate(item.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs text-ink-muted truncate max-w-[140px] font-mono">
                        {item.owner_email}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-lg"
                          onClick={() => openView(item)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-lg"
                          onClick={() => openEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                          onClick={() => toggleStatus(item.id)}>
                          {item.status === 'suspended'
                            ? <Unlock className="h-4 w-4 text-[hsl(142,52%,42%)]" />
                            : <Lock className="h-4 w-4 text-[hsl(4,60%,45%)]" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(4,60%,45%)] hover:bg-[hsl(4,72%,96%)] rounded-lg"
                          onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-14 text-ink-muted">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-25" />
                  <p className="text-sm font-semibold text-ink">Không tìm thấy công ty nào</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── View Dialog ───────────────────────────────────────────── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg border border-border shadow-xl rounded-2xl bg-white">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-3 font-heading text-ink">
              <div className="h-10 w-10 rounded-xl bg-bg-subtle border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {viewItem?.logo_url ? (
                  <Image src={viewItem.logo_url} alt="Logo" width={40} height={40} className="object-cover" />
                ) : (
                  <Building2 className="h-5 w-5 text-ink-muted" />
                )}
              </div>
              <div>
                <div className="font-bold text-ink">{viewItem?.name}</div>
                <div className="text-xs text-ink-muted font-mono font-normal">
                  Mã: {viewItem?.code ?? '—'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-2">
              {/* Contact info */}
              <div className="grid grid-cols-1 gap-2 p-4 bg-bg-subtle border border-border rounded-xl text-sm">
                <div className="flex items-center gap-2 text-ink">
                  <Mail className="h-4 w-4 text-ink-muted flex-shrink-0" />
                  {viewItem.owner_email}
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <Phone className="h-4 w-4 text-ink-muted flex-shrink-0" />
                  {viewItem.phone || '—'}
                </div>
                <div className="flex items-start gap-2 text-ink">
                  <MapPin className="h-4 w-4 text-ink-muted flex-shrink-0 mt-0.5" />
                  {viewItem.address || '—'}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3 text-sm">
                {[
                  { label: 'Gói', content: <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${planStyle[viewItem.plan]}`}>{planLabel[viewItem.plan]}</span> },
                  { label: 'Trạng thái', content: <StatusPill item={viewItem} /> },
                  { label: 'Users', content: <span className="font-bold text-ink font-heading tabular-nums">{viewItem.total_users || 0}</span> },
                  { label: 'BĐS', content: <span className="font-bold text-ink font-heading tabular-nums">{viewItem.total_properties || 0}</span> },
                  { label: 'JWT', content: <span className="font-mono font-bold text-ink tabular-nums">{viewItem.jwt_duration ?? 10}m</span> },
                  { label: 'Ngày tạo', content: <span className="font-mono text-ink-muted text-xs tabular-nums">{formatDate(viewItem.created_at)}</span> },
                ].map(({ label, content }) => (
                  <div key={label} className="p-3 bg-bg-subtle border border-border rounded-xl text-center">
                    <p className="text-[10px] text-ink-muted uppercase font-bold tracking-wider mb-1.5">{label}</p>
                    {content}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border hover:bg-bg-subtle"
                  onClick={() => { setIsViewOpen(false); openEdit(viewItem); }}>
                  <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa
                </Button>
                <Button
                  variant={viewItem.status === 'suspended' ? 'default' : 'destructive'}
                  className="flex-1"
                  onClick={() => { toggleStatus(viewItem.id); setIsViewOpen(false); }}
                >
                  {viewItem.status === 'suspended'
                    ? <><Unlock className="h-4 w-4 mr-2" />Mở khóa</>
                    : <><Lock className="h-4 w-4 mr-2" />Khóa</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Form Dialog ───────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border border-border shadow-xl rounded-2xl bg-white">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="font-heading text-ink">
              {editItem ? 'Chỉnh sửa' : 'Thêm'} công ty
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  Tên công ty <span className="text-[hsl(4,60%,45%)]">*</span>
                </Label>
                <Input id="name" name="name" defaultValue={editItem?.name} required
                  className="border-border rounded-lg focus-visible:ring-accent/40" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  Mã công ty <span className="text-[hsl(4,60%,45%)]">*</span>
                </Label>
                <Input id="code" name="code" defaultValue={editItem?.code} required
                  placeholder="Ví dụ: CTY001" disabled={!!editItem}
                  className="border-border rounded-lg focus-visible:ring-accent/40 font-mono" />
                {editItem && <input type="hidden" name="code" value={editItem.code} />}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  Số điện thoại <span className="text-[hsl(4,60%,45%)]">*</span>
                </Label>
                <Input id="phone" name="phone" defaultValue={editItem?.phone} required
                  className="border-border rounded-lg focus-visible:ring-accent/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  Chủ sở hữu <span className="text-[hsl(4,60%,45%)]">*</span>
                </Label>
                <Input id="ownerName" name="ownerName" defaultValue={editItem?.owner_name} required
                  className="border-border rounded-lg focus-visible:ring-accent/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  Email <span className="text-[hsl(4,60%,45%)]">*</span>
                </Label>
                <Input id="ownerEmail" name="ownerEmail" type="email" defaultValue={editItem?.owner_email} required
                  className="border-border rounded-lg focus-visible:ring-accent/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Gói dịch vụ</Label>
                <select id="plan" name="plan" defaultValue={editItem?.plan || 'starter'}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">JWT timeout (phút)</Label>
                <Input id="jwt_duration" name="jwt_duration" type="number" min={1}
                  defaultValue={editItem?.jwt_duration ?? 10} required
                  className="border-border rounded-lg focus-visible:ring-accent/40 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status || 'active'}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
                  <option value="active">Hoạt động</option>
                  <option value="suspended">Tạm khóa</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                  Địa chỉ <span className="text-[hsl(4,60%,45%)]">*</span>
                </Label>
                <Input id="address" name="address" defaultValue={editItem?.address} required
                  className="border-border rounded-lg focus-visible:ring-accent/40" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Logo công ty</Label>
                <ImageUpload value={logoUrl} onChange={(url) => setLogoUrl(url)} bucket="avatars" className="mt-1" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white" disabled={submitting}>
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang xử lý...</>
                : editItem ? 'Lưu thay đổi' : 'Khởi tạo công ty & Gửi email'
              }
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}