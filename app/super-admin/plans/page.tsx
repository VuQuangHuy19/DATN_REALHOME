'use client';

import { Check, X, Package, Zap, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* ─── Plan data ──────────────────────────────────────────────────── */
const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500_000,
    seats: 5,
    description: 'Phù hợp cho công ty nhỏ bắt đầu tham gia thị trường',
    iconBg: 'bg-bg-subtle text-ink-muted',
    badgeStyle: 'bg-bg-subtle text-ink border border-border',
    popular: false,
    features: [
      'Tối đa 5 người dùng',
      'Quản lý tối đa 50 phòng',
      'CRM cơ bản (Leads, Lịch hẹn)',
      'Báo cáo tháng',
      'Hỗ trợ email',
    ],
    missing: ['KPI & Leaderboard', 'Multi-company', 'API Access', 'SLA hỗ trợ'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 2_000_000,
    seats: 20,
    description: 'Cho công ty vừa với nhu cầu CRM nâng cao và phân tích',
    iconBg: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)]',
    badgeStyle: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]',
    popular: true,
    features: [
      'Tối đa 20 người dùng',
      'Không giới hạn phòng',
      'CRM đầy đủ + Lead Timeline',
      'KPI & Leaderboard nhân viên',
      'Nhật ký hoạt động',
      'Thông báo thời gian thực',
      'Hỗ trợ ưu tiên (chat)',
    ],
    missing: ['Multi-company', 'API Access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 5_000_000,
    seats: 999,
    description: 'Giải pháp toàn diện cho tập đoàn bất động sản lớn',
    iconBg: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)]',
    badgeStyle: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] border border-[hsl(38,72%,76%)]',
    popular: false,
    features: [
      'Không giới hạn người dùng',
      'Không giới hạn tất cả',
      'Toàn bộ tính năng Professional',
      'Multi-company management',
      'API Access & Webhooks',
      'SLA 99.9% uptime',
      'Account Manager riêng',
      'Custom branding',
    ],
    missing: [],
  },
];

/* ─── Feature comparison matrix ─────────────────────────────────── */
const featureMatrix: [string, boolean, boolean, boolean][] = [
  ['Quản lý tòa nhà & phòng',   true,  true,  true],
  ['CRM Leads cơ bản',          true,  true,  true],
  ['Lead Timeline & Activities', false, true,  true],
  ['Phân công leads',           false, true,  true],
  ['KPI & Leaderboard',         false, true,  true],
  ['Thông báo real-time',       false, true,  true],
  ['Nhật ký hoạt động',         false, true,  true],
  ['Vai trò & Phân quyền',      false, true,  true],
  ['API Access',                false, false, true],
  ['Multi-company',             false, false, true],
  ['Custom branding',           false, false, true],
  ['SLA 99.9%',                 false, false, true],
];

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ/tháng';
}

const planIcons = [Package, Zap, Building2];

export default function PlansPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">Gói dịch vụ</h1>
        <p className="text-ink-muted mt-1 text-sm">Cấu hình và xem chi tiết các gói dịch vụ trên nền tảng RealHome</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => {
          const Icon = planIcons[idx];
          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 shadow-none transition-shadow hover:shadow-md ${
                plan.popular
                  ? 'border-accent ring-2 ring-accent/20'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                    Phổ biến nhất
                  </span>
                </div>
              )}

              {/* Icon + name */}
              <div className="flex items-start gap-3 mb-5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${plan.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-ink">{plan.name}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${plan.badgeStyle}`}>
                    {plan.seats === 999 ? 'Unlimited seats' : `${plan.seats} seats`}
                  </span>
                </div>
              </div>

              {/* Price */}
              <p className="text-2xl font-bold font-heading text-ink mb-1 tabular-nums">
                {formatVND(plan.price)}
              </p>
              <p className="text-sm text-ink-muted mb-6">{plan.description}</p>

              {/* Divider */}
              <div className="border-t border-border mb-4" />

              {/* Features */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">Tính năng bao gồm</p>
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-ink">
                    <Check className="h-4 w-4 text-[hsl(142,52%,42%)] flex-shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-ink-muted/50">
                    <X className="h-4 w-4 text-border flex-shrink-0 mt-0.5" />
                    <span className="line-through">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card className="border-border shadow-none rounded-xl bg-white">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold font-heading text-ink">
            So sánh chi tiết tính năng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider w-1/2">Tính năng</th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-bold text-ink-muted uppercase tracking-wider">Starter</th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-bold text-accent uppercase tracking-wider">Professional</th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-bold text-[hsl(38,72%,40%)] uppercase tracking-wider">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {featureMatrix.map(([feature, starter, pro, enterprise]) => (
                  <tr key={feature} className="hover:bg-bg-subtle/50 transition-colors">
                    <td className="px-5 py-3 text-ink font-medium">{feature}</td>
                    {[starter, pro, enterprise].map((val, i) => (
                      <td key={i} className="px-5 py-3 text-center">
                        {val
                          ? <Check className="h-4 w-4 text-[hsl(142,52%,42%)] mx-auto" />
                          : <span className="text-border text-lg leading-none">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
