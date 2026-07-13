'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  CreditCard, Edit, Calendar, Building2, Loader2, AlertCircle,
  TrendingUp, Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Subscription {
  id: string;
  companyId: string;
  companyName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  seats: number;
  pricePerMonth: number;
  startsAt: string;
  endsAt: string | null;
}

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
  expired:   'bg-[hsl(4,72%,93%)] text-[hsl(4,60%,36%)] border border-[hsl(4,55%,78%)]',
  cancelled: 'bg-bg-subtle text-ink-muted border border-border',
};
const statusLabel: Record<string, string> = {
  active: 'Hoạt động', trial: 'Dùng thử', expired: 'Hết hạn', cancelled: 'Đã hủy',
};

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}

export default function SubscriptionsPage() {
  const [subs, setSubs]         = useState<Subscription[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [editItem, setEditItem] = useState<Subscription | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: subError } = await supabase
        .from('subscriptions')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
      if (subError) throw subError;
      setSubs(
        (data ?? []).map((s: any) => ({
          id: s.id,
          companyId: s.company_id,
          companyName: s.companies?.name ?? 'Không rõ',
          plan: s.plan,
          status: s.status,
          seats: s.seats,
          pricePerMonth: s.price_per_month,
          startsAt: s.starts_at,
          endsAt: s.ends_at || s.trial_ends_at || null,
        }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubscriptions(); }, []);

  const totalMRR = subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.pricePerMonth, 0);
  const activeCount = subs.filter((s) => s.status === 'active').length;
  const trialCount  = subs.filter((s) => s.status === 'trial').length;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const plan         = fd.get('plan') as Subscription['plan'];
    const status       = fd.get('status') as Subscription['status'];
    const seats        = Number(fd.get('seats'));
    const pricePerMonth = Number(fd.get('pricePerMonth'));
    const endsAt       = fd.get('endsAt') as string || null;

    try {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ plan, status, seats, price_per_month: pricePerMonth, ends_at: endsAt })
        .eq('id', editItem.id);
      if (updateError) throw updateError;
      await fetchSubscriptions();
      setIsFormOpen(false); setEditItem(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi cập nhật gói đăng ký');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">Gói đăng ký</h1>
        <p className="text-ink-muted mt-1 text-sm">Quản lý gói đăng ký của các công ty trên nền tảng</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[hsl(4,72%,96%)] border border-[hsl(4,55%,80%)] rounded-lg text-[hsl(4,60%,36%)] text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">MRR (Doanh thu tháng)</p>
                <p className="font-mono font-bold text-accent text-2xl mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : formatVND(totalMRR)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent-soft text-accent flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Đang hoạt động</p>
                <p className="text-3xl font-bold font-heading text-ink mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : activeCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)] flex-shrink-0">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Đang dùng thử</p>
                <p className="text-3xl font-bold font-heading text-[hsl(38,72%,40%)] mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : trialCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] flex-shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Công ty</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Gói</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-5 py-3.5 text-center text-[11px] font-bold text-ink-muted uppercase tracking-wider">Seats</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-ink-muted uppercase tracking-wider">Giá/tháng</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider">Hết hạn</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subs.map((sub) => (
                    <tr key={sub.id} className="hover:bg-bg-subtle/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-bg-subtle border border-border flex-shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-ink-muted" />
                          </div>
                          <span className="font-semibold text-ink">{sub.companyName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${planStyle[sub.plan] ?? planStyle.starter}`}>
                          {planLabel[sub.plan] ?? sub.plan}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[sub.status] ?? statusStyle.cancelled}`}>
                          {statusLabel[sub.status] ?? sub.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-semibold text-ink tabular-nums">{sub.seats}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-accent tabular-nums">
                        {formatVND(sub.pricePerMonth)}
                      </td>
                      <td className="px-5 py-4">
                        {sub.endsAt ? (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted font-mono tabular-nums">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            {formatDate(sub.endsAt)}
                          </div>
                        ) : (
                          <span className="text-ink-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-bg-subtle rounded-lg"
                          onClick={() => { setEditItem(sub); setIsFormOpen(true); }}
                          title="Chỉnh sửa gói đăng ký"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {subs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-ink-muted">
                        <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-25" />
                        <p className="text-sm font-semibold text-ink">Chưa có gói đăng ký nào</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md border border-border shadow-xl rounded-2xl bg-white">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="font-heading text-ink font-bold">
              Chỉnh sửa gói đăng ký —{' '}
              <span className="text-accent">{editItem?.companyName}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Gói dịch vụ</Label>
                <select id="plan" name="plan" defaultValue={editItem?.plan}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
                  <option value="active">Hoạt động</option>
                  <option value="trial">Dùng thử</option>
                  <option value="expired">Hết hạn</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Số chỗ (seats)</Label>
                <Input id="seats" name="seats" type="number" defaultValue={editItem?.seats} min={1}
                  className="border-border rounded-lg focus-visible:ring-accent/40 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Giá/tháng (VNĐ)</Label>
                <Input id="pricePerMonth" name="pricePerMonth" type="number" defaultValue={editItem?.pricePerMonth} min={0}
                  className="border-border rounded-lg focus-visible:ring-accent/40 font-mono" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Ngày hết hạn</Label>
                <Input id="endsAt" name="endsAt" type="date"
                  defaultValue={editItem?.endsAt ? editItem.endsAt.split('T')[0] : ''}
                  className="border-border rounded-lg focus-visible:ring-accent/40 font-mono" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lưu thay đổi
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
