'use client';

import { useState, useEffect } from 'react';
import { Check, X, Package, Zap, Building2, Pencil, Plus, Save, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface PlanItem {
  id: string;
  name: string;
  price: number;
  seats: number;
  extra_seat_price?: number;
  description: string;
  iconBg: string;
  badgeStyle: string;
  popular: boolean;
  features: string[];
  missing: string[];
}

/* ─── Default Plan Data ──────────────────────────────────────────── */
const initialPlans: PlanItem[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500_000,
    seats: 5,
    extra_seat_price: 50_000,
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
    extra_seat_price: 100_000,
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
    extra_seat_price: 0,
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
  const [plans, setPlans] = useState<PlanItem[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formSeats, setFormSeats] = useState(5);
  const [formExtraSeatPrice, setFormExtraSeatPrice] = useState(100000);
  const [formDescription, setFormDescription] = useState('');
  const [formPopular, setFormPopular] = useState(false);
  const [formFeatures, setFormFeatures] = useState('');
  const [formMissing, setFormMissing] = useState('');

  // Load saved configuration from API and localStorage fallback
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/plans');
        if (res.ok) {
          const data = await res.json();
          if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
            setPlans(data.plans);
            localStorage.setItem('realhome_super_admin_plans', JSON.stringify(data.plans));
            return;
          }
        }
      } catch (e) {
        console.error('Không thể gọi API /api/plans, chuyển sang đọc localStorage:', e);
      }

      try {
        const saved = localStorage.getItem('realhome_super_admin_plans');
        if (saved) {
          setPlans(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Lỗi khi đọc cấu hình gói từ localStorage:', e);
      }
    }

    loadPlans();
  }, []);

  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormPrice(plan.price);
    setFormSeats(plan.seats);
    setFormExtraSeatPrice(plan.extra_seat_price || 0);
    setFormDescription(plan.description);
    setFormPopular(plan.popular);
    setFormFeatures(plan.features.join('\n'));
    setFormMissing(plan.missing.join('\n'));
    setIsDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormName('');
    setFormPrice(1000000);
    setFormSeats(10);
    setFormExtraSeatPrice(100000);
    setFormDescription('Mô tả gói dịch vụ mới');
    setFormPopular(false);
    setFormFeatures('Tối đa 10 người dùng\nCRM cơ bản\nBáo cáo tháng');
    setFormMissing('Multi-company\nAPI Access');
    setIsDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!formName.trim()) {
      toast.error('Vui lòng nhập tên gói dịch vụ');
      return;
    }

    const updatedFeatures = formFeatures
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedMissing = formMissing
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    let newPlansList: PlanItem[];

    if (editingPlan) {
      newPlansList = plans.map((p) => {
        if (p.id === editingPlan.id) {
          return {
            ...p,
            name: formName.trim(),
            price: Number(formPrice) || 0,
            seats: Number(formSeats) || 1,
            extra_seat_price: Number(formExtraSeatPrice) || 0,
            description: formDescription.trim(),
            popular: formPopular,
            features: updatedFeatures,
            missing: updatedMissing,
          };
        }
        return p;
      });
    } else {
      const newId = `plan_${Date.now()}`;
      const newPlanObj: PlanItem = {
        id: newId,
        name: formName.trim(),
        price: Number(formPrice) || 0,
        seats: Number(formSeats) || 1,
        extra_seat_price: Number(formExtraSeatPrice) || 0,
        description: formDescription.trim(),
        iconBg: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)]',
        badgeStyle: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]',
        popular: formPopular,
        features: updatedFeatures,
        missing: updatedMissing,
      };
      newPlansList = [...plans, newPlanObj];
    }

    setPlans(newPlansList);

    // Save to localStorage
    try {
      localStorage.setItem('realhome_super_admin_plans', JSON.stringify(newPlansList));
    } catch (e) {
      console.error(e);
    }

    // Save to API /api/plans
    try {
      await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: newPlansList }),
      });
    } catch (e) {
      console.error('Lỗi khi gửi API lưu cấu hình gói:', e);
    }

    if (editingPlan) {
      toast.success(`Đã cập nhật gói dịch vụ "${formName}" thành công!`);
    } else {
      toast.success(`Đã thêm gói dịch vụ mới "${formName}" thành công!`);
    }

    setIsDialogOpen(false);
  };

  const handleResetDefault = async () => {
    setPlans(initialPlans);
    try {
      localStorage.removeItem('realhome_super_admin_plans');
      await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: initialPlans }),
      });
    } catch (e) {
      console.error(e);
    }
    toast.info('Đã khôi phục về cấu hình gói mặc định');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">
            Gói dịch vụ
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            Cấu hình, thiết lập và quản lý quyền hạn/giá tiền các gói dịch vụ trên nền tảng RealHome
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefault}
            className="text-xs text-ink-muted hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Khôi phục mặc định
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="bg-accent hover:bg-accent/90 text-white font-medium text-sm shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Thêm gói dịch vụ
          </Button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => {
          const Icon = planIcons[idx % planIcons.length] || Package;
          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 shadow-none transition-all hover:shadow-md ${
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

              {/* Edit button */}
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(plan)}
                  className="h-8 px-2.5 text-xs text-accent hover:bg-accent/10 hover:text-accent font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Chỉnh sửa
                </Button>
              </div>

              {/* Icon + name */}
              <div className="flex items-start gap-3 mb-5 pr-16">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${plan.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-ink">{plan.name}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${plan.badgeStyle}`}>
                    {plan.seats >= 999 ? 'Unlimited seats' : `${plan.seats} seats`}
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
            So sánh chi tiết tính năng giữa các gói
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-ink-muted uppercase tracking-wider w-1/2">
                    Tính năng hệ thống
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-5 py-3.5 text-center text-[11px] font-bold text-ink uppercase tracking-wider">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {featureMatrix.map(([feature, starter, pro, enterprise], fIdx) => (
                  <tr key={feature} className="hover:bg-bg-subtle/50 transition-colors">
                    <td className="px-5 py-3 text-ink font-medium">{feature}</td>
                    {plans.map((p, pIdx) => {
                      // Logic linh hoạt check xem plan có chứa feature không
                      let isSupported = false;
                      if (pIdx === 0) isSupported = starter;
                      else if (pIdx === 1) isSupported = pro;
                      else isSupported = enterprise;

                      return (
                        <td key={p.id} className="px-5 py-3 text-center">
                          {isSupported ? (
                            <Check className="h-4 w-4 text-[hsl(142,52%,42%)] mx-auto" />
                          ) : (
                            <span className="text-border text-lg leading-none">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Add Plan Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-ink">
              {editingPlan ? `Cấu hình gói "${editingPlan.name}"` : 'Tạo gói dịch vụ mới'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="planName" className="text-xs font-semibold text-ink">Tên gói dịch vụ</Label>
                <Input
                  id="planName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Professional"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planSeats" className="text-xs font-semibold text-ink">Số lượng Seats (Tài khoản)</Label>
                <Input
                  id="planSeats"
                  type="number"
                  value={formSeats}
                  onChange={(e) => setFormSeats(Number(e.target.value))}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="planPrice" className="text-xs font-semibold text-ink">Giá gói (VNĐ / Tháng)</Label>
                <Input
                  id="planPrice"
                  type="text"
                  value={formPrice ? formPrice.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/\D/g, '');
                    setFormPrice(rawVal ? parseInt(rawVal, 10) : 0);
                  }}
                  placeholder="2.000.000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planExtraSeat" className="text-xs font-semibold text-ink">Phí mua thêm 1 Seat/Tháng (VNĐ)</Label>
                <Input
                  id="planExtraSeat"
                  type="text"
                  value={formExtraSeatPrice ? formExtraSeatPrice.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/\D/g, '');
                    setFormExtraSeatPrice(rawVal ? parseInt(rawVal, 10) : 0);
                  }}
                  placeholder="100.000"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={formPopular}
                  onChange={(e) => setFormPopular(e.target.checked)}
                  className="rounded border-gray-300 text-accent focus:ring-accent h-4 w-4"
                />
                <span>Đánh dấu "Phổ biến nhất"</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planDesc" className="text-xs font-semibold text-ink">Mô tả gói</Label>
              <Input
                id="planDesc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ví dụ: Cho công ty vừa với nhu cầu CRM nâng cao..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planFeatures" className="text-xs font-semibold text-ink">
                Tính năng BAO GỒM (Mỗi dòng 1 tính năng)
              </Label>
              <Textarea
                id="planFeatures"
                rows={4}
                value={formFeatures}
                onChange={(e) => setFormFeatures(e.target.value)}
                placeholder="Tối đa 20 người dùng&#10;CRM đầy đủ&#10;KPI & Leaderboard"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planMissing" className="text-xs font-semibold text-ink">
                Tính năng KHÔNG BAO GỒM (Mỗi dòng 1 tính năng)
              </Label>
              <Textarea
                id="planMissing"
                rows={2}
                value={formMissing}
                onChange={(e) => setFormMissing(e.target.value)}
                placeholder="Multi-company&#10;API Access"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSavePlan}
              className="bg-accent hover:bg-accent/90 text-white font-medium"
            >
              <Save className="h-4 w-4 mr-1.5" /> Lưu cấu hình gói
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

