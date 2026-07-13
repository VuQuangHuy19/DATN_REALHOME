'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, Users, CreditCard, TrendingUp, Activity,
  Package, Loader2, Calendar, ShieldAlert, Sparkles,
  TrendingDown, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useCompanies } from '@/lib/hooks/useCompanies';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

/* ─── Plan Styles ────────────────────────────────────────────────── */
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

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + ' đ';
}

export default function SuperAdminDashboard() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [subs, setSubs] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchSubs() {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*, companies(name)');
        if (error) throw error;
        setSubs(data || []);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
      } finally {
        setSubsLoading(false);
      }
    }
    fetchSubs();
  }, []);

  const loading = companiesLoading || subsLoading;

  // Calcul MRR (price_per_month * seats for active subscriptions)
  const totalMRR = useMemo(() => {
    return subs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.price_per_month || 0) * (s.seats || 1), 0);
  }, [subs]);

  // Companies expiring trial soon (in next 7 days)
  const trialExpiringSoonList = useMemo(() => {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);
    return companies.filter((c) => {
      if (c.status !== 'trial' || !c.trial_ends_at) return false;
      const d = new Date(c.trial_ends_at);
      return d >= now && d <= in7Days;
    });
  }, [companies]);

  // Companies requiring attention: Trial expiring soon, Suspended, or Subscription cancelled/expired
  const attentionList = useMemo(() => {
    const list: any[] = [];
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    companies.forEach((c) => {
      if (c.status === 'suspended') {
        list.push({
          id: c.id,
          name: c.name,
          reason: 'Tài khoản công ty đang bị tạm khóa',
          severity: 'danger',
          status: c.status,
          owner_email: c.owner_email,
        });
      }
      if (c.status === 'trial' && c.trial_ends_at) {
        const d = new Date(c.trial_ends_at);
        if (d >= now && d <= in7Days) {
          list.push({
            id: c.id,
            name: c.name,
            reason: `Dùng thử sắp hết hạn (${d.toLocaleDateString('vi-VN')})`,
            severity: 'warning',
            status: c.status,
            owner_email: c.owner_email,
          });
        }
      }
    });

    subs.forEach((s) => {
      if (s.status === 'expired' || s.status === 'cancelled') {
        const comp = companies.find((c) => c.id === s.company_id);
        if (comp) {
          list.push({
            id: comp.id,
            name: comp.name,
            reason: `Gói ${planLabel[s.plan] || s.plan} đã ${s.status === 'expired' ? 'hết hạn' : 'bị hủy'}`,
            severity: 'danger',
            status: comp.status,
            owner_email: comp.owner_email,
          });
        }
      }
    });

    return list;
  }, [companies, subs]);

  // Registration chart data
  const registrationsChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => {
      if (!c.created_at) return;
      const month = c.created_at.substring(0, 7); // 'YYYY-MM'
      counts[month] = (counts[month] || 0) + 1;
    });

    const sortedMonths = Object.keys(counts).sort();
    let cumulative = 0;
    return sortedMonths.map((month) => {
      cumulative += counts[month];
      return {
        name: month,
        'Tổng số công ty': cumulative,
        'Đăng ký mới': counts[month]
      };
    });
  }, [companies]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const activeCount = companies.filter((c) => c.status === 'active').length;
  const trialCount = companies.filter((c) => c.status === 'trial').length;
  const suspendedCount = companies.filter((c) => c.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Tổng quan hệ thống
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Báo cáo sức khỏe kinh doanh & giám sát tài khoản SaaS toàn nền tảng
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-soft border border-accent/20 rounded-full text-accent text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          SaaS Dashboard Active
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu tháng MRR */}
        <Card className="border-border shadow-none rounded-lg bg-white relative overflow-hidden group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                MRR (Doanh thu tháng)
              </p>
              <p className="text-2xl font-bold font-mono text-accent mt-2 tracking-tight tabular-nums">
                {formatVND(totalMRR)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs text-ink-muted">
              <span>Đang tính trên active seats</span>
              <div className="p-1.5 rounded-md bg-accent-soft text-accent">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trạng thái công ty */}
        <Card className="border-border shadow-none rounded-lg bg-white relative overflow-hidden group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Tổng số công ty
              </p>
              <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">
                {companies.length}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-[10px] font-semibold">
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Active: {activeCount}
              </span>
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Trial: {trialCount}
              </span>
              {suspendedCount > 0 && (
                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  Khóa: {suspendedCount}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hết hạn dùng thử */}
        <Card className="border-border shadow-none rounded-lg bg-white relative overflow-hidden group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Sắp hết Trial (7 ngày)
              </p>
              <p className="text-3xl font-bold font-heading text-amber-600 mt-1 tracking-tight">
                {trialExpiringSoonList.length}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs text-ink-muted">
              <span>Cần chăm sóc, gia hạn</span>
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tổng Users hệ thống */}
        <Card className="border-border shadow-none rounded-lg bg-white relative overflow-hidden group">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Tổng nhân viên SaaS
              </p>
              <p className="text-3xl font-bold font-heading text-ink mt-1 tracking-tight">
                {companies.reduce((s, c) => s + (c.total_users || 0), 0)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs text-ink-muted">
              <span>Đại diện các công ty</span>
              <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ tăng trưởng */}
        <Card className="lg:col-span-8 border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-accent" />
              Tăng trưởng đăng ký công ty theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {mounted && registrationsChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--ink-muted))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--ink-muted))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Tổng số công ty"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-ink-muted text-sm">
                Đang chuẩn bị dữ liệu biểu đồ...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phân phối Plan dịch vụ */}
        <Card className="lg:col-span-4 border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
              <Package className="h-4.5 w-4.5 text-ink-muted" />
              Cơ cấu gói sử dụng
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              {(['starter', 'professional', 'enterprise'] as const).map((plan) => {
                const count = companies.filter((c) => c.plan === plan).length;
                const pct = companies.length ? Math.round((count / companies.length) * 100) : 0;
                const colors = plan === 'enterprise'
                  ? 'bg-[hsl(38,72%,46%)]'
                  : plan === 'professional'
                  ? 'bg-accent'
                  : 'bg-ink-muted/30';
                return (
                  <div key={plan} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${planStyle[plan]}`}>
                        {planLabel[plan]}
                      </span>
                      <span className="text-ink font-semibold">
                        {count} công ty <span className="text-ink-muted font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-bg-subtle rounded-full overflow-hidden border border-border">
                      <div className={`h-full rounded-full transition-all ${colors}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attention & Alerts Box */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
            Tài khoản cần chú ý &amp; xử lý gấp
          </CardTitle>
          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs rounded-full font-bold">
            {attentionList.length} cảnh báo
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {attentionList.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              Tuyệt vời! Không có tài khoản nào cần xử lý khẩn cấp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg-subtle border-b border-border text-ink-muted text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Công ty</th>
                    <th className="px-5 py-3">Chi tiết vấn đề</th>
                    <th className="px-5 py-3">Mức độ</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Liên hệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attentionList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-ink">{item.name}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{item.reason}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.severity === 'danger'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <AlertTriangle className="h-3 w-3" />
                          {item.severity === 'danger' ? 'Nghiêm trọng' : 'Cần lưu ý'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[item.status] ?? 'bg-bg-subtle'}`}>
                          {statusLabel[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-ink-muted">
                        {item.owner_email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
