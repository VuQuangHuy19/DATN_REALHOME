'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Phone, MapPin, User, Users, ArrowRight, ArrowLeft, CheckCircle2,
  Sparkles, Shield, Zap, Clock, Loader2, ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

const PLAN_METADATA: Record<string, { icon: any; color: string }> = {
  starter: { icon: Zap, color: 'from-sky-400 to-blue-500' },
  professional: { icon: Shield, color: 'from-indigo-500 to-violet-600' },
  enterprise: { icon: Sparkles, color: 'from-amber-500 to-orange-600' },
};

export default function SetupCompanyPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [selectedSeats, setSelectedSeats] = useState<number | ''>(20);

  const [plansList, setPlansList] = useState<any[]>([
    {
      id: 'starter',
      name: 'Starter',
      price: 500000,
      seats: 5,
      extra_seat_price: 50000,
      description: 'Phù hợp cho công ty nhỏ mới gia nhập thị trường.',
      popular: false,
      features: ['1 tòa nhà', 'Tối đa 5 tài khoản nhân viên (Seats)', 'Quản lý phòng & hợp đồng', 'Hóa đơn tự động'],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 2000000,
      seats: 20,
      extra_seat_price: 100000,
      description: 'Giải pháp tối ưu cho doanh nghiệp BĐS chuyên nghiệp.',
      popular: true,
      features: ['Không giới hạn tòa nhà', 'Bao gồm 20 tài khoản nhân viên (Seats)', 'CRM Lead & Lịch hẹn', 'AI Assistant (Gemini)', 'Tách doanh thu Chủ nhà', 'Xuất PDF & báo cáo'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 5000000,
      seats: 999,
      extra_seat_price: 0,
      description: 'Đầy đủ tính năng cao cấp cho tập đoàn & chuỗi CHDV lớn.',
      popular: false,
      features: ['Tất cả tính năng Professional', 'Không giới hạn tài khoản nhân viên', 'Multi-company & multi-domain', 'SLA 99.9% & hỗ trợ ưu tiên', 'Tùy chỉnh theme & logo'],
    },
  ]);

  // Đồng bộ danh sách gói cước từ DB/API /api/plans
  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (data.plans && data.plans.length > 0) {
          setPlansList(data.plans);
        }
      })
      .catch(err => console.error('Lỗi tải danh sách gói SaaS:', err));
  }, []);

  const [form, setForm] = useState({
    owner_name: profile?.full_name || user?.user_metadata?.full_name || '',
    company_name: '',
    company_phone: profile?.phone || user?.phone || '',
    company_address: '',
  });

  // Tự động điền dữ liệu người dùng khi thông tin session profile sẵn sàng từ DB
  useEffect(() => {
    if (profile || user) {
      const ownerName = profile?.full_name || user?.user_metadata?.full_name || '';
      const phoneNum = profile?.phone || user?.phone || user?.user_metadata?.phone || '';

      setForm(prev => ({
        ...prev,
        owner_name: prev.owner_name || ownerName,
        company_phone: prev.company_phone || phoneNum,
      }));
    }
  }, [profile, user]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Tính cước phí động dựa vào Gói được chọn + Số Seats mua thêm
  const selectedPlanObj = plansList.find(p => p.id === selectedPlan) || plansList[1] || plansList[0];
  const basePrice = Number(selectedPlanObj?.price) || 0;
  const baseSeats = Number(selectedPlanObj?.seats) || 5;
  const extraSeatPrice = Number(selectedPlanObj?.extra_seat_price) || 0;
  const numericSeats = selectedSeats === '' ? baseSeats : Number(selectedSeats);
  const extraSeatsCount = Math.max(0, numericSeats - baseSeats);
  const extraPriceTotal = extraSeatsCount * extraSeatPrice;
  const monthlyPriceTotal = basePrice + extraPriceTotal;

  const handleSubmit = async () => {
    if (!form.owner_name.trim() || !form.company_name.trim() || !form.company_phone.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('bds_auth_token');
      const res = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không thể tạo công ty');
      }

      toast.success(`🎉 ${data.message}`);

      // Chuyển sang trang thanh toán kèm gói và số seats đã đăng ký
      if (selectedPlan === 'starter' && monthlyPriceTotal === 0) {
        router.push('/admin');
      } else {
        router.push(`/admin/system/billing?plan=${selectedPlan}&seats=${numericSeats}&from=setup`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Top Left Floating Back Button */}
      <Link
        href="/customer/properties"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 inline-flex items-center justify-center bg-slate-900/90 hover:bg-black text-white border border-white/30 hover:border-white/60 rounded-full px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-extrabold shadow-xl backdrop-blur-md transition-all hover:scale-105 group"
      >
        <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 mr-1.5 sm:mr-2 text-amber-400 group-hover:-translate-x-1 transition-transform" />
        <span className="text-white">Quay lại</span>
      </Link>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/customer" className="inline-block mb-4">
            <Logo className="text-4xl text-white justify-center" />
          </Link>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium mb-4">
            <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-400 font-bold' : 'text-emerald-400'}`}>
              {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border-2 border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-400">1</span>}
              <span>Thông tin công ty</span>
            </div>
            <ChevronRight className="h-4 w-4" />
            <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${step === 2 ? 'border-indigo-400 text-indigo-400' : 'border-slate-600 text-slate-600'}`}>2</span>
              <span>Chọn gói dịch vụ</span>
            </div>
          </div>
        </div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Thiết lập Công ty của bạn</h1>
              <p className="text-slate-400 text-sm">Điền thông tin để khởi tạo không gian quản lý BĐS riêng của doanh nghiệp.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-200">
                  Tên đại diện / Chủ doanh nghiệp <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 z-10" />
                  <Input
                    placeholder="Nguyễn Văn A"
                    value={form.owner_name}
                    onChange={e => handleChange('owner_name', e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl h-12 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-200">
                  Tên Công ty / Doanh nghiệp <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 z-10" />
                  <Input
                    placeholder="Công ty TNHH Quản lý BĐS ABC"
                    value={form.company_name}
                    onChange={e => handleChange('company_name', e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl h-12 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-200">
                  Số điện thoại công ty <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 z-10" />
                  <Input
                    placeholder="0987 654 321"
                    value={form.company_phone}
                    onChange={e => handleChange('company_phone', e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl h-12 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-200">Địa chỉ công ty</Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 z-10" />
                  <Input
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                    value={form.company_address}
                    onChange={e => handleChange('company_address', e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl h-12 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => router.push('/customer/properties')}
                className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl h-12 px-6 font-semibold"
              >
                ← Quay lại
              </Button>

              <Button
                onClick={() => {
                  if (!form.owner_name.trim() || !form.company_name.trim() || !form.company_phone.trim()) {
                    toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
                    return;
                  }
                  setStep(2);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/40"
              >
                Tiếp theo: Chọn gói dịch vụ
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Plan */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Chọn gói dịch vụ</h1>
              <p className="text-slate-400 text-sm">Bạn có thể nâng cấp hoặc thay đổi gói bất kỳ lúc nào sau khi khởi tạo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plansList.map((plan: any) => {
                const meta = PLAN_METADATA[plan.id] || { icon: Shield, color: 'from-indigo-500 to-violet-600' };
                const Icon = meta.icon;
                const isSelected = selectedPlan === plan.id;
                const formattedPrice = plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString('vi-VN')}đ/tháng`;
                const seatsText = plan.seats >= 999 ? 'Không giới hạn seats' : `Bao gồm ${plan.seats} seats`;
                const extraSeatsText = plan.extra_seat_price > 0 ? ` (Mua thêm: ${plan.extra_seat_price.toLocaleString('vi-VN')}đ/seat/tháng)` : '';

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      if (selectedSeats < (plan.seats || 1)) {
                        setSelectedSeats(plan.seats || 1);
                      }
                    }}
                    className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-900/30 scale-[1.02]'
                        : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        ⭐ Phổ biến nhất
                      </div>
                    )}

                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center mb-4 shadow-md`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    <h3 className="text-lg font-black text-white mb-1">{plan.name}</h3>
                    <p className="text-indigo-300 font-bold text-sm mb-1">{formattedPrice}</p>
                    <p className="text-emerald-400 font-semibold text-xs leading-relaxed mb-3">{seatsText}{extraSeatsText}</p>
                    <p className="text-slate-400 text-xs leading-relaxed mb-5">{plan.description}</p>

                    <ul className="space-y-2">
                      {(plan.features || []).map((f: string) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isSelected && (
                      <div className="mt-5 flex items-center gap-1.5 text-indigo-300 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                        Đã chọn
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Seats Input Box */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    Số lượng tài khoản nhân viên (Seats) đăng ký
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Gói <strong>{selectedPlanObj.name}</strong> bao gồm sẵn <strong>{baseSeats >= 999 ? 'Không giới hạn' : `${baseSeats} seats`}</strong>. Bạn có thể nhập thêm số seats mua kèm ngay từ đầu.
                  </p>
                </div>

                {baseSeats < 999 && (
                  <div className="flex items-center gap-3 shrink-0">
                    <Input
                      type="number"
                      value={selectedSeats}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSelectedSeats('');
                        } else {
                          setSelectedSeats(parseInt(val, 10) || 0);
                        }
                      }}
                      onBlur={() => {
                        if (selectedSeats === '' || Number(selectedSeats) < baseSeats) {
                          setSelectedSeats(baseSeats);
                        }
                      }}
                      className="w-28 bg-white/10 border-white/20 text-white font-bold rounded-xl h-11 text-center font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">tài khoản</span>
                  </div>
                )}
              </div>

              {extraSeatsCount > 0 && (
                <div className="pt-2.5 border-t border-white/10 flex justify-between items-center text-xs">
                  <span className="text-indigo-300 font-semibold">
                    Mua thêm {extraSeatsCount} seats lẻ ({extraSeatsCount} × {extraSeatPrice.toLocaleString('vi-VN')}đ/tháng):
                  </span>
                  <span className="text-amber-400 font-bold font-mono whitespace-nowrap">+{extraPriceTotal.toLocaleString('vi-VN')}đ / tháng</span>
                </div>
              )}
            </div>

            {selectedPlan !== 'starter' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200 text-sm">
                  Bạn sẽ được khởi tạo công ty với <strong>14 ngày dùng thử miễn phí</strong> và chuyển sang trang thanh toán để kích hoạt gói <strong>{selectedPlanObj.name} ({numericSeats} seats - {monthlyPriceTotal.toLocaleString('vi-VN')}đ/tháng)</strong> ngay sau khi hoàn tất.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl h-12 px-6"
              >
                ← Quay lại
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-black px-8 h-12 rounded-xl flex items-center gap-2 shadow-xl shadow-indigo-900/40"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang khởi tạo...</>
                ) : (
                  <>{selectedPlan === 'starter' ? 'Khởi tạo miễn phí' : 'Tiến hành khởi tạo & Thanh toán'} <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
