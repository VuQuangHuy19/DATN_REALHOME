'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, MessageSquare, Building2, Banknote, UserCircle, AlertCircle } from 'lucide-react';
import { createConsultation } from '@/lib/supabase/repositories/consultations';
import { createLead, createLeadActivity } from '@/lib/supabase/repositories/leads';
import { useCustomerCompany } from '@/components/customer/CustomerCompanyProvider';

const sources = [
  { value: 'website', label: 'Website' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'referral', label: 'Người giới thiệu' },
  { value: 'other', label: 'Khác' },
];

const budgetRanges = [
  { value: '5000000', label: 'Dưới 5 triệu/tháng' },
  { value: '10000000', label: '5 – 10 triệu/tháng' },
  { value: '20000000', label: '10 – 20 triệu/tháng' },
  { value: '50000000', label: '20 – 50 triệu/tháng' },
  { value: '100000000', label: 'Trên 50 triệu/tháng' },
];

const roomTypeOptions = [
  'Studio', '1 Phòng ngủ', '2 Phòng ngủ', '3 Phòng ngủ', 'Penthouse', 'Duplex',
];

const areaOptions = [
  'Quận 1', 'Quận 2 (Thảo Điền)', 'Quận 7 (Phú Mỹ Hưng)', 'Quận Bình Thạnh', 'Quận Tân Bình', 'Quận 4',
];

type LeadSource = 'website' | 'facebook' | 'tiktok' | 'zalo' | 'chotot' | 'referral' | 'cold_call' | 'walk_in' | 'other';

const sourceToLeadSource: Record<string, LeadSource> = {
  website: 'website',
  facebook: 'facebook',
  zalo: 'zalo',
  tiktok: 'tiktok',
  referral: 'referral',
  other: 'other',
};

export default function RequestConsultationPage() {
  const { company } = useCustomerCompany();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const full_name = fd.get('fullName') as string;
    const phone = fd.get('phone') as string;
    const email = (fd.get('email') as string) || undefined;
    const preferredArea = (fd.get('preferredArea') as string) || null;
    const preferredRoomType = (fd.get('preferredRoomType') as string) || null;
    const budgetValue = (fd.get('budget') as string) || '0';
    const sourceValue = (fd.get('source') as string) || 'website';
    const notes = (fd.get('notes') as string) || null;

    const interest = [preferredRoomType, preferredArea].filter(Boolean).join(', ') || null;
    const consultationMessage = [
      interest && `Quan tâm: ${interest}`,
      budgetValue !== '0' && `Ngân sách: ${Number(budgetValue).toLocaleString('vi-VN')}đ/tháng`,
      notes,
    ].filter(Boolean).join('. ') || 'Yêu cầu tư vấn bất động sản';

    if (!company?.id) {
      setError('Không xác định được công ty. Vui lòng tải lại trang.');
      setLoading(false);
      return;
    }

    try {
      await createConsultation({
        company_id: company.id,
        full_name,
        phone,
        email,
        message: consultationMessage,
        source: 'website',
      });

      const leadSource: LeadSource = sourceToLeadSource[sourceValue] ?? 'website';
      const lead = await createLead({
        company_id: company.id,
        full_name,
        phone,
        email: email ?? null,
        source: leadSource,
        status: 'new',
        interest,
        budget: Number(budgetValue) || 0,
        preferred_area: preferredArea,
        preferred_room_type: preferredRoomType,
        interested_area: preferredArea,
        assigned_to: null,
        notes: consultationMessage,
        last_contacted_at: null,
      });

      await createLeadActivity({
        lead_id: lead.id,
        company_id: company.id,
        type: 'note',
        content: 'Lead tạo từ form yêu cầu tư vấn website',
        old_status: null,
        new_status: null,
        created_by: null,
        created_by_name: 'Website',
      });

      setSubmitted(true);
    } catch (err: any) {
      setError('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Yêu cầu đã được gửi!</h1>
          <p className="text-slate-500 text-lg mb-2">
            Chuyên viên tư vấn sẽ liên hệ bạn trong vòng <strong>1 giờ làm việc</strong>.
          </p>
          <p className="text-slate-400 text-sm mb-8">
            Trong giờ hành chính: Thứ 2 – Thứ 7, 8:00 – 18:00
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline" className="mr-3">
            Gửi yêu cầu mới
          </Button>
          <Button asChild>
            <a href="/customer/properties">Xem bất động sản</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-slate-700" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Yêu Cầu Tư Vấn</h1>
          <p className="text-slate-500">
            Điền thông tin để chuyên viên của chúng tôi tìm bất động sản phù hợp nhất cho bạn.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Thông tin cá nhân</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Họ và tên *</Label>
                    <Input id="fullName" name="fullName" placeholder="Nguyễn Văn A" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Số điện thoại *</Label>
                    <Input id="phone" name="phone" placeholder="0912 345 678" required className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="email@example.com" className="mt-1" />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Property Needs */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Nhu cầu bất động sản</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredArea">Khu vực mong muốn</Label>
                    <select id="preferredArea" name="preferredArea" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1">
                      <option value="">Tất cả khu vực</option>
                      {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="preferredRoomType">Loại phòng</Label>
                    <select id="preferredRoomType" name="preferredRoomType" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1">
                      <option value="">Tất cả loại</option>
                      {roomTypeOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Budget & Source */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Banknote className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Ngân sách & Nguồn</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Ngân sách</Label>
                    <select id="budget" name="budget" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1">
                      <option value="0">Chưa xác định</option>
                      {budgetRanges.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="source">Biết đến qua</Label>
                    <select id="source" name="source" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1">
                      {sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Ghi chú thêm</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Mô tả thêm nhu cầu hoặc yêu cầu đặc biệt của bạn..."
                  rows={4}
                  className="mt-1 resize-none"
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang gửi...
                  </span>
                ) : (
                  'Gửi yêu cầu tư vấn'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
