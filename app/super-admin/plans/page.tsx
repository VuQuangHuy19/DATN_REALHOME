'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Package } from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500000,
    seats: 5,
    description: 'Phù hợp cho công ty nhỏ bắt đầu tham gia thị trường',
    color: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
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
    price: 2000000,
    seats: 20,
    description: 'Cho công ty vừa với nhu cầu CRM nâng cao và phân tích',
    color: 'border-blue-200 ring-2 ring-blue-400',
    badge: 'bg-blue-100 text-blue-700',
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
    price: 5000000,
    seats: 999,
    description: 'Giải pháp toàn diện cho tập đoàn bất động sản lớn',
    color: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
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

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ/tháng';
}

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gói dịch vụ</h1>
        <p className="text-slate-500">Cấu hình và xem chi tiết các gói dịch vụ trên nền tảng</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`relative bg-white rounded-xl border-2 p-6 ${plan.color}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Phổ biến nhất
                </span>
              </div>
            )}

            <div className="flex items-start gap-3 mb-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${plan.badge}`}>
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${plan.badge}`}>
                  {plan.seats === 999 ? 'Unlimited seats' : `${plan.seats} seats`}
                </span>
              </div>
            </div>

            <p className="text-2xl font-bold text-slate-800 mb-1">{formatVND(plan.price)}</p>
            <p className="text-sm text-slate-500 mb-5">{plan.description}</p>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tính năng bao gồm</p>
              {plan.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {f}
                </div>
              ))}
              {plan.missing.map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm text-slate-300 line-through">
                  <Check className="h-4 w-4 text-slate-200 flex-shrink-0 mt-0.5" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">So sánh chi tiết tính năng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-slate-600 w-1/2">Tính năng</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Starter</th>
                  <th className="px-4 py-3 text-center font-medium text-blue-600">Professional</th>
                  <th className="px-4 py-3 text-center font-medium text-amber-600">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['Quản lý tòa nhà & phòng', true, true, true],
                  ['CRM Leads cơ bản', true, true, true],
                  ['Lead Timeline & Activities', false, true, true],
                  ['Phân công leads', false, true, true],
                  ['KPI & Leaderboard', false, true, true],
                  ['Thông báo real-time', false, true, true],
                  ['Nhật ký hoạt động', false, true, true],
                  ['Vai trò & Phân quyền', false, true, true],
                  ['API Access', false, false, true],
                  ['Multi-company', false, false, true],
                  ['Custom branding', false, false, true],
                  ['SLA 99.9%', false, false, true],
                ].map(([feature, starter, pro, enterprise]) => (
                  <tr key={feature as string} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{feature as string}</td>
                    {[starter, pro, enterprise].map((val, i) => (
                      <td key={i} className="px-4 py-2.5 text-center">
                        {val
                          ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                          : <span className="text-slate-200 text-lg">—</span>
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
