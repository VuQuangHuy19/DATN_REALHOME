'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, TrendingUp, Activity, Package, Loader2 } from 'lucide-react';
import { useCompanies } from '@/lib/hooks/useCompanies';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { companies, loading } = useCompanies();

  const stats = [
    {
      title: 'Tổng công ty',
      value: companies.length,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600',
      change: 'Cập nhật từ DB',
      href: '/super-admin/companies',
    },
    {
      title: 'Đang hoạt động',
      value: companies.filter((c) => c.status === 'active').length,
      icon: Activity,
      color: 'bg-green-50 text-green-600',
      change: '',
      href: '/super-admin/companies',
    },
    {
      title: 'Dùng thử',
      value: companies.filter((c) => c.status === 'trial').length,
      icon: Package,
      color: 'bg-amber-50 text-amber-600',
      change: '',
      href: '/super-admin/subscriptions',
    },
    {
      title: 'Tổng người dùng',
      value: companies.reduce((s, c) => s + (c.total_users || 0), 0),
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      change: '',
      href: '/super-admin/companies',
    },
    {
      title: 'Gói Professional',
      value: companies.filter((c) => c.plan === 'professional').length,
      icon: CreditCard,
      color: 'bg-teal-50 text-teal-600',
      change: '',
      href: '/super-admin/subscriptions',
    },
    {
      title: 'Gói Enterprise',
      value: companies.filter((c) => c.plan === 'enterprise').length,
      icon: TrendingUp,
      color: 'bg-slate-50 text-slate-600',
      change: '',
      href: '/super-admin/subscriptions',
    },
  ];

  const planColors: Record<string, string> = {
    starter: 'bg-slate-100 text-slate-700',
    professional: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-amber-100 text-amber-700',
  };

  const planLabels: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    active: 'Hoạt động',
    trial: 'Dùng thử',
    suspended: 'Tạm khóa',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
        <p className="text-slate-500">Giám sát toàn bộ nền tảng RealHome</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{stat.title}</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  {stat.change && (
                    <p className="text-xs text-slate-400 mt-2">{stat.change}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Công ty gần đây</CardTitle>
              <Link href="/super-admin/companies" className="text-xs text-blue-600 hover:underline">Xem tất cả</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companies.slice(0, 5).map((company) => (
                <div key={company.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{company.name}</p>
                    <p className="text-xs text-slate-400">{company.owner_email} · {company.total_users} users</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColors[company.plan]}`}>
                      {planLabels[company.plan]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[company.status]}`}>
                      {statusLabels[company.status]}
                    </span>
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Chưa có công ty nào</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân phối gói dịch vụ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['starter', 'professional', 'enterprise'] as const).map((plan) => {
                const count = companies.filter((c) => c.plan === plan).length;
                const pct = companies.length ? (count / companies.length) * 100 : 0;
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[plan]}`}>
                        {planLabels[plan]}
                      </span>
                      <span className="text-slate-600 font-medium">{count} công ty</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${plan === 'enterprise' ? 'bg-amber-400' : plan === 'professional' ? 'bg-blue-500' : 'bg-slate-400'}`}
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
