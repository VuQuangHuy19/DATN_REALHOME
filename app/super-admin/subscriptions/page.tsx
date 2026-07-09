'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard, Edit, Calendar, Building2, Loader2, AlertCircle } from 'lucide-react';
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

const planConfig: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: 'bg-slate-100 text-slate-700' },
  professional: { label: 'Professional', color: 'bg-blue-100 text-blue-700' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Hoạt động', color: 'bg-green-100 text-green-700' },
  trial: { label: 'Dùng thử', color: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Hết hạn', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Đã hủy', color: 'bg-slate-100 text-slate-600' },
};

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<Subscription | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: subError } = await supabase
        .from('subscriptions')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });

      if (subError) throw subError;

      const formatted = (data ?? []).map((s: any) => ({
        id: s.id,
        companyId: s.company_id,
        companyName: s.companies?.name ?? 'Không rõ',
        plan: s.plan,
        status: s.status,
        seats: s.seats,
        pricePerMonth: s.price_per_month,
        startsAt: s.starts_at,
        endsAt: s.ends_at || s.trial_ends_at || null,
      }));
      setSubs(formatted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const totalMRR = subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.pricePerMonth, 0);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const plan = fd.get('plan') as Subscription['plan'];
    const status = fd.get('status') as Subscription['status'];
    const seats = Number(fd.get('seats'));
    const pricePerMonth = Number(fd.get('pricePerMonth'));
    const endsAt = fd.get('endsAt') as string || null;

    try {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan,
          status,
          seats,
          price_per_month: pricePerMonth,
          ends_at: endsAt,
        })
        .eq('id', editItem.id);

      if (updateError) throw updateError;
      await fetchSubscriptions();
      setIsFormOpen(false);
      setEditItem(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi cập nhật gói đăng ký');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gói đăng ký</h1>
        <p className="text-slate-500">Quản lý gói đăng ký của các công ty trên nền tảng</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">MRR (Doanh thu tháng)</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {loading ? '...' : formatVND(totalMRR)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Đang hoạt động</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {loading ? '...' : subs.filter((s) => s.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Đang dùng thử</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {loading ? '...' : subs.filter((s) => s.status === 'trial').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Công ty</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Gói</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Seats</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Giá/tháng</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Hết hạn</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subs.map((sub) => {
                    const pc = planConfig[sub.plan] || { label: sub.plan, color: 'bg-gray-100 text-gray-700' };
                    const sc = statusConfig[sub.status] || { label: sub.status, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span className="font-medium text-slate-800">{sub.companyName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc.color}`}>{pc.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">{sub.seats}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">{formatVND(sub.pricePerMonth)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {sub.endsAt ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(sub.endsAt).toLocaleDateString('vi-VN')}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setEditItem(sub); setIsFormOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {subs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Chưa có gói đăng ký nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa gói đăng ký — {editItem?.companyName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan">Gói dịch vụ</Label>
                <select id="plan" name="plan" defaultValue={editItem?.plan} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="active">Hoạt động</option>
                  <option value="trial">Dùng thử</option>
                  <option value="expired">Hết hạn</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              <div>
                <Label htmlFor="seats">Số chỗ (seats)</Label>
                <Input id="seats" name="seats" type="number" defaultValue={editItem?.seats} min={1} />
              </div>
              <div>
                <Label htmlFor="pricePerMonth">Giá/tháng (VNĐ)</Label>
                <Input id="pricePerMonth" name="pricePerMonth" type="number" defaultValue={editItem?.pricePerMonth} min={0} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="endsAt">Ngày hết hạn</Label>
                <Input id="endsAt" name="endsAt" type="date" defaultValue={editItem?.endsAt ? editItem.endsAt.split('T')[0] : ''} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />}
              Lưu thay đổi
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
