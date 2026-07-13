'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, Users, CreditCard, TrendingUp, Activity,
  Package, Loader2, MapPin, Mail,
} from 'lucide-react';
import { useCompanies } from '@/lib/hooks/useCompanies';
import Link from 'next/link';

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

/* ─── Plan bar color ─────────────────────────────────────────────── */
const planBarColor: Record<string, string> = {
  starter:      'bg-bg-subtle border border-border',
  professional: 'bg-accent',
  enterprise:   'bg-[hsl(38,72%,46%)]',
};

export default function SuperAdminDashboard() {
  const { companies, loading } = useCompanies();

  const kpis = [
    {
      label: 'Tổng công ty',
      value: companies.length,
      icon: Building2,
      iconBg: 'bg-accent-soft text-accent',
      href: '/super-admin/companies',
    },
    {
      label: 'Đang hoạt động',
      value: companies.filter((c) => c.status === 'active').length,
      icon: Activity,
      iconBg: 'bg-[hsl(142,60%,92%)] text-[hsl(142,52%,28%)]',
      href: '/super-admin/companies',
    },
    {
      label: 'Dùng thử (Trial)',
      value: companies.filter((c) => c.status === 'trial').length,
      icon: Package,
      iconBg: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)]',
      href: '/super-admin/subscriptions',
    },
    {
      label: 'Tổng người dùng',
      value: companies.reduce((s, c) => s + (c.total_users || 0), 0),
      icon: Users,
      iconBg: 'bg-[hsl(262,60%,92%)] text-[hsl(262,50%,32%)]',
      href: '/super-admin/companies',
    },
    {
      label: 'Gói Professional',
      value: companies.filter((c) => c.plan === 'professional').length,
      icon: CreditCard,
      iconBg: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)]',
      href: '/super-admin/subscriptions',
    },
    {
      label: 'Gói Enterprise',
      value: companies.filter((c) => c.plan === 'enterprise').length,
      icon: TrendingUp,
      iconBg: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)]',
      href: '/super-admin/subscriptions',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
          Tổng quan hệ thống
        </h1>
        <p className="text-ink-muted mt-1 text-sm">Giám sát toàn bộ nền tảng RealHome</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="border-border shadow-none rounded-lg hover:bg-bg-subtle/50 transition-colors group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        {kpi.label}
                      </p>
                      <p className="text-3xl font-bold font-heading text-ink mt-1.5 tracking-tight tabular-nums">
                        {kpi.value}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${kpi.iconBg} flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold font-heading text-ink">
                Công ty gần đây
              </CardTitle>
              <Link
                href="/super-admin/companies"
                className="text-xs text-accent hover:underline font-medium"
              >
                Xem tất cả
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="divide-y divide-border">
              {companies.slice(0, 5).map((company) => (
                <div key={company.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{company.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      {company.owner_email}
                      <span className="text-border mx-1">·</span>
                      <Users className="h-3 w-3 flex-shrink-0" />
                      {company.total_users} users
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 pl-3 flex-wrap justify-end">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${planStyle[company.plan] ?? planStyle.starter}`}>
                      {planLabel[company.plan] ?? company.plan}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[company.status] ?? statusStyle.trial}`}>
                      {statusLabel[company.status] ?? company.status}
                    </span>
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-ink-muted text-sm text-center py-6">Chưa có công ty nào</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="border-border shadow-none rounded-lg bg-white">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold font-heading text-ink">
              Phân phối gói dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <div className="space-y-5">
              {(['starter', 'professional', 'enterprise'] as const).map((plan) => {
                const count = companies.filter((c) => c.plan === plan).length;
                const pct = companies.length ? Math.round((count / companies.length) * 100) : 0;
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${planStyle[plan]}`}>
                        {planLabel[plan]}
                      </span>
                      <span className="text-ink font-semibold tabular-nums">
                        {count} công ty
                        <span className="text-ink-muted font-normal ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          plan === 'enterprise'
                            ? 'bg-[hsl(38,72%,46%)]'
                            : plan === 'professional'
                            ? 'bg-accent'
                            : 'bg-ink-muted/30'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
