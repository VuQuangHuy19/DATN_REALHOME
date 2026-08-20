'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import {
  FileSignature,
  Heart,
  XCircle,
  AlertOctagon,
  Zap,
  MessageSquare,
  MessageCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';

interface ShowingFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onSuccess?: () => void;
  onOpenChainShowing?: () => void;
}

const REJECTION_REASONS = [
  { id: 'price_too_high', label: '💰 Giá cao hơn ngân sách' },
  { id: 'room_too_small', label: '📐 Phòng chật / Không vừa đồ' },
  { id: 'bad_location', label: '📍 Vị trí xa / Ngõ hẹp' },
  { id: 'images_mismatch', label: '📸 Ảnh khác thực tế' },
  { id: 'rented_elsewhere', label: '🏠 Đã thuê phòng khác' },
  { id: 'other', label: '❓ Lý do khác' },
];

export function ShowingFeedbackModal({
  open,
  onOpenChange,
  appointment,
  onSuccess,
  onOpenChainShowing,
}: ShowingFeedbackModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';

  const [selectedResult, setSelectedResult] = useState<'deposit_pending' | 'interested' | 'rejected' | 'no_show' | null>(
    appointment?.result_status || null
  );
  const [rejectionReason, setRejectionReason] = useState<string>(appointment?.rejection_reason || '');
  const [feedbackNotes, setFeedbackNotes] = useState<string>(appointment?.feedback_notes || '');
  const [nextFollowupAt, setNextFollowupAt] = useState<string>(
    appointment?.next_followup_at ? new Date(appointment.next_followup_at).toISOString().split('T')[0] : ''
  );
  const [submitting, setSubmitting] = useState(false);

  const landlordPhone = appointment?.company_phone || appointment?.landlord_phone || appointment?.landlord_code || '';

  // Handle Submit
  const handleSubmit = async () => {
    if (!selectedResult) {
      toast.error('Vui lòng chọn 1 kết quả sau khi dẫn khách!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          resultStatus: selectedResult,
          rejectionReason: selectedResult === 'rejected' ? rejectionReason : null,
          feedbackNotes,
          nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi gửi báo cáo kết quả.');
      }

      toast.success(data.message || 'Đã lưu báo cáo kết quả!');
      onOpenChange(false);

      if (onSuccess) onSuccess();

      // If deposit pending, redirect immediately to contract creation
      if (selectedResult === 'deposit_pending' && data.depositUrl) {
        router.push(data.depositUrl);
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi báo cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Build Zalo Deep Link
  const handleOpenZalo = () => {
    if (!landlordPhone) {
      toast.error('Không tìm thấy SĐT Chủ nhà/Tòa nhà.');
      return;
    }
    const cleanPhone = landlordPhone.replace(/\D/g, '');
    const text = `Em Sale bên BDS báo thông tin khách ${appointment?.customer_name || ''} đã xem xong phòng ${appointment?.room_title || ''}. Em xin phép phản hồi kết quả sau ạ!`;
    navigator.clipboard.writeText(text);
    toast.success('Đã copy tin nhắn mẫu! Đang mở Zalo...');
    window.open(`https://zalo.me/${cleanPhone}`, '_blank');
  };

  // Build SMS Deep Link
  const handleOpenSMS = () => {
    if (!landlordPhone) {
      toast.error('Không tìm thấy SĐT Chủ nhà.');
      return;
    }
    const cleanPhone = landlordPhone.replace(/\D/g, '');
    const text = `Chủ nhà ơi, em Sale dẫn khách ${appointment?.customer_name || ''} xem phòng ${appointment?.room_title || ''} xong rồi ạ.`;
    window.open(`sms:${cleanPhone}?body=${encodeURIComponent(text)}`, '_self');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Báo Cáo Kết Quả Sau Dẫn Khách
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Khách: <strong className="text-slate-800">{appointment?.customer_name}</strong> · Phòng:{' '}
            <strong className="text-indigo-600">{appointment?.room_title || 'Căn hộ'}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs">
          {/* OPTION CARDS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">1. Chọn Kết Quả Cuộc Hẹn *</Label>

            <div className="grid grid-cols-2 gap-2">
              {/* Card 1: Deposit Pending */}
              <button
                type="button"
                onClick={() => setSelectedResult('deposit_pending')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedResult === 'deposit_pending'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileSignature className="h-5 w-5 text-emerald-600" />
                  {selectedResult === 'deposit_pending' && (
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Đã chọn</Badge>
                  )}
                </div>
                <div className="mt-2 font-bold text-xs">🎉 CHỐT ĐẶT CỌC</div>
                <div className="text-[10px] text-emerald-700 opacity-90 mt-0.5">Tự động tạo HĐ cọc 1-Tap</div>
              </button>

              {/* Card 2: Interested */}
              <button
                type="button"
                onClick={() => setSelectedResult('interested')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedResult === 'interested'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-sm ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-amber-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Heart className="h-5 w-5 text-amber-600 fill-amber-500/20" />
                  {selectedResult === 'interested' && (
                    <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0">Đã chọn</Badge>
                  )}
                </div>
                <div className="mt-2 font-bold text-xs">🌟 KHÁCH THÍCH</div>
                <div className="text-[10px] text-amber-700 opacity-90 mt-0.5">Suy nghĩ / Hẹn chăm sóc lại</div>
              </button>

              {/* Card 3: Rejected */}
              <button
                type="button"
                onClick={() => setSelectedResult('rejected')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedResult === 'rejected'
                    ? 'border-rose-500 bg-rose-50 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-rose-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <XCircle className="h-5 w-5 text-rose-600" />
                  {selectedResult === 'rejected' && (
                    <Badge className="bg-rose-600 text-white text-[9px] px-1.5 py-0">Đã chọn</Badge>
                  )}
                </div>
                <div className="mt-2 font-bold text-xs">❌ KHÁCH KHÔNG ƯNG</div>
                <div className="text-[10px] text-rose-700 opacity-90 mt-0.5">Chọn lý do & Dẫn căn khác</div>
              </button>

              {/* Card 4: No Show */}
              <button
                type="button"
                onClick={() => setSelectedResult('no_show')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedResult === 'no_show'
                    ? 'border-slate-500 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <AlertOctagon className="h-5 w-5 text-slate-600" />
                  {selectedResult === 'no_show' && (
                    <Badge className="bg-slate-700 text-white text-[9px] px-1.5 py-0">Đã chọn</Badge>
                  )}
                </div>
                <div className="mt-2 font-bold text-xs">🚫 BÙNG KÈO</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Khách không tới xem</div>
              </button>
            </div>
          </div>

          {/* REJECTION REASONS TAGS (IF REJECTED) */}
          {selectedResult === 'rejected' && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 space-y-2">
              <Label className="text-xs font-bold text-rose-900">2. Lý do khách không ưng phòng này:</Label>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRejectionReason(r.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      rejectionReason === r.id
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* CHAIN SHOWING TRIGGER */}
              {onOpenChainShowing && (
                <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                  <span className="text-[11px] text-rose-800">Muốn dẫn khách sang căn khác ngay?</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenChainShowing();
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-7 text-[11px] gap-1 rounded-lg"
                  >
                    <Zap className="h-3 w-3 fill-white" /> Dẫn căn khác 1-Tap
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* FOLLOW-UP DATEPICKER (IF INTERESTED) */}
          {selectedResult === 'interested' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-1.5">
              <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Hẹn ngày nhắc lịch chăm sóc lại:
              </Label>
              <Input
                type="date"
                value={nextFollowupAt}
                onChange={(e) => setNextFollowupAt(e.target.value)}
                className="bg-white border-amber-300 text-xs h-8"
              />
            </div>
          )}

          {/* FEEDBACK NOTES */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">3. Ghi chú phản hồi chi tiết của khách</Label>
            <Textarea
              placeholder="VD: Khách ưng ban công nhưng muốn đàm phán giảm 200k tiền phòng..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              className="text-xs border-slate-200 min-h-[70px]"
            />
          </div>

          {/* FALLBACK MANUAL ZALO / SMS DEEP LINKS */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
              <span>Gửi thông báo trực tiếp cho Chủ nhà:</span>
              <span className="text-[10px] text-slate-400 font-normal">Không tốn phí SMS API</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenZalo}
                className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold h-8 text-[11px] gap-1.5 rounded-lg"
              >
                <MessageCircle className="h-3.5 w-3.5 text-blue-600 fill-blue-100" />
                Nhắn Zalo Chủ nhà
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenSMS}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold h-8 text-[11px] gap-1.5 rounded-lg"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                Gửi SMS Thủ công
              </Button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-slate-600 text-xs">
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedResult}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-4 rounded-xl gap-1.5 shadow-sm"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Gửi Báo Cáo & Cập Nhật CRM
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
